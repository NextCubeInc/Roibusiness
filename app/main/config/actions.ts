"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type BusinessSettings = {
  name:                    string | null
  email:                   string | null
  phone:                   string | null
  instagram:               string | null
  site:                    string | null
  avatar_url:              string | null
  subscription_status:     string | null
  subscription_started_at: string | null
  plan_code:               string | null
  max_influencers:         number
  max_orders:              number
  influencers_count:       number
  orders_count:            number
}

export async function getBusinessSettings(): Promise<BusinessSettings | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_business_settings")
  if (error) { console.error(error); return null }
  return data as BusinessSettings
}

export async function updateBusinessProfile(fields: {
  name?:      string
  phone?:     string
  instagram?: string
  site?:      string
}) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("update_business_profile", {
    p_name:      fields.name      ?? null,
    p_phone:     fields.phone     ?? null,
    p_instagram: fields.instagram ?? null,
    p_site:      fields.site      ?? null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath("/configuracoes")
  return { success: true }
}

export async function updatePassword(newPassword: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { success: false, error: error.message }
  return { success: true }
}