// =====================================================
// IMPORTS E CONFIG
// =====================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js"
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const PROVIDER = "nuvemshop"
const BATCH_REALTIME = 25
const BATCH_SYNC = 10
const MAX_ATTEMPTS = 5
const RATE_LIMIT_PER_MINUTE = 50
const NS_API_BASE = "https://api.tiendanube.com/2025-03"

const REALTIME_EVENTS = ["order_paid", "order_cancelled", "order_voided", "app_uninstalled"]
const SYNC_EVENTS = ["store_connected", "coupon_created", "sync_page"]

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

// =====================================================
// HELPERS & CRYPTO
// =====================================================
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function importKeyFromSecret(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret))
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"])
}

async function decrypt(encryptedBase64: string): Promise<string> {
  const secret = Deno.env.get("TOKEN_ENCRYPTION_KEY")
  if (!secret) throw new Error("Missing TOKEN_ENCRYPTION_KEY")
  const key = await importKeyFromSecret(secret)
  const combined = base64ToUint8Array(encryptedBase64)
  const iv = combined.slice(0, 12)
  const cipher = combined.slice(12)
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher)
  return new TextDecoder().decode(plainBuf)
}

function normalizeCoupon(coupon: unknown): string | null {
  if (!coupon) return null
  if (Array.isArray(coupon)) return (coupon[0] as any)?.code?.toUpperCase()?.trim() ?? null
  if (typeof coupon === "object") return (coupon as any).code?.toUpperCase()?.trim() ?? null
  if (typeof coupon === "string") return coupon.toUpperCase().trim()
  return null
}

function sixMonthsAgoISO(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 6)
  return d.toISOString()
}

function extractNextPage(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  for (const part of linkHeader.split(",")) {
    if (part.includes('rel="next"')) return part.match(/<(.*?)>/)?.[1] ?? null
  }
  return null
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

// =====================================================
// LOCKS & RATE LIMIT
// =====================================================
async function allowRequestForStore(storeId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("ns_allow_request", { p_store_id: storeId, p_limit: RATE_LIMIT_PER_MINUTE })
  if (error) {
    console.error(`❌ Erro RPC rate limit:`, error)
    throw error
  }
  return Boolean(data)
}

async function tryAdvisoryLock(businessId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("try_lock_business", { bid: businessId })
  if (error) {
    console.error(`❌ Erro RPC Lock:`, error)
    throw error
  }
  return Boolean(data)
}

async function unlockAdvisoryLock(businessId: string) {
  await supabase.rpc("unlock_business", { bid: businessId })
}

// =====================================================
// QUEUE ACTIONS
// =====================================================
type QueueEvent = {
  id: string
  provider: string
  event: string
  raw_payload: any
  status: string
}

async function pollEvents(batch: number, events: string[]): Promise<QueueEvent[]> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("webhook_events")
    .select("*")
    .eq("status", "pending")
    .eq("provider", PROVIDER)
    .lte("process_after", now)
    .order("created_at")
    .limit(batch)
    .in("event", events)

  if (error) {
    console.error(`❌ Erro ao buscar fila (${events.join(",")}):`, error)
    throw error
  }
  return data ?? []
}

async function enqueueEvent(event: string, payload: any, delaySeconds = 0) {
  const processAfter = new Date(Date.now() + delaySeconds * 1000).toISOString()
  console.log(`📥 Enfileirando: [${event}] para ${processAfter}`)
  await supabase.from("webhook_events").insert({
    provider: PROVIDER,
    event,
    raw_payload: payload,
    status: "pending",
    process_after: processAfter,
  })
}

// =====================================================
// HELPERS INTERNOS
// =====================================================
async function findStoreAndBusiness(storeId: string): Promise<{ business_id: string } | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("business_id")
    .eq("store_id", storeId)
    .eq("store_type", "NS")
    .maybeSingle()
  if (error) throw error
  return data
}

// =====================================================
// HANDLERS REALTIME
// =====================================================

