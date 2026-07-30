"use server"

import { unstable_cache } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createCachedClient } from "@/lib/supabase/cached-client"

export type ComunidadeRow = {
  influencer_id:   string
  name:            string | null
  instagram:       string | null
  avatar_url:      string | null
  followers_count: number | null
  posts_count:     number | null
}

/**
 * Lista de influencers da comunidade com métricas de Instagram (seguidores + posts
 * relacionados à empresa). Faz o merge de get_business_influencers (dados base) com
 * get_business_influencers_ig (métricas IG) em memória — sem N+1.
 */
export async function getComunidadeData(
  month?: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<ComunidadeRow[]> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const uid         = session.user.id
  const accessToken = session.access_token

  const isRange  = !!dateFrom && !!dateTo
  const cacheKey = isRange
    ? `comunidade-${uid}-${dateFrom}_${dateTo}`
    : `comunidade-${uid}-${month ?? "current"}`

  return unstable_cache(
    async () => {
      const client = createCachedClient(accessToken) // closure, não argumento
      const rpcParams = isRange
        ? { p_month: null as string | null, p_date_from: dateFrom!, p_date_to: dateTo! }
        : { p_month: month ?? null }

      const [
        { data: base, error: baseErr },
        { data: ig,   error: igErr },
      ] = await Promise.all([
        client.rpc("get_business_influencers", rpcParams),
        client.rpc("get_business_influencers_ig"),
      ])

      if (baseErr) console.error("getComunidadeData base:", baseErr)
      if (igErr)   console.error("getComunidadeData ig:", igErr)

      const igMap = new Map<string, { followers_count: number | null; posts_count: number | null }>()
      for (const r of ig ?? []) {
        igMap.set(r.influencer_id, {
          followers_count: r.followers_count ?? null,
          posts_count:     r.posts_count ?? null,
        })
      }

      return (base ?? []).map((b: any): ComunidadeRow => ({
        influencer_id:   b.influencer_id,
        name:            b.name,
        instagram:       b.instagram,
        avatar_url:      b.avatar_url,
        followers_count: igMap.get(b.influencer_id)?.followers_count ?? null,
        posts_count:     igMap.get(b.influencer_id)?.posts_count ?? null,
      }))
    },
    [cacheKey],
    {
      tags: [`${uid}-orders`, `${uid}-influencers`, `${uid}-instagram`],
      revalidate: 300,
    }
  )()
}

// ── Tipos do detalhe ──────────────────────────────────────────────────────────

export type InstaMediaKind =
  | "post"
  | "reels"
  | "story_mention"
  | "post_mention"
  | "reel_mention"

export type InstaMediaItem = {
  id:             string
  kind:           InstaMediaKind
  media_type:     string | null
  caption:        string | null
  permalink:      string | null
  media_url:      string | null
  thumbnail_url:  string | null
  cdn_url:        string | null
  like_count:     number | null
  comments_count: number | null
  posted_at:      string | null
}

export type InfluencerInstagramDetail = {
  influencer: { id: string; name: string | null; instagram: string | null; avatar_url: string | null } | null
  connection: {
    username: string | null; account_type: string | null; profile_picture_url: string | null
    followers_count: number | null; media_count: number | null; last_synced_at: string | null
  } | null
  followers_current: number | null
  followers_start:   number | null
  counts: {
    posts: number
    reels: number
    story_mentions: number
    post_mentions: number
    reel_mentions: number
  } | null
  media:             InstaMediaItem[]
  mentions:          InstaMediaItem[]
} | null

/**
 * Detalhe completo de Instagram de um influencer, escopado ao business logado.
 * Filtro por data opcional (YYYY-MM-DD).
 */
export async function getInfluencerInstagramDetail(
  influencerId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<InfluencerInstagramDetail> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const uid         = session.user.id
  const accessToken = session.access_token
  const isRange     = !!dateFrom && !!dateTo
  const cacheKey    = isRange
    ? `insta-detail-${uid}-${influencerId}-${dateFrom}_${dateTo}`
    : `insta-detail-${uid}-${influencerId}-all`

  return unstable_cache(
    async () => {
      const client = createCachedClient(accessToken)
      const { data, error } = await client.rpc("get_influencer_instagram_detail", {
        p_influencer_id: influencerId,
        p_date_from:     isRange ? dateFrom! : null,
        p_date_to:       isRange ? dateTo!   : null,
      })
      if (error) {
        console.error("getInfluencerInstagramDetail:", error)
        return null
      }
      return (data ?? null) as InfluencerInstagramDetail
    },
    [cacheKey],
    {
      tags: [`${uid}-instagram`],
      revalidate: 300,
    }
  )()
}
