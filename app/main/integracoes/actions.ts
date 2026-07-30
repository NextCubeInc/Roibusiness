"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath, revalidateTag } from "next/cache"

export type StoreInfo = {
  id:         string
  store_type: string
  store_id:   string | null
  is_synced:  boolean
  connected:  boolean
  created_at: string
}

export async function getBusinessStores(): Promise<StoreInfo[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_business_stores")
  return data ?? []
}

export async function nuvemShopLink(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const storeLink = (formData.get("NuvemShop") as string).trim()

  redirect(
    `https://${storeLink}/admin/apps/23570/authorize?state=${user.id}&redirect_uri=${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/Nuvemshop-Callback`
  )
}

export type PaymentFees = {
  pix:                      number
  credit_card_1x:           number
  credit_card_installments: number
  boleto:                   number
  debit_card:               number
  other:                    number
}

export async function getPaymentFees(): Promise<PaymentFees | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await supabase
    .from("store_payment_fees")
    .select("pix, credit_card_1x, credit_card_installments, boleto, debit_card, other")
    .eq("business_id", session.user.id)
    .single()
  return data
}

export async function savePaymentFees(fees: PaymentFees) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: "Sessão não encontrada" }
  const { error } = await supabase
    .from("store_payment_fees")
    .upsert({ business_id: session.user.id, ...fees }, { onConflict: "business_id" })
  if (error) return { success: false, error: error.message }

  // Taxas afetam cálculos de comissão — invalida caches do Next e marca banco como dirty
  const uid = session.user.id
  revalidateTag(`${uid}-ranking`, {})
  revalidateTag(`${uid}-influencers`, {})

  // Marca business_kpi_cache como dirty (trigger só cobre orders, não fees)
  await supabase
    .from('business_kpi_cache')
    .update({ dirty: true })
    .eq('business_id', uid)

  return { success: true }
}

export type InstagramConnection = {
  connected:  boolean
  username:   string | null
  expires_in: string | null
}

export async function getInstagramConnection(): Promise<InstagramConnection> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { connected: false, username: null, expires_in: null }
  const { data } = await supabase
    .from("insta_connection")
    .select("username, expires_in")
    .eq("user_id", session.user.id)
    .maybeSingle()
  return {
    connected:  !!data,
    username:   data?.username ?? null,
    expires_in: data?.expires_in ?? null,
  }
}

export async function instagramLink() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const clientId    = process.env.INSTAGRAM_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/super-service`
  const scope = [
    "instagram_business_basic",
    "instagram_business_manage_comments",
    "instagram_business_manage_messages",
  ].join(",")

  // Formato "Business Login for Instagram" (Instagram API with Instagram Login).
  // É a mesma URL que o dashboard gera em: Instagram > API setup with Instagram login > Business login settings > Embed URL.
  redirect(
    `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(`${user.id}|web`)}`
  )
}

export async function disconnectInstagram() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false }
  const { error } = await supabase
    .from("insta_connection")
    .delete()
    .eq("user_id", session.user.id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/main/integracoes")
  return { success: true }
}

export async function disconnectStore(store_id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("stores")
    .update({
      access_token:  null,
      refresh_token: null,
      is_synced:     false,
    })
    .eq("id", store_id)
    // RLS garante que só o dono consegue atualizar
  
  if (error) return { success: false, error: error.message }

  revalidatePath("/integracoes")
  return { success: true }
}