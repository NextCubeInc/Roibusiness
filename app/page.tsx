"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if(data){
    redirect("./app/dashboard")
  }
  redirect("./auth/signin")

}
