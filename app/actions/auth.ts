"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isProfileFilled } from "./fillProfile"

export async function signInAction(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/auth/signin?error=${encodeURIComponent(error.message)}`)
  }

  const { filled } = await isProfileFilled(supabase)

  if (!filled) redirect("/onboarding")

  revalidatePath("/", "layout")
  redirect("/main/dashboard")
}

export async function signUpAction(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/auth/signin?message=Verifique seu email para confirmar o cadastro")
}