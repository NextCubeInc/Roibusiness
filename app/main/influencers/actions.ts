"use server"

import { unstable_cache, revalidateTag } from 'next/cache'
import { createClient } from "@/lib/supabase/server"
import { createCachedClient } from "@/lib/supabase/cached-client"

export type PendingInvite = {
  influencer_id: string
  name:          string | null
  instagram:     string | null
  avatar_url:    string | null
  invited_at:    string
}

export async function getPendingInvites(): Promise<PendingInvite[]> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const uid         = session.user.id
  const accessToken = session.access_token

  return unstable_cache(
    async () => {
      const client = createCachedClient(accessToken) // closure, não argumento
      const { data, error } = await client.rpc("get_pending_invites")
      if (error) console.error(error)
      return data ?? []
    },
    [`pending-invites-${uid}`],
    {
      tags: [`${uid}-influencers`],
      revalidate: 120,
    }
  )()
}

export async function getInfluencerByCode(code: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('get_influencer_by_invite_code', { p_invite_code: code })
  if (error || !data?.[0]) return null
  return data[0]
}

export async function setBusinessInfluencer(invite_code: string) {
  const supabase = await createClient()

  const formatted = invite_code.includes("-")
    ? invite_code
    : `${invite_code.slice(0, 4)}-${invite_code.slice(4)}`

  const { data: found } = await supabase
    .rpc('get_influencer_by_invite_code', { p_invite_code: formatted })

  if (!found?.[0]) return { success: false, error: "not_found" as const }

  const { error } = await supabase
    .rpc('create_business_invite', { p_influencer_id: found[0].id })

  if (error) {
    const isDuplicate = error.message.includes("duplicate_invite")
    return { success: false, error: isDuplicate ? "duplicate_invite" as const : "unknown" as const }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) revalidateTag(`${user.id}-influencers`, {})

  return { success: true, error: null }
}

export async function cancelInvite(influencer_id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .rpc('cancel_business_invite', { p_influencer_id: influencer_id })

  if (!error) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) revalidateTag(`${user.id}-influencers`, {})
  }

  return { success: !error, error: error?.message ?? null }
}

export default async function getInfluencersData(
  month?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const uid         = session.user.id
  const accessToken = session.access_token

  const isRange  = !!dateFrom && !!dateTo
  const cacheKey = isRange
    ? `influencers-${uid}-${dateFrom}_${dateTo}`
    : `influencers-${uid}-${month ?? 'current'}`

  return unstable_cache(
    async () => {
      const client = createCachedClient(accessToken) // closure, não argumento
      const rpcParams = isRange
        ? { p_month: null as string | null, p_date_from: dateFrom!, p_date_to: dateTo! }
        : { p_month: month ?? null }
      const { data, error } = await client
        .rpc("get_business_influencers", rpcParams)
      if (error) console.error(error)
      return data ?? []
    },
    [cacheKey],
    {
      tags: [`${uid}-orders`, `${uid}-influencers`],
      revalidate: 300,
    }
  )()
}

export async function addCoupon(
  influencer_id: string,
  code:          string,
  valueC:        number,
  validFrom?:    string,
  validTo?:      string,
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('add_coupon', {
    p_influencer_id:      influencer_id,
    p_code:               code,
    p_commission_percent: valueC,
    ...(validFrom ? { p_valid_from: validFrom } : {}),
    ...(validTo   ? { p_valid_to:   validTo   } : {}),
  })
  return { success: !error, id: data as string | null, error: error?.message }
}

export async function addCouponCommission(
  coupon_id: string,
  percent:   number,
  validFrom?: string,
  validTo?:   string,
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('add_coupon_commission', {
    p_coupon_id:          coupon_id,
    p_commission_percent: percent,
    ...(validFrom ? { p_valid_from: validFrom } : {}),
    ...(validTo   ? { p_valid_to:   validTo   } : {}),
  })
  return { success: !error, id: data as string | null, error: error?.message }
}

export async function deleteCouponCommission(commission_id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .rpc('delete_coupon_commission', { p_commission_id: commission_id })
  return { success: !error }
}

export async function toggleCoupon(coupon_id: string, is_active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .rpc('toggle_coupon', { p_coupon_id: coupon_id, p_is_active: is_active })
  return { success: !error }
}

export async function deleteCoupon(coupon_id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .rpc('delete_coupon', { p_coupon_id: coupon_id })
  return { success: !error }
}

export async function removeBusinessInfluencer(influencer_id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .rpc('remove_business_influencer', { p_influencer_id: influencer_id })
  return { success: !error }
}