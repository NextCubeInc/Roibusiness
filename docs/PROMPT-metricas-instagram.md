# Prompt — Plano de execução: Métricas de Instagram para Influencers

> Cole este prompt no Cowork/Claude Code. Ele foi estruturado para modo de planejamento (não implementar código ainda).

---

## Papel e modo de operação

Você é um arquiteto de software sênior trabalhando **dentro deste repositório** (Next.js 16 App Router + Supabase). Leia e siga o `CLAUDE.md` do projeto — ele descreve a arquitetura de cache (`unstable_cache` com token em closure, tags `${uid}-<escopo>`, `getSession()` no layout, RPCs no Supabase, invalidação via trigger → `app/api/revalidate`). Todo o plano deve respeitar esses padrões.

**Entregue APENAS um plano de execução para aprovação. Não escreva nem altere código ainda.** Use o modo de planejamento (EnterPlanMode) e finalize com ExitPlanMode para eu aprovar.

## Antes de planejar — investigação obrigatória

1. **Inspecione o schema real** do Supabase (projeto `kfkiskakbhnbwabhaghv`) usando as ferramentas MCP do Supabase (`list_tables`, `list_migrations`, `execute_sql` read-only). Não invente nomes de tabela — descubra como `influencers`, `orders`, `coupon_commissions`, `business` etc. estão modeladas hoje.
2. **Leia o código existente** das telas de Comunidade/Influencers: `app/main/influencers/` (actions + página) e onde a rota `comunidade` vive. Reaproveite componentes de tabela e padrões de data-fetching cacheado já usados.
3. **Leia a documentação linkada** (fetch de cada URL abaixo) antes de propor a integração. Baseie endpoints, escopos e webhooks no que a doc realmente diz — cite a fonte de cada decisão.
4. Se algo for genuinamente ambíguo (ex.: qual conta IG será a "empresa", como o influencer se autentica, se já existe App no Meta), **pergunte antes** com opções concretas — não assuma silenciosamente.

## Objetivo

Coletar, armazenar e exibir métricas de Instagram dos influencers, integrando às telas existentes de Comunidade e criando uma tela de detalhe por influencer em `comunidade/influencer/[id]`.

## Métricas a persistir (todas no banco, para consulta posterior)

- **Menções** (story mentions)
- **Seguidores**
- **Posts** (sempre relacionados à empresa)
- **Reels**

## Requisitos de UI

1. **Tela de Influencers (existente):** adicionar duas colunas na tabela — **Seguidores** e **Posts**.
2. **Nova tela de detalhe** `comunidade/influencer/[id]`, mesma estrutura visual da tela de influencers, com todas as métricas de Instagram daquele influencer:
   - Posts (relacionados à empresa)
   - Menções (mesma tabela da página de influencers)
   - Galeria de mídias com o componente **Masonry** do reactbits.dev
   - Cada mídia com **badge** de tipo: `Post`, `Reels` ou `Story Mention`
   - **Filtro por data** das mídias/métricas
3. **Comunidade** é o ponto de entrada; `comunidade/influencer/[id]` exibe o detalhe.

## Formato do plano (responda exatamente nesta ordem)

1. **Objetivo em uma frase + suposições** que você está adotando (marque quais dependem de resposta minha).
2. **Modelo de dados:** tabelas/campos novos ou alterados para salvar seguidores, posts, reels e menções. Inclua: nomes de colunas, tipos, FKs para o influencer/business, índices, e como a granularidade temporal (snapshots de seguidores ao longo do tempo vs. valor atual) será modelada para suportar o filtro por data. Proponha as migrations como blocos SQL (sem aplicar).
3. **Integração Instagram/Facebook:** com base na doc — fluxo de **Instagram Login** e escopos necessários; endpoints para **posts/reels da empresa** e **tags do usuário** (IG User `tags`); coleta de **menções** e **story mentions** via **Webhooks**; qual objeto/campo assinar; como distinguir Post × Reels × Story Mention na ingestão. Descreva o edge function/route handler que recebe o webhook e como ele grava no banco.
4. **Passos sequenciais numerados** — cada um com: responsabilidade única, **entradas**, **saídas** e **critério de verificação** ("pronto quando...").
5. **Dependências entre passos** e o que pode rodar em paralelo.
6. **Casos-limite e erros reais:** rate limits da Graph API, token expirado/refresh, reassinatura de webhook, mídia sem tipo definido, influencer sem conta IG conectada, backfill histórico vs. tempo real, deduplicação de mídias, permissões RLS por business.
7. **Critério de conclusão da feature inteira** — checklist objetivo de "está pronto e correto" (dados persistidos, colunas na tabela, tela de detalhe, galeria com badges, filtro por data funcionando, cache invalidando corretamente).

## Restrições técnicas

- Respeite o padrão de cache do `CLAUDE.md`: data-fetching em `actions.ts` cacheado com `unstable_cache`, tags por usuário, e invalidação via `revalidateTag(tag, {})`. Proponha novas tags (ex.: `${uid}-instagram`).
- Prefira **RPCs no Postgres** para agregações pesadas (siga o padrão CTE `commission_base` para evitar N+1).
- Segredos (App Secret, tokens, verify token do webhook) via env vars — nunca hardcoded.
- Componente Masonry: descreva como integrá-lo em client component sem quebrar SSR/streaming.

## Documentação a seguir (faça fetch de cada uma)

- Masonry (reactbits): https://reactbits.dev/components/masonry
- Next.js: https://nextjs.org/
- Instagram Platform (visão geral): https://developers.facebook.com/documentation/instagram-platform/
- Menções (Instagram API with Instagram Login): https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/
- Webhooks (Instagram Messaging): https://developers.facebook.com/documentation/business-messaging/instagram-messaging/webhooks
- Story Mention: https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/story-mention
- Tags do usuário (IG User): https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/tags

**Lembrete final:** investigue o schema e leia as docs primeiro; depois apresente o plano; só implemente após minha aprovação.