async function handleOrderPaid(payload: any) {
  const storeId = String(payload.store_id)
  const orderId = String(payload.id)
  const couponCode = normalizeCoupon(payload.coupon)

  console.log(`💰 handleOrderPaid: Store ${storeId} | Order ${orderId} | Cupom: ${couponCode ?? "nenhum"}`)

  if (!couponCode) {
    console.log(`⏭️ Pedido ${orderId} sem cupom — ignorando.`)
    return
  }

  const store = await findStoreAndBusiness(storeId)
  if (!store) {
    console.warn(`⚠️ Store ${storeId} não encontrado. Ignorando.`)
    return
  }

  const { data: coupon, error: couponErr } = await supabase
    .from("coupons")
    .select("id, influencer_id")
    .eq("business_id", store.business_id)
    .eq("code", couponCode)
    .eq("is_active", true)
    .maybeSingle()

  if (couponErr) throw couponErr
  if (!coupon) {
    console.warn(`⚠️ Cupom "${couponCode}" não encontrado/ativo para business ${store.business_id}. Ignorando.`)
    return
  }

  const { error: upsertErr } = await supabase.from("orders").upsert(
    {
      business_id: store.business_id,
      store_id: storeId,
      store_type: "NS",
      internal_id: orderId,
      external_id: String(payload.number),
      coupon_id: coupon.id,
      influencer_id: coupon.influencer_id,
      total: payload.total != null ? Number(payload.total) : null,
      status: "paid",
      ordered_at: payload.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: "webhook",
    },
    { onConflict: "business_id,store_type,internal_id" },
  )
  if (upsertErr) throw upsertErr

  console.log(`✅ Pedido ${orderId} upsertado como PAID para business ${store.business_id}`)
}

async function handleOrderCancelled(payload: any) {
  const storeId = String(payload.store_id)
  const orderId = String(payload.id)
  console.log(`🚫 handleOrderCancelled: Store ${storeId} | Order ${orderId}`)

  const store = await findStoreAndBusiness(storeId)
  if (!store) {
    console.warn(`⚠️ Store ${storeId} não encontrado. Ignorando.`)
    return
  }

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("business_id", store.business_id)
    .eq("store_type", "NS")
    .eq("internal_id", orderId)

  if (error) throw error
  console.log(`🗑️ Pedido ${orderId} deletado (cancelled)`)
}

async function handleOrderVoided(payload: any) {
  const storeId = String(payload.store_id)
  const orderId = String(payload.id)
  console.log(`↩️ handleOrderVoided: Store ${storeId} | Order ${orderId}`)

  const store = await findStoreAndBusiness(storeId)
  if (!store) {
    console.warn(`⚠️ Store ${storeId} não encontrado. Ignorando.`)
    return
  }

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("business_id", store.business_id)
    .eq("store_type", "NS")
    .eq("internal_id", orderId)

  if (error) throw error
  console.log(`🗑️ Pedido ${orderId} deletado (voided)`)
}

