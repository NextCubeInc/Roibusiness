# Contexto — Refatoração R1.0.1

> Projeto Supabase: `damubikhrskzrxcgxcoc`  
> Convenção: funções novas com sufixo `_v_r1_0_1` (lowercase — PostgREST é case-sensitive)  
> Regra: nunca dropar função antiga antes de 48h com a nova em produção

---

## O que foi feito

### Banco (concluído)

**Etapa 1 — Tabelas de cache**
- `business_kpi_cache` — 4 rows (uma por business), RLS com política `no_direct_access` (RESTRICTIVE, bloqueia acesso direto)
- `influencer_kpi_cache` — 126 rows (uma por influencer), mesma política

**Etapa 2 — Função base**
- `get_orders_enriched_v_r1_0_1` — resolve N+1 de comissão com LATERAL join, JOIN único em `store_payment_fees`, centraliza cálculo de `net_total` e `commission_value`

**Etapa 3 — RPCs de lista** (todas criadas, algumas já trocadas no frontend)
- `get_business_orders_v_r1_0_1`
- `get_business_last_orders_v_r1_0_1`
- `get_business_top_influencers_v_r1_0_1`
- `get_business_sales_by_day_v_r1_0_1`
- `get_business_sales_by_month_v_r1_0_1`
- `get_influencer_orders_overview_v_r1_0_1`
- `get_influencer_businesses_overview_v_r1_0_1`

**Etapa 4 — RPCs de KPI com cache**
- `recalculate_business_kpi_v_r1_0_1` — recalcula e grava em `business_kpi_cache`
- `get_business_kpis_v_r1_0_1` — lê cache (TTL 5min), recalcula se dirty
- `recalculate_influencer_kpi_v_r1_0_1`
- `get_influencer_dashboard_v_r1_0_1`

**Etapa 5 — Trigger**
- `trg_revalidate_order_cache` — em INSERT/UPDATE na tabela `orders`, marca `dirty = true` em `business_kpi_cache` e `influencer_kpi_cache`. Ignora `source = 'historical'`.

**Etapa 6 — Índices**
- `idx_orders_external_id_trgm` — GIN trigram para busca ILIKE em `external_id`
- `idx_orders_business_open` — partial index `status = 'open'`
- `idx_orders_influencer_open_paid` — partial index `status IN ('open', 'paid')`

**Fix adicional**
- `recalculate_business_kpi_v_r1_0_1` — corrigido para usar COALESCE em todos os agregados (business sem orders retornava NULL, quebrava NOT NULL constraint)
- `integracoes/actions.ts` — ao salvar taxas de pagamento, agora marca `business_kpi_cache` como `dirty = true` (trigger só cobre orders, não fees)

---

### Frontend — Roibusiness (`/Users/gabrielmarques/Roibusiness`)

**Cache removido do dashboard**
- `app/main/dashboard/actions.ts` — removido `unstable_cache`. Cache agora vive exclusivamente no banco (`business_kpi_cache`). Chamadas diretas via `supabase.rpc()`.

**RPCs trocadas:**

| Arquivo | RPC antiga | RPC nova |
|---|---|---|
| `dashboard/actions.ts` | `get_business_kpis` | `get_business_kpis_v_r1_0_1` |
| `dashboard/actions.ts` | `get_business_sales_by_day` | `get_business_sales_by_day_v_r1_0_1` |
| `dashboard/actions.ts` | `get_business_sales_by_month` | `get_business_sales_by_month_v_r1_0_1` |
| `dashboard/actions.ts` | `get_business_last_orders` | `get_business_last_orders_v_r1_0_1` |
| `dashboard/actions.ts` | `get_business_top_influencers` | `get_business_top_influencers_v_r1_0_1` |
| `vendas/actions.ts` | `get_business_orders` | `get_business_orders_v_r1_0_1` |
| `ranking/actions.ts` | `get_business_top_influencers` | `get_business_top_influencers_v_r1_0_1` |
| `influencers/actions.ts` | `get_business_top_influencers` | `get_business_top_influencers_v_r1_0_1` |

**RPCs que ficaram antigas (não estavam no plano R1.0.1):**
- `get_business_influencers` — ainda sem versão nova
- `get_business_campaigns`, `get_business_connected_influencers`, `get_business_stores`, `get_business_settings` — fora do escopo

---

### App do Influencer (`/Users/gabrielmarques/roinfluencer-app`)

**Ainda não avaliado.** RPCs a trocar (existem no banco):
- `get_influencer_orders_overview` → `get_influencer_orders_overview_v_r1_0_1`
- `get_influencer_businesses_overview` → `get_influencer_businesses_overview_v_r1_0_1`
- `get_influencer_dashboard` → `get_influencer_dashboard_v_r1_0_1`

---

## Estado do cache por página (Roibusiness)

| Página | Cache Next.js | Cache banco |
|---|---|---|
| Dashboard — KPIs | ❌ removido | ✅ `business_kpi_cache` TTL 5min |
| Dashboard — gráficos/tabela | ❌ sem cache | ❌ sem cache (direto nas orders) |
| Influencers | ✅ `unstable_cache` tag `${uid}-influencers` TTL 5min | ❌ |
| Ranking | ✅ `unstable_cache` tag `${uid}-ranking` TTL 5min | ❌ |
| Layout/perfil | ✅ `unstable_cache` TTL 1h | ❌ |
| Vendas | ❌ sem cache | ❌ |

---

## Pendente

1. **Avaliar e trocar RPCs no app do influencer** (`roinfluencer-app`)
2. **Observar 24-48h** cada RPC em produção antes de dropar as antigas
3. **Testar trigger formalmente** — inserir pedido e verificar `dirty = true`
4. **Dropar funções antigas** após período de observação

---

## Referência de valores (Etapa 0 — base de comparação)

| Business | Orders (open) | hattotal | commission |
|---|---|---|---|
| Olway (`536546a3`) | 1.700 | R$390.037,27 | R$37.942,49 |
| Next (`cca3e7e6`) | 184 | R$78.580,01 | R$10.917,28 |
| Team Icaro (`0701a39d`) | 4 | R$4.028,15 | R$392,14 |
| lara (`ae27bdf1`) | 0 | — | — |
