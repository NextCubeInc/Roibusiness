"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

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