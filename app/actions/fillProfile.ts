"use server"

export async function isProfileFilled(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { filled: false }

  const { data, error } = await supabase
    .from("businesses")
    .select("name, email, avatar_url")
    .eq("id", user.id) // ← era user_id, mas a tabela não tem essa coluna
    .single()

  if (error || !data || !data.name) {
    return { filled: false }
  }

  return { filled: true }
}