async function handleAppUninstalled(payload: any) {
  const storeId = String(payload.store_id)
  console.log(`🗑️ handleAppUninstalled: Store ${storeId}`)

  const { error } = await supabase
    .from("stores")
    .update({
      access_token: null,
      refresh_token: null,
      is_synced: false,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId)
    .eq("store_type", "NS")

  if (error) throw error
  console.log(`✅ Store ${storeId} desconectado (tokens removidos)`)
}

// =====================================================
// HANDLERS SYNC
// =====================================================

async function handleStoreConnected(payload: any) {
  const { business_id, store_id } = payload
  console.log(`🚀 handleStoreConnected: Business ${business_id} | Store ${store_id}`)

  const cursorUrl = `${NS_API_BASE}/${store_id}/orders?per_page=200&created_at_min=${sixMonthsAgoISO()}`

  await enqueueEvent("sync_page", {
    business_id,
    store_id,
    cursor_url: cursorUrl,
    pages_done: 0,
    attempt: 0,
  })

  const { data: unsyncedCoupons, error } = await supabase
    .from("coupons")
    .select("id, code")
    .eq("business_id", business_id)
    .eq("is_synced", false)

  if (error) console.error(`❌ Erro ao buscar cupons não sincronizados:`, error)
  console.log(`🔎 ${unsyncedCoupons?.length ?? 0} cupons para sincronizar`)

  for (const coupon of unsyncedCoupons ?? []) {
    await enqueueEvent("sync_page", {
      business_id,
      store_id,
      cursor_url: cursorUrl,
      coupon_code: coupon.code,
      coupon_id: coupon.id,
      pages_done: 0,
      attempt: 0,
    })
  }
}

async function handleCouponCreated(payload: any) {
  const { business_id, coupon_code, coupon_id } = payload
  console.log(`🆕 handleCouponCreated: Business ${business_id} | Cupom ${coupon_code}`)

  const { data: store, error } = await supabase
    .from("stores")
    .select("store_id")
    .eq("business_id", business_id)
    .eq("store_type", "NS")
    .maybeSingle()

  if (error) throw error
  if (!store?.store_id) {
    console.warn(`⚠️ Loja NS não encontrada para o business ${business_id}. Abortando.`)
    return
  }

  const cursorUrl = `${NS_API_BASE}/${store.store_id}/orders?per_page=200&created_at_min=${sixMonthsAgoISO()}`

  await enqueueEvent("sync_page", {
    business_id,
    store_id: store.store_id,
    cursor_url: cursorUrl,
    coupon_code,
    coupon_id,
    pages_done: 0,
    attempt: 0,
  })
}

async function handleSyncPage(payload: any) {
  const { business_id, store_id, cursor_url } = payload
  console.log(`🔄 handleSyncPage: Business ${business_id} | ${cursor_url.split("?")[1] ?? cursor_url}`)

  const locked = await tryAdvisoryLock(business_id)
  if (!locked) {
    console.warn(`🔒 Business ${business_id} já em processamento. Re-agendando em 10s...`)
    await enqueueEvent("sync_page", { ...payload }, 10)
    return
  }

  try {
    const { data: store } = await supabase
      .from("stores")
      .select("access_token")
      .eq("business_id", business_id)
      .eq("store_type", "NS")
      .maybeSingle()

    if (!store?.access_token) {
      console.error(`❌ Token não encontrado para o business ${business_id}`)
      throw new Error("MISSING_TOKEN")
    }

    if (!(await allowRequestForStore(store_id))) {
      console.warn(`🚦 Rate limit para Store ${store_id}. Re-agendando...`)
      throw new Error("RATE_LIMIT")
    }

    const token = await decrypt(store.access_token)
    const res = await fetchWithTimeout(cursor_url, {
      headers: { Authentication: `bearer ${token}`, "Content-Type": "application/json" },
    })

    if (res.status === 429) throw new Error("RATE_LIMIT")
    if (!res.ok) throw new Error(`NS_FETCH_${res.status}`)

    const data = await res.json()
    const orders = Array.isArray(data) ? data : (data?.orders ?? [])
    console.log(`📦 ${orders.length} pedidos recebidos da API NS`)

    let couponQuery = supabase
      .from("coupons")
      .select("id, code, influencer_id")
      .eq("business_id", business_id)
      .eq("is_active", true)
    if (payload.coupon_code) couponQuery = couponQuery.eq("code", payload.coupon_code)
    const { data: coupons } = await couponQuery

    const couponMap = new Map((coupons ?? []).map((c) => [String(c.code).toUpperCase().trim(), c]))

    const batch: any[] = []
    for (const o of orders) {
      const code = normalizeCoupon(o.coupon)
      if (!code) continue
      const meta = couponMap.get(code)
      if (!meta) continue
      batch.push({
        business_id,
        store_id,
        store_type: "NS",
        internal_id: String(o.id),
        external_id: String(o.number),
        coupon_id: meta.id,
        influencer_id: meta.influencer_id,
        total: o.total != null ? Number(o.total) : null,
        status: o.status,
        ordered_at: o.created_at,
        updated_at: o.updated_at ?? new Date().toISOString(),
        source: "historical",
      })
    }

    if (batch.length > 0) {
      console.log(`💾 Upsert de ${batch.length} pedidos (sync)`)
      const { error: upsertErr } = await supabase
        .from("orders")
        .upsert(batch, { onConflict: "business_id,store_type,internal_id" })
      if (upsertErr) console.error(`❌ Erro no upsert:`, upsertErr)
    }

    const nextUrl = extractNextPage(res.headers.get("Link"))
    if (nextUrl) {
      console.log(`⏭️ Próxima página encontrada. Enfileirando...`)
      await enqueueEvent("sync_page", {
        ...payload,
        cursor_url: nextUrl,
        pages_done: (payload.pages_done ?? 0) + 1,
        attempt: 0,
      })
    } else {
      console.log(`✅ Sync finalizado para este job.`)
      if (payload.coupon_id) {
        await supabase.from("coupons").update({ is_synced: true }).eq("id", payload.coupon_id)
      } else {
        await supabase
          .from("stores")
          .update({ is_synced: true })
          .eq("business_id", business_id)
          .eq("store_type", "NS")
      }
    }
  } finally {
    await unlockAdvisoryLock(business_id)
  }
}

// =====================================================
// DISPATCH
// =====================================================
async function route(evt: QueueEvent) {
  console.log(`🎯 Roteando: [${evt.event}] (ID: ${evt.id})`)
  switch (evt.event) {
    // --- Realtime ---
    case "order_paid":       return handleOrderPaid(evt.raw_payload)
    case "order_cancelled":  return handleOrderCancelled(evt.raw_payload)
    case "order_voided":     return handleOrderVoided(evt.raw_payload)
    case "app_uninstalled":  return handleAppUninstalled(evt.raw_payload)
    // --- Sync ---
    case "store_connected":  return handleStoreConnected(evt.raw_payload)
    case "coupon_created":   return handleCouponCreated(evt.raw_payload)
    case "sync_page":        return handleSyncPage(evt.raw_payload)
    default:
      console.warn(`❓ Evento desconhecido: ${evt.event}`)
  }
}

async function processEvent(evt: QueueEvent) {
  const attempt = evt.raw_payload?.attempt ?? 0
  try {
    await route(evt)
    await supabase
      .from("webhook_events")
      .update({ status: "done", processed_at: new Date().toISOString() })
      .eq("id", evt.id)
    console.log(`✅ Evento ${evt.id} concluído.`)
  } catch (err: any) {
    console.error(`❌ Evento ${evt.id} (tentativa ${attempt}):`, err.message)
    if (attempt < MAX_ATTEMPTS && err.message !== "MISSING_TOKEN") {
      const delay = Math.min(60, Math.pow(2, attempt + 1))
      await enqueueEvent(evt.event, { ...evt.raw_payload, attempt: attempt + 1 }, delay)
      await supabase.from("webhook_events").update({ status: "done" }).eq("id", evt.id)
    } else {
      await supabase
        .from("webhook_events")
        .update({ status: "failed", error: err.message })
        .eq("id", evt.id)
    }
  }
}

// =====================================================
// SERVER
// =====================================================
Deno.serve(async () => {
  console.log("--- ⚡ NuvemShop-Processor invocado ---")

  const realtimeBatch = await pollEvents(BATCH_REALTIME, REALTIME_EVENTS)
  const syncBatch     = await pollEvents(BATCH_SYNC, SYNC_EVENTS)

  console.log(`📊 Fila: Realtime=${realtimeBatch.length} | Sync=${syncBatch.length}`)

  for (const evt of [...realtimeBatch, ...syncBatch]) {
    const { data } = await supabase
      .from("webhook_events")
      .update({ status: "processing" })
      .eq("id", evt.id)
      .eq("status", "pending")
      .select("id")
    if (data?.length) {
      await processEvent(evt)
    }
  }

  return new Response("ok")
})
