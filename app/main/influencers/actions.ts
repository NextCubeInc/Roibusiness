// app/main/influencers/actions.ts
"use server"

import { createClient } from "@/lib/supabase/server"

export async function getInfluencerByCode(code: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_influencer_by_invite_code', { p_invite_code: code })

  if (error || !data?.[0]) return null

  return data[0]
}

export async function setBusinessInfluencer(invite_code: string) {
  const supabase = await createClient()

  const formatted = `${invite_code.slice(0, 4)}-${invite_code.slice(4)}`

  const { data, error: rpcError } = await supabase
    .rpc('get_influencer_by_invite_code', { p_invite_code: formatted })

  if (!data?.[0]) return { success: false }

  const { error } = await supabase
    .from('business_influencers')
    .insert([{ influencer_id: data[0].id, invite_code_used: formatted }])

  if (error) return { success: false }
  return { success: true }
}

export default async function getInfluencersData(month?: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc("get_business_influencers", { p_month: month ?? null })
  if (error) console.error(error)
  return data ?? []
}

export async function addCoupon(influencer_id: string, code: string, valueC:number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('add_coupon', { p_influencer_id: influencer_id, p_code: code, p_commission_percent: valueC})

  console.log("ADD COUPON RESULT:", JSON.stringify({ data, error }, null, 2))

  return { success: !error, id: data as string | null, error: error?.message }
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