"use server"

import ClientPageFill from "@/app/onboarding/fill"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"


export async function formFillPofile(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // insert + select em uma única operação, sem race condition
  const { data: userData, error: userError } = await supabase
    .from("users")
    .upsert({ id: user.id, role: "business" }, { onConflict: "id" })
    .select("exposeUUID")
    .single()

  if (userError) throw userError
  if (!userData?.exposeUUID) throw new Error("exposeUUID não encontrado")

  const name = formData.get("name")
  const phone = formData.get("phone")
  const instagram = formData.get("instagram")
  const site = formData.get("url")
  const avatarFile = formData.get("avatar") as File | null

  let avatar_url: string | null = null

  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split(".").pop()
    avatar_url = `${userData.exposeUUID}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(avatar_url, avatarFile, { upsert: true })

    if (uploadError) throw uploadError
  }

  const { error: businessError } = await supabase
    .from("businesses")
    .insert({ name, email: user.email, phone, instagram, site, avatar_url })

  if (businessError && businessError.code !== "23505") throw businessError

  redirect("/main/dashboard")
}

export default async function Page() {
  return <ClientPageFill actionFill={formFillPofile} />
}