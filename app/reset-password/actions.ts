"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function sendRecover(formData: FormData) {
  const supabase = await createClient()

  const NewPassword = formData.get("password") as string


  await supabase.auth.updateUser({ password: NewPassword })
  await supabase.auth.signOut()

  redirect("/auth/signin")
}