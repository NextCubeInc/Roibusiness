"use server"
import { unstable_cache } from 'next/cache'
import { createClient } from "@/lib/supabase/server"
import { createCachedClient } from "@/lib/supabase/cached-client"
import { BusinessProfile } from "@/lib/types"
import { redirect } from "next/navigation"

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const supabase = await createClient()

  // getSession() lê o cookie localmente — sem chamada HTTP ao servidor do Supabase
  // getUser() faz uma requisição HTTP a cada chamada (~300ms extra por navegação)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const uid         = session.user.id
  const accessToken = session.access_token

  // O perfil muda raramente — cacheamos por 1h e invalidamos se necessário
  // Token capturado em closure, NÃO como argumento (argumento entraria na cache key)
  return unstable_cache(
    async () => {
      const client = createCachedClient(accessToken)
      const { data, error } = await client
        .from("businesses")
        .select("name, email, avatar_url, phone, instagram, site")
        .single()
      if (error || !data) return null
      return data as BusinessProfile
    },
    [`profile-${uid}`],
    {
      tags: [`${uid}-profile`],
      revalidate: 3600, // 1 hora — perfil não muda com frequência
    }
  )()
}