"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { isProfileFilled } from "./actions/fillProfile"

export default async function Page() {
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()
  const isAuthenticated = !!data?.claims

  // 1. Não autenticado → signin
  if (!isAuthenticated) {
    redirect("/auth/signin")
  }

  // 2. Autenticado mas sem perfil → onboarding
  const { filled } = await isProfileFilled(supabase)
  if (!filled) {
    redirect("/onboarding")
  }

  // 3. Autenticado e com perfil → dashboard
  redirect("/main/dashboard")
}