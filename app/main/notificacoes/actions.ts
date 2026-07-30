"use server"

import { unstable_cache, revalidateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createCachedClient } from "@/lib/supabase/cached-client"

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotifInfluencer = {
  influencer_id: string
  name:          string | null
  instagram:     string | null
  avatar_url:    string | null
  /** null = influencer ainda não instalou o app / sem push token */
  push_token:    string | null
  platform:      "ios" | "android" | null
}

export type NotifGroup = {
  id:             string
  name:           string
  influencer_ids: string[]
}

/** Espelha os campos aceitos pela Expo Push API (persistidos em business_notifications.message). */
export type ExpoPushRecord = {
  title:    string | null
  body:     string
  subtitle: string | null
  data:     Record<string, unknown> | null
  priority: "default" | "normal" | "high"
  ttl:      number | null
  sound:    string | null
  badge:             number | null
  interruptionLevel: "active" | "critical" | "passive" | "time-sensitive" | null
  mutableContent:    boolean
  channelId: string | null
}

export type SendStatus = "sent" | "partial" | "failed" | "scheduled"

export type NotifHistoryRow = {
  id:             string
  sent_at:        string
  message:        ExpoPushRecord
  audience_label: string
  recipients:     number
  delivered:      number
  failed:         number
  status:         SendStatus
}

export type SendTarget =
  | { type: "all" }
  | { type: "group"; groupId: string }
  | { type: "custom"; influencerIds: string[] }

// ── Fetchers ──────────────────────────────────────────────────────────────────

export async function getNotificationsData(): Promise<{
  influencers: NotifInfluencer[]
  groups:      NotifGroup[]
  history:     NotifHistoryRow[]
}> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { influencers: [], groups: [], history: [] }

  const uid         = session.user.id
  const accessToken = session.access_token

  return unstable_cache(
    async () => {
      const client = createCachedClient(accessToken) // closure, não argumento

      const [
        { data: influencersRaw },
        { data: groupsRaw },
        { data: historyRaw },
      ] = await Promise.all([
        client.rpc("get_business_notif_influencers"),
        client
          .from("influencer_groups")
          .select("id, name, influencer_group_members(influencer_id)")
          .order("created_at", { ascending: true }),
        client
          .from("business_notifications")
          .select("id, sent_at, message, audience_label, recipients, delivered, failed, status")
          .order("sent_at", { ascending: false })
          .limit(100),
      ])

      const influencers: NotifInfluencer[] = (influencersRaw ?? []).map((r: any) => ({
        influencer_id: r.influencer_id,
        name:          r.name,
        instagram:     r.instagram,
        avatar_url:    r.avatar_url,
        push_token:    r.push_token ?? null,
        platform:      normalizePlatform(r.platform),
      }))

      const groups: NotifGroup[] = (groupsRaw ?? []).map((g: any) => ({
        id:             g.id,
        name:           g.name,
        influencer_ids: (g.influencer_group_members ?? []).map((m: any) => m.influencer_id),
      }))

      const history: NotifHistoryRow[] = (historyRaw ?? []).map((h: any) => ({
        id:             h.id,
        sent_at:        h.sent_at,
        message:        h.message,
        audience_label: h.audience_label,
        recipients:     h.recipients ?? 0,
        delivered:      h.delivered ?? 0,
        failed:         h.failed ?? 0,
        status:         h.status,
      }))

      return { influencers, groups, history }
    },
    [`notifications-${uid}`],
    {
      tags: [`${uid}-notifications`, `${uid}-influencers`],
      revalidate: 120,
    }
  )()
}

function normalizePlatform(p: string | null | undefined): "ios" | "android" | null {
  if (!p) return null
  const v = p.toLowerCase()
  if (v.includes("ios")) return "ios"
  if (v.includes("android")) return "android"
  return null
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function sendNotification(payload: {
  target:  SendTarget
  message: ExpoPushRecord
}): Promise<{
  success:        boolean
  recipients:     number
  delivered:      number
  failed:         number
  status:         SendStatus
  notificationId: string | null
  error:          string | null
}> {
  const fail = (error: string) => ({
    success: false, recipients: 0, delivered: 0, failed: 0,
    status: "failed" as SendStatus, notificationId: null, error,
  })

  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return fail("no_session")

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/SendBusinessNotification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify(payload),
      },
    )

    const body = await res.json().catch(() => null)

    if (!res.ok || !body?.ok) {
      return fail(body?.error ?? `http_${res.status}`)
    }

    revalidateTag(`${session.user.id}-notifications`, {})

    return {
      success:        true,
      recipients:     body.recipients ?? 0,
      delivered:      body.delivered ?? 0,
      failed:         body.failed ?? 0,
      status:         (body.status as SendStatus) ?? "sent",
      notificationId: body.notification_id ?? null,
      error:          null,
    }
  } catch (e) {
    console.error("sendNotification error:", e)
    return fail("unknown")
  }
}

export async function createGroup(
  name: string,
  influencerIds: string[],
): Promise<{ success: boolean; id: string | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { success: false, id: null, error: "no_session" }

    const { data: group, error: gErr } = await supabase
      .from("influencer_groups")
      .insert({ business_id: session.user.id, name })
      .select("id")
      .single()

    if (gErr || !group) return { success: false, id: null, error: gErr?.message ?? "insert_failed" }

    if (influencerIds.length > 0) {
      const rows = influencerIds.map((influencer_id) => ({ group_id: group.id, influencer_id }))
      const { error: mErr } = await supabase.from("influencer_group_members").insert(rows)
      if (mErr) return { success: false, id: group.id, error: mErr.message }
    }

    revalidateTag(`${session.user.id}-notifications`, {})
    return { success: true, id: group.id, error: null }
  } catch (e) {
    console.error("createGroup error:", e)
    return { success: false, id: null, error: "unknown" }
  }
}

export async function deleteGroup(groupId: string): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { success: false }

    const { error } = await supabase.from("influencer_groups").delete().eq("id", groupId)
    if (!error) revalidateTag(`${session.user.id}-notifications`, {})
    return { success: !error }
  } catch (e) {
    console.error("deleteGroup error:", e)
    return { success: false }
  }
}
