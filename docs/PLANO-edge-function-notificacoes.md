# Plano — Edge Function `SendBusinessNotification`

Envio de push notifications **iniciado pelo business** (dashboard web) para seus influencers.
Diferente das funções automáticas do sistema (`CampaignNotification`, `InviteNotification`, `OrderNotification`), que são disparadas por webhooks/triggers do banco com `verify_jwt: false`. Esta é chamada por um usuário autenticado, então **exige JWT**.

---

## 1. Objetivo e diferenças

| | Funções automáticas | `SendBusinessNotification` (nova) |
|---|---|---|
| Disparo | Trigger/webhook do banco | Usuário business no dashboard |
| Auth | `verify_jwt: false` | **`verify_jwt: true`** + checagem de role |
| Entrada | `payload.record` (linha do banco) | Body com alvo + conteúdo do push |
| Destinatários | 1 influencer (o do record) | Todos / grupo / lista específica |
| Volume | 1 token | Lote (dezenas/centenas) → chunk de 100 |
| Cota | — | Valida `plans.max_push` do business |
| Histórico | — | Grava 1 linha em `business_notifications` |

O padrão de envio (endpoint `https://exp.host/--/api/v2/push/send`, client `@supabase/supabase-js@2`, `Deno.serve`) é o mesmo das funções existentes.

---

## 2. Mudanças no banco (migrations)

### 2.1 Grupos de influencers

Hoje os grupos são **mockados no front**. Para suportar alvo por grupo, criar:

```sql
-- Grupo pertence a um business
create table public.influencer_groups (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Membros do grupo (N:N)
create table public.influencer_group_members (
  group_id      uuid not null references public.influencer_groups(id) on delete cascade,
  influencer_id uuid not null references public.influencers(id) on delete cascade,
  primary key (group_id, influencer_id)
);

create index on public.influencer_groups (business_id);
create index on public.influencer_group_members (influencer_id);
```

**RLS** (o business só enxerga/gerencia os próprios grupos):

```sql
alter table public.influencer_groups enable row level security;
alter table public.influencer_group_members enable row level security;

create policy "own groups" on public.influencer_groups
  for all using (business_id = auth.uid()) with check (business_id = auth.uid());

create policy "own group members" on public.influencer_group_members
  for all using (
    exists (select 1 from public.influencer_groups g
            where g.id = group_id and g.business_id = auth.uid())
  ) with check (
    exists (select 1 from public.influencer_groups g
            where g.id = group_id and g.business_id = auth.uid())
  );
```

> CRUD de grupos pode ficar em **server actions** (`createGroup`, `deleteGroup`, `addMember`…) usando o cliente com cookies — não precisa entrar na edge function. A edge function só **lê** os membros ao resolver o alvo.

### 2.2 Histórico de envios

Formato espelha o `NotifHistoryRow` do front (uma linha por envio, com contadores agregados):

```sql
create table public.business_notifications (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  sent_at        timestamptz not null default now(),
  message        jsonb not null,          -- ExpoPushRecord completo (title, body, subtitle, data, ...)
  audience_label text not null,           -- "Todos" | "Grupo: VIP" | "3 influencers"
  recipients     int  not null default 0, -- tokens elegíveis
  delivered      int  not null default 0, -- tickets "ok"
  failed         int  not null default 0, -- tickets "error"
  status         text not null            -- sent | partial | failed
);

create index on public.business_notifications (business_id, sent_at desc);

alter table public.business_notifications enable row level security;
create policy "own notifications read" on public.business_notifications
  for select using (business_id = auth.uid());
-- INSERT é feito pela edge function via service role (bypassa RLS).
```

> **Mapeamento de status:** `delivered == recipients` → `sent`; `0 < delivered < recipients` → `partial`; `delivered == 0` → `failed`.
> Isso reflete o **ticket** do Expo (aceite imediato), não a entrega final no aparelho. Entrega real exige *push receipts* (ver §9, v2).

---

## 3. Contrato da função

### Request

`POST /functions/v1/SendBusinessNotification`
Header: `Authorization: Bearer <JWT do usuário business>`

```jsonc
{
  "target": { "type": "all" }
         // | { "type": "group",  "groupId": "uuid" }
         // | { "type": "custom", "influencerIds": ["uuid", ...] },
  "message": {
    "title": "🔥 Nova campanha!",
    "body": "Bora vender!",
    "subtitle": null,          // iOS only
    "data": { "type": "notificacao", "screen": "business-request", "tab": "notificacoes" },
    "priority": "default",
    "ttl": null,
    "sound": "default",
    "badge": null,
    "interruptionLevel": "active",
    "mutableContent": false,
    "channelId": "default"
  }
}
```

### Response

```jsonc
// 200
{ "ok": true, "notification_id": "uuid", "recipients": 5, "delivered": 5, "failed": 0, "status": "sent" }
// 401 sem/JWT inválido · 403 role != business · 402 cota estourada · 422 alvo/body inválido · 500 erro interno
```

---

## 4. Fluxo interno

