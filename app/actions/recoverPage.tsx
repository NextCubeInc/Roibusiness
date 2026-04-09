"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function sendRecover(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string

  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) {
    throw new Error(error.message)
  }

  redirect("/auth/signin")
}