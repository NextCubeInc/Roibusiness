"use server"

import { createClient } from "@supabase/supabase-js"

export type DeleteRequestState = {
  success: boolean
  message: string
} | null

export async function submitDeleteRequest(
  _prev: DeleteRequestState,
  formData: FormData
): Promise<DeleteRequestState> {
  const name = formData.get("name")?.toString().trim()
  const email = formData.get("email")?.toString().trim()

  if (!name || !email) {
    return { success: false, message: "Preencha todos os campos." }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { error } = await supabase
    .from("delete_request")
    .insert({ name, email })

  if (error) {
    console.error("delete_request insert error:", error)
    return { success: false, message: "Erro ao enviar solicitação. Tente novamente." }
  }

  return { success: true, message: "Solicitação recebida! Você será contatado em até 7 dias úteis." }
}