```
1. Autenticar
   - createClient(URL, ANON, { global: { headers: { Authorization: req.header } } })
   - const { data: { user } } = await supabase.auth.getUser()   → 401 se null
   - business_id = user.id
   - checar users.role === 'business'                           → 403 caso contrário

2. Validar body (target + message.body obrigatórios)            → 422

3. Resolver influencer_ids conforme target (usando SERVICE ROLE):
   - all    → business_influencers where business_id AND status = 'active' (is_invite_accepted = true)
   - group  → influencer_group_members do groupId, cruzando com business_influencers ativos
              (garante que o grupo é do business e só inclui vínculos ativos)
   - custom → interseção de influencerIds com business_influencers ativos do business
   → audience_label é montado aqui ("Todos" | "Grupo: X" | "N influencers")

4. Buscar tokens
   - push_tokens where user_id in (influencer_ids)  → lista de expo_push_token (todos os devices)
   - dedupe de tokens

5. Cota (plans.max_push) — ver §5                               → 402 se estourar

6. Enviar em lote ao Expo
   - montar 1 mensagem por token: { to, title, body, subtitle, data, sound, ttl, priority,
     badge, _mutableContent, channelId, ...}
   - chunk de 100 mensagens/request para https://exp.host/--/api/v2/push/send
   - agregar tickets: delivered = count(status === 'ok'), failed = count(status === 'error')

7. Persistir histórico
   - insert em business_notifications { business_id, message, audience_label,
     recipients, delivered, failed, status }

8. Retornar resumo (§3 Response)
```

---

## 5. Cota de plano (`plans.max_push`)

- `businesses.plan_id → plans.max_push` = teto de **notificações** no período (mês corrente).
- A cota é **por notificação enviada** (cada envio = 1), independente de quantos influencers/tokens recebem.
- **Consumo do mês:** `SELECT COUNT(*) FROM business_notifications WHERE business_id = $1 AND sent_at >= date_trunc('month', now())`.
- Se `consumo + 1 > max_push` → **402** com `{ ok:false, error:"quota_exceeded", used, limit }`.
- `max_push` nulo/0 → ilimitado.

---

## 6. Segurança

- `verify_jwt: true` no deploy (config da função) — a plataforma rejeita sem JWT.
- Reforço em código: `getUser()` + checagem de `role = 'business'`.
- **Nunca** confiar em `business_id` vindo do body — sempre derivar de `user.id`.
- Resolução de alvos usa service role, mas **filtra por `business_id`** em toda query (impede um business notificar influencer de outro).
- `data` do push é fixado no server para o deep-link de `business-request/notificacoes` (o front já manda isso; a função pode reescrever/forçar para garantir).

---

## 7. Integração com o frontend

Trocar os mocks em `app/main/notificacoes/actions.ts`:

- `sendNotification(payload)` → `fetch(${FUNCTIONS_URL}/SendBusinessNotification, { headers: { Authorization: Bearer <access_token da sessão> }, body })`.
  Pegar o `access_token` via `supabase.auth.getSession()` (server action).
- `getNotificationsData()` → ler `business_notifications` (histórico) + `influencer_groups`/membros (grupos reais) + influencers ativos (já existe RPC de influencers).
- `createGroup(name, ids)` → insert em `influencer_groups` + `influencer_group_members` (server action, cliente com cookies).
- Após envio, revalidar tag de histórico (padrão de cache do projeto) em vez do append otimista — ou manter otimista e revalidar em background.

Nenhuma mudança de UI necessária: o `ExpoPushRecord` e o `NotifHistoryRow` do client-page já batem com o contrato acima.

---

## 8. Deploy e variáveis

- Deploy: `supabase functions deploy SendBusinessNotification` **sem** `--no-verify-jwt` (queremos JWT).
- Env já disponíveis no runtime: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
- Opcional: `EXPO_ACCESS_TOKEN` (se ligar *Enhanced Security* no projeto Expo; as funções atuais não usam).
- Estrutura de arquivos (seguindo o repo `migracao-supabase/supabase/functions/*`):
  `supabase/functions/SendBusinessNotification/index.ts`.

---

## 9. Casos de borda e v2

- **Sem tokens elegíveis** → 200 com `recipients: 0, status: "failed"` (ou 200 "nada a enviar"); ainda grava histórico? Sugiro gravar com recipients 0.
- **Tokens inválidos** (`DeviceNotRegistered`) → marcar falha; v2: limpar token de `push_tokens`.
- **Entrega real** (não só aceite): v2 coleta `receiptId` dos tickets e consulta `/push/getReceipts` num job posterior para atualizar `delivered/failed`.
- **Agendamento** ("enviar mais tarde"): v2 com `status: "scheduled"` + cron.
- **Rate limit** por business (evitar spam): reaproveitar padrão `ns_rate_limits` se necessário.
- **Multi-device**: um influencer com 3 devices conta como 3 no `recipients` (3 pushes). Alinhar com a regra de cota (§5).

---

## 10. Checklist de implementação

1. [ ] Migration: `influencer_groups` + `influencer_group_members` + RLS + índices.
2. [ ] Migration: `business_notifications` + RLS + índice.
3. [ ] Server actions de grupos (create/delete/addMember/removeMember) + trocar mock `createGroup`.
4. [ ] Edge function `SendBusinessNotification` (auth JWT, role, resolução de alvo, cota, chunk Expo, insert histórico).
5. [ ] Deploy com `verify_jwt: true`.
6. [ ] Trocar `sendNotification` e `getNotificationsData` no `actions.ts` (mock → real).
7. [ ] Teste ponta a ponta: enviar para todos / grupo / específicos; validar push chegando e deep-link abrindo `business-request` na aba Notificações.
8. [ ] Teste de cota: estourar `max_push` e checar 402.
```
