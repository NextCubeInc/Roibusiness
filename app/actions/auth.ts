"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isProfileFilled } from "./fillProfile"

// Traduz mensagens de erro do Supabase Auth para PT-BR.
function traduzErroLogin(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("invalid login credentials")) return "Email ou senha incorretos."
  if (m.includes("email not confirmed")) return "Confirme seu email antes de entrar."
  if (m.includes("too many requests") || m.includes("rate limit"))
    return "Muitas tentativas. Aguarde alguns instantes e tente novamente."
  return "Não foi possível entrar. Tente novamente."
}

export async function signInAction(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/auth/signin?error=${encodeURIComponent(traduzErroLogin(error.message))}`)
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

  // Template padrão {{ .ConfirmationURL }}: o link https redireciona para
  // /auth/callback com ?code=, que troca por sessão (fluxo PKCE).
  const emailRedirectTo = new URL(
    "auth/callback",
    process.env.NEXT_PUBLIC_SITE_URL,
  ).toString()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  })

  if (error) {
    redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/auth/signin?message=Verifique seu email para confirmar o cadastro")
}