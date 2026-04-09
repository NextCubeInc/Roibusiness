"use server"
import { createClient } from "@/lib/supabase/server"
import { BusinessProfile } from "@/lib/types"
import { redirect } from "next/navigation"

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("businesses")
    .select("name, email, avatar_url, phone, instagram, site")
    .single()

  if (error || !data) return null

  return data as BusinessProfile
}