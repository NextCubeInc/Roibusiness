"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function sendRecover(formData: FormData) {
  const supabase = await createClient()

  const newPassword = formData.get("password") as string

  // A sessão de recuperação já foi estabelecida pela rota /auth/confirm
  // (verifyOtp com type=recovery). Sem ela, updateUser falha.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/recover?error=Sessão de recuperação expirada. Solicite um novo link.")
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`)
  }

  await supabase.auth.signOut()

  redirect("/auth/signin?message=Senha alterada com sucesso")
}