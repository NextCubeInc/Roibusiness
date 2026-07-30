"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function sendRecover(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string

  // Template padrão {{ .ConfirmationURL }}: o link https redireciona para
  // /auth/callback com ?code=. O `next` leva o usuário à tela de nova senha.
  const redirectTo = new URL(
    "auth/callback?next=/reset-password",
    process.env.NEXT_PUBLIC_SITE_URL,
  ).toString()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect("/auth/signin")
}