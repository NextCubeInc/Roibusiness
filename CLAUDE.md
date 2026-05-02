# Roibusiness — Notas para o Claude

## Stack

- **Next.js 16.1.7** App Router + Turbopack
- **Supabase** (project: `kfkiskakbhnbwabhaghv`) — PostgreSQL + Auth + Storage
- **@supabase/ssr** para o cliente com cookies (server components, server actions)
- **@supabase/supabase-js** para o cliente com JWT header (dentro do `unstable_cache`)
- Workspace: `/Users/gabrielmarques/Roibusiness`

---

## Arquitetura de Cache (Next.js + Supabase)

### Problema resolvido
Havia um delay de 6–9s na navegação entre rotas. Causas: N+1 queries no banco e nenhum caching — cada clique na sidebar refazia todas as queries, incluindo uma chamada HTTP ao servidor de auth do Supabase.

### Solução implementada

**1. `lib/supabase/cached-client.ts`**
Cria um cliente Supabase usando JWT no header `Authorization` em vez de cookies. Necessário porque `cookies()` é proibido dentro de `unstable_cache`.

```ts
import { createClient } from '@supabase/supabase-js'
export function createCachedClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  )
}
```

**2. Padrão de closure no `unstable_cache`**
O `accessToken` é capturado em closure, **nunca** passado como argumento. Se passado como argumento, ele entra na cache key — como o JWT rotaciona, cada requisição seria um cache miss.

```ts
// ✅ CORRETO — token em closure, cache key estável
export async function getDashboardData() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession() // local, sem HTTP
  if (!session) return null
  const uid = session.user.id
  const accessToken = session.access_token

  return unstable_cache(
    async () => {
      const client = createCachedClient(accessToken) // closure!
      // ...queries
    },
    [`dashboard-${uid}`],
    { tags: [`${uid}-orders`, `${uid}-dashboard`], revalidate: 300 }
  )() // chamado SEM argumentos
}

// ❌ ERRADO — token como argumento entra na cache key
return unstable_cache(
  async (token: string) => { ... },
  [`dashboard-${uid}`],
  { ... }
)(accessToken) // cache miss a cada rotação de JWT
```

**3. `getSession()` vs `getUser()` no layout**
- `getSession()` — lê o cookie localmente, sem chamada HTTP (~0ms)
- `getUser()` — faz requisição HTTP ao servidor de auth do Supabase (~300–500ms por navegação)

O layout (`app/main/layout.tsx`) usa `getBusinessProfile()` que chama `getSession()` + `unstable_cache` com TTL de 1h. **Nunca usar `getUser()` em código chamado a cada navegação.**

**4. Tags de cache por usuário**
Cada usuário tem suas próprias tags no formato `${uid}-<escopo>`:
- `${uid}-orders` — invalidado quando chega nova order
- `${uid}-dashboard` — página dashboard
- `${uid}-ranking` — página ranking
- `${uid}-influencers` — página influencers
- `${uid}-profile` — perfil (TTL 1h, raramente muda)

**5. `revalidateTag` no Next.js 16**
A assinatura mudou — requer 2 argumentos:
```ts
revalidateTag(`${user.id}-orders`, {}) // {} é obrigatório no Next.js 16
```

---

## Invalidação de Cache via DB Trigger

### `app/api/revalidate/route.ts`
Rota POST que invalida as tags de cache de um business. Chamada pelo trigger do banco quando uma order é inserida ou atualizada.

```ts
// Autenticação via header
const secret = req.headers.get('x-revalidate-secret')
if (secret !== process.env.REVALIDATE_SECRET) return 401

const { business_id } = await req.json()
revalidateTag(`${business_id}-orders`, {})
// ...demais tags
```

### Variáveis de ambiente necessárias
```
REVALIDATE_SECRET=<segredo gerado>   # .env.local e Vercel
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

### `app_config` no banco
Tabela com `key/value` usada pelo trigger para ler a URL do app e o segredo:
```sql
UPDATE app_config SET value = 'https://seu-app.vercel.app' WHERE key = 'site_url';
-- revalidate_secret já está configurado
```
**Atualizar `site_url` ao fazer deploy para produção.**

---

## RPCs Supabase — Tempos de Execução (benchmark com dados reais)

| RPC | Tempo DB | Observação |
|-----|----------|------------|
| `get_business_influencers` | ~135ms | Mais lenta — CTE com comissões |
| `get_business_last_orders` | ~96ms | Segunda mais lenta |
| `get_business_campaigns` | ~22ms | Ok |
| `get_business_sales_by_day` | ~15ms | Ok |
| `get_business_kpis` | ~14ms | Ok |
| `get_business_top_influencers` | ~6ms | Rápida |

O dashboard faz as 5 RPCs em `Promise.all` — o gargalo é a mais lenta do grupo. Com cache hit, todas as rotas respondem em <50ms.

### N+1 eliminado
Todas as RPCs que calculam comissão agora usam um CTE `commission_base` que carrega todas as `coupon_commissions` do business uma vez (~5 linhas) e faz subquery em memória, em vez de chamar `get_coupon_commission()` por linha de order.

### Overloads de função no PostgREST
PostgREST não lida bem com overloads de função. Se existirem duas versões de `get_business_influencers()` (uma sem parâmetros e outra com `p_month text DEFAULT NULL`), o PostgREST fica ambíguo e pode retornar vazio. **Manter apenas uma assinatura por função.** O overload sem parâmetros foi removido — a versão com `p_month DEFAULT NULL` cobre os dois casos.

---

## Estrutura de Arquivos Relevante

```
app/
  api/revalidate/route.ts        # webhook de invalidação de cache
  main/
    actions.ts                   # getBusinessProfile — cached, 1h TTL
    layout.tsx                   # usa getSession(), não getUser()
    dashboard/actions.ts         # getDashboardData — cached, 5min TTL
    influencers/actions.ts       # getInfluencersData, getPendingInvites — cached
    ranking/actions.ts           # getRankingData — cached; createCampaign — revalida
lib/
  supabase/
    server.ts                    # cliente com cookies (@supabase/ssr)
    cached-client.ts             # cliente com JWT header (para dentro do unstable_cache)
```
