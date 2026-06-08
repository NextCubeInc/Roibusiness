"use server"

import { unstable_cache, revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from "@/lib/supabase/server"
import { createCachedClient } from "@/lib/supabase/cached-client"

// ── Types ─────────────────────────────────────────────────────────────────────

export type Prize = {
  position_start: number
  position_end:   number
  reward_type:    "valor" | "porcentagem" | "produto" | "frete"
  reward_value:   string
  title:          string
}

// Linha do ranking da campanha — agregada por influencer (soma todos os cupons dele).
export type CampaignParticipant = {
  influencer_id:    string
  name:             string | null
  avatar_url:       string | null
  total_sales:      number
  total_commission: number
  total_orders:     number
}

// Referência crua de quem participa (1 entrada por cupom escalado) — usada na edição.
export type CampaignParticipantRef = {
  influencer_id: string
  coupon_id:     string | null
}

export type Campaign = {
  id:          string
  name:        string | null
  description: string | null
  starts_at:   string | null
  ends_at:     string | null
  status:       string | null
  prizes:       string | null   // JSON serializado no banco
  ranking:      CampaignParticipant[]
  participants: CampaignParticipantRef[]   // cupons escalados — para pré-seleção na edição
}

export type RankingRow = {
  influencer_id:    string
  avatar_url:       string | null
  name:             string | null
  total_sales:      number
  total_orders:     number
  total_commission: number
}

export type ConnectedInfluencer = {
  id:         string
  name:       string | null
  avatar_url: string | null
  coupon:     string | null
  coupon_id:  string | null  // <-- adiciona isso
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getRankingData(): Promise<{
  ranking:   RankingRow[]
  campaigns: Campaign[]
  influencers: ConnectedInfluencer[]
}> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ranking: [], campaigns: [], influencers: [] }

  const uid         = session.user.id
  const accessToken = session.access_token

  return unstable_cache(
    async () => {
      const client = createCachedClient(accessToken) // closure, não argumento

      const [
        { data: ranking,     error: rankingErr },
        { data: campaigns,   error: campaignsErr },
        { data: influencers, error: influencersErr },
      ] = await Promise.all([
        client.rpc("get_business_top_influencers_v_r1_0_1", { p_limit: 50 }),
        client.rpc("get_business_campaigns"),
        client.rpc("get_business_connected_influencers"),
      ])

      // Não silenciar falha de RPC — caso contrário a tela mostra "vazio" como se fosse sucesso
      if (rankingErr)     console.error("[ranking] get_business_top_influencers_v_r1_0_1:", rankingErr.message)
      if (campaignsErr)   console.error("[ranking] get_business_campaigns:", campaignsErr.message)
      if (influencersErr) console.error("[ranking] get_business_connected_influencers:", influencersErr.message)

      const mappedInfluencers: ConnectedInfluencer[] = (influencers ?? []).map((inf: ConnectedInfluencer) => ({
        id:         inf.id,
        name:       inf.name,
        avatar_url: inf.avatar_url,
        coupon:     inf.coupon,
        coupon_id:  inf.coupon_id,
      }))

      return {
        ranking:     ranking ?? [],
        campaigns:   Array.isArray(campaigns) ? campaigns : [],
        influencers: mappedInfluencers,
      }
    },
    [`ranking-${uid}`],
    {
      tags: [`${uid}-orders`, `${uid}-ranking`],
      revalidate: 300,
    }
  )()
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export type CreateCampaignInput = {
  name:         string
  description:  string
  starts_at:    string | null
  ends_at:      string | null
  prizes:       Prize[]
  influencers:  { influencer_id: string; coupon_id: string }[]
}

export type UpdateCampaignInput = {
  id:          string
  name:        string
  description: string
  starts_at:   string | null
  ends_at:     string | null
  prizes:      Prize[]
  status:      string
  influencers: { influencer_id: string; coupon_id: string }[]
}

const REWARD_TYPES  = ["valor", "porcentagem", "produto", "frete"]
const STATUS_VALUES = ["active", "paused", "finished", "draft", "cancelled"]

// Validação server-side — as server actions podem ser chamadas direto, sem passar pela UI.
function validateCampaign(input: {
  name:        string
  prizes:      Prize[]
  influencers: { influencer_id: string; coupon_id: string }[]
  starts_at?:  string | null
  ends_at?:    string | null
  status?:     string
}) {
  if (!input.name?.trim())             throw new Error("Informe o nome da campanha.")
  if (input.name.trim().length > 120)  throw new Error("Nome muito longo (máx. 120 caracteres).")
  if (!input.influencers?.length)      throw new Error("Selecione ao menos um influencer.")
  if (!input.prizes?.length)           throw new Error("Adicione ao menos um prêmio.")

  for (const p of input.prizes) {
    if (!Number.isInteger(p.position_start) || p.position_start < 1)
      throw new Error("Posição inicial do prêmio deve ser um número inteiro ≥ 1.")
    if (!Number.isInteger(p.position_end) || p.position_end < p.position_start)
      throw new Error("Posição final do prêmio deve ser ≥ posição inicial.")
    if (!REWARD_TYPES.includes(p.reward_type))
      throw new Error("Tipo de prêmio inválido.")
    if (p.reward_type !== "frete" && !p.reward_value?.trim())
      throw new Error("Informe o valor/descrição do prêmio.")
  }

  if (input.status && !STATUS_VALUES.includes(input.status))
    throw new Error("Status inválido.")

  if (input.starts_at && input.ends_at && new Date(input.ends_at) < new Date(input.starts_at))
    throw new Error("A data de fim não pode ser anterior à data de início.")
}

export async function updateCampaign(input: UpdateCampaignInput) {
  validateCampaign(input)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")

  // Atualiza campos da campanha — .select() confirma que a campanha existe E pertence ao usuário
  const { data: updated, error } = await supabase
    .from("campaigns")
    .update({
      name:        input.name,
      description: input.description || null,
      starts_at:   input.starts_at || null,
      ends_at:     input.ends_at   || null,
      prizes:      JSON.stringify(input.prizes),
      status:      input.status,
    })
    .eq("id", input.id)
    .eq("business_id", user.id)
    .select("id")

  if (error) throw new Error(error.message)
  if (!updated || updated.length === 0)
    throw new Error("Campanha não encontrada ou sem permissão.")

  // Sincroniza participantes por coupon_id (um influencer pode ter N cupons na mesma campanha)
  const { data: current, error: currentErr } = await supabase
    .from("campaign_participants")
    .select("id, influencer_id, coupon_id")
    .eq("campaign_id", input.id)
  if (currentErr) throw new Error(currentErr.message)

  // Chave de comparação: coupon_id quando existe, senão influencer_id
  const newKeys     = new Set(input.influencers.map((i) => i.coupon_id || i.influencer_id))
  const currentKeys = new Set((current ?? []).map((p) => p.coupon_id ?? p.influencer_id))

  // Remove os que saíram — um único DELETE por id (evita N+1)
  const removeIds = (current ?? [])
    .filter((p) => !newKeys.has(p.coupon_id ?? p.influencer_id))
    .map((p) => p.id)
  if (removeIds.length > 0) {
    const { error: delErr } = await supabase
      .from("campaign_participants")
      .delete()
      .in("id", removeIds)
    if (delErr) throw new Error(delErr.message)
  }

  // Adiciona os novos
  const toAdd = input.influencers.filter((i) => !currentKeys.has(i.coupon_id || i.influencer_id))
  if (toAdd.length > 0) {
    const { error: insErr } = await supabase
      .from("campaign_participants")
      .insert(
        toAdd.map((inf) => ({
          campaign_id:   input.id,
          influencer_id: inf.influencer_id,
          coupon_id:     inf.coupon_id || null,
          status:        "active",
          joined_at:     new Date().toISOString(),
        }))
      )
    if (insErr) throw new Error(insErr.message)
  }

  revalidateTag(`${user.id}-ranking`, {})
  return { success: true }
}

export async function deleteCampaign(campaign_id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaign_id)
    .eq("business_id", user.id)

  if (error) throw new Error(error.message)

  revalidateTag(`${user.id}-ranking`, {})
  return { success: true }
}

export async function createCampaign(input: CreateCampaignInput) {
  validateCampaign(input)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")

  // Insere a campanha
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      business_id: user.id,
      name:        input.name,
      description: input.description || null,
      starts_at:   input.starts_at || null,
      ends_at:     input.ends_at   || null,
      status:      "active",
      prizes:      JSON.stringify(input.prizes),
    })
    .select("id")
    .single()

  if (campaignError) throw new Error(campaignError.message)

  // Insere os participantes
  if (input.influencers.length > 0) {
    const { error: participantsError } = await supabase
      .from("campaign_participants")
      .insert(
        input.influencers.map((inf) => ({
          campaign_id:  campaign.id,
          influencer_id: inf.influencer_id,
          coupon_id:    inf.coupon_id || null,
          status:       "active",
          joined_at:    new Date().toISOString(),
        }))
      )

    if (participantsError) throw new Error(participantsError.message)
  }

  // Invalida cache do ranking deste business
  revalidateTag(`${user.id}-ranking`, {})
  revalidatePath("/main/ranking") // fallback para compatibilidade
  return { success: true, id: campaign.id }
}