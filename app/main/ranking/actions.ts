"use server"

import { unstable_cache, revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from "@/lib/supabase/server"

// ── Types ─────────────────────────────────────────────────────────────────────

export type Prize = {
  position_start: number
  position_end:   number
  reward_type:    "valor" | "porcentagem" | "produto" | "frete"
  reward_value:   string
  title:          string
}

export type CampaignParticipant = {
  influencer_id:    string
  name:             string | null
  avatar_url:       string | null
  coupon_code:      string | null
  total_sales:      number
  total_commission: number
  total_orders:     number
}

export type Campaign = {
  id:          string
  name:        string | null
  description: string | null
  starts_at:   string | null
  ends_at:     string | null
  status:      string | null
  prizes:      string | null   // JSON serializado no banco
  ranking:     CampaignParticipant[]
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ranking: [], campaigns: [], influencers: [] }

  const uid = user.id

  return unstable_cache(
    async () => {
      const client = await createClient()

      const [
        { data: ranking },
        { data: campaigns },
        { data: influencers },
      ] = await Promise.all([
        client.rpc("get_business_top_influencers", { p_limit: 50 }),
        client.rpc("get_business_campaigns"),
        client.rpc("get_business_connected_influencers"),
      ])

      const mappedInfluencers: ConnectedInfluencer[] = (influencers ?? []).map((inf: any) => ({
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

export async function createCampaign(input: CreateCampaignInput) {
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
  revalidateTag(`${user.id}-ranking`)
  revalidatePath("/main/ranking") // fallback para compatibilidade
  return { success: true, id: campaign.id }
}