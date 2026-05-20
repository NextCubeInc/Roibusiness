import { createClient } from "https://esm.sh/@supabase/supabase-js"
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const NS_API_BASE = "https://api.tiendanube.com/2025-03"
const NS_RATE_LIMIT_PER_MINUTE = 40
const MAX_RUNTIME_MS = 100_000 // 100s — self-invoke antes do Supabase matar (~150s)

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

// ── Decrypt ──────────────────────────────────────────────────────────────────
function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}
async function importKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret))
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"])
}
async function decrypt(enc: string): Promise<string> {
  const secret = Deno.env.get("TOKEN_ENCRYPTION_KEY")
  if (!secret) throw new Error("Missing TOKEN_ENCRYPTION_KEY")
  const key = await importKey(secret)
  const combined = base64ToUint8Array(enc)
  const iv = combined.slice(0, 12)
  const cipher = combined.slice(12)
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher)
  return new TextDecoder().decode(plain)
}

// ── Normalize coupon ─────────────────────────────────────────────────────────
function normalizeCoupon(coupon: unknown): string | null {
  if (!coupon) return null
  if (Array.isArray(coupon)) return (coupon[0] as any)?.code?.toUpperCase()?.trim() ?? null
  if (typeof coupon === "object") return (coupon as any).code?.toUpperCase()?.trim() ?? null
  if (typeof coupon === "string") return coupon.toUpperCase().trim()
  return null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── Rate limit dinâmico via ns_rate_limits ───────────────────────────────────
async function getRateLimitedDelay(storeId: string): Promise<number> {
  const now = new Date()
  now.setSeconds(0, 0)
  const windowStart = now.toISOString()

  const { data } = await supabase
    .from("ns_rate_limits")
    .select("request_count")
    .eq("store_id", storeId)
    .eq("window_start", windowStart)
    .maybeSingle()

  const count = data?.request_count ?? 0
  const remaining = NS_RATE_LIMIT_PER_MINUTE - count

  if (remaining <= 3) {
    const msUntilNext = 60_000 - (Date.now() % 60_000)
    console.log(`Rate limit quase esgotado (${count}/${NS_RATE_LIMIT_PER_MINUTE}), aguardando ${msUntilNext}ms`)
    return msUntilNext + 500
  }

  const secondsLeft = Math.max(1, 60 - new Date().getSeconds())
  const delay = Math.max(1000, Math.floor((secondsLeft * 1000) / remaining))
  return Math.min(delay, 3000)
}

async function trackRequest(storeId: string): Promise<void> {
  const now = new Date()
  now.setSeconds(0, 0)
  const windowStart = now.toISOString()

  const { data } = await supabase
    .from("ns_rate_limits")
    .select("request_count")
    .eq("store_id", storeId)
    .eq("window_start", windowStart)
    .maybeSingle()

  const newCount = (data?.request_count ?? 0) + 1
  await supabase
    .from("ns_rate_limits")
    .upsert(
      { store_id: storeId, window_start: windowStart, request_count: newCount },
      { onConflict: "store_id,window_start" }
    )
}

// ── Self-invoke ───────────────────────────────────────────────────────────────
async function selfInvoke(jobId: string): Promise<void> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/NS-Debug-Coupon`
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId }),
  })
  console.log(`[${jobId}] Self-invoke disparado`)
}

// ── Scan ─────────────────────────────────────────────────────────────────────
async function runScan(jobId: string, storeId: string, targetCodes: string[], startUrl: string) {
  const runStart = Date.now()

  // Busca token + business_id da loja
  const { data: store } = await supabase
    .from("stores")
    .select("access_token, business_id")
    .eq("store_id", storeId)
    .eq("store_type", "NS")
    .maybeSingle()

  if (!store?.access_token || !store?.business_id) {
    await supabase.from("debug_scan_jobs").update({
      status: "error",
      error_msg: "Token ou business_id não encontrado",
      finished_at: new Date().toISOString(),
    }).eq("job_id", jobId)
    return
  }

  const businessId: string = store.business_id
  const token = await decrypt(store.access_token)
  const headers = {
    Authentication: `bearer ${token}`,
    "User-Agent": "RoiInfluencer-Debug (suporte@nextcube.com)",
    "Content-Type": "application/json",
  }

  // Pré-carrega os cupons alvo para evitar N+1 durante o scan
  const { data: couponRows } = await supabase
    .from("coupons")
    .select("id, influencer_id, code")
    .eq("business_id", businessId)
    .in("code", targetCodes)

  // Map: código normalizado -> { id, influencer_id }
  const couponMap = new Map(
    (couponRows ?? []).map((c) => [c.code.toUpperCase().trim(), c])
  )

  console.log(`[${jobId}] Cupons carregados: ${couponMap.size}/${targetCodes.length}`)

  // Carrega progresso atual do job
  const { data: job } = await supabase
    .from("debug_scan_jobs")
    .select("pages_scanned, total_orders_seen, orders_with_coupon, coupon_samples")
    .eq("job_id", jobId)
    .maybeSingle()

  let globalPages = job?.pages_scanned ?? 0
  let totalSeen = job?.total_orders_seen ?? 0
  let ordersWithCoupon = job?.orders_with_coupon ?? 0
  const couponSamples: any[] = job?.coupon_samples ?? []

  let url: string | null = startUrl

  while (url) {
    // ── Timeout iminente: salva cursor e self-invoca ─────────────────────────
    if (Date.now() - runStart > MAX_RUNTIME_MS) {
      console.log(`[${jobId}] Timeout iminente — salvando next_url e auto-invocando`)
      await supabase.from("debug_scan_jobs").update({
        next_url: url,
        pages_scanned: globalPages,
        total_orders_seen: totalSeen,
        orders_with_coupon: ordersWithCoupon,
        coupon_samples: couponSamples,
      }).eq("job_id", jobId)
      await selfInvoke(jobId)
      return
    }

    // ── Delay dinâmico pelo rate limit ───────────────────────────────────────
    if (globalPages > 0) {
      const delay = await getRateLimitedDelay(storeId)
      await sleep(delay)
    }

    console.log(`[${jobId}] Página ${globalPages}: ${url}`)

    // ── Fetch página ─────────────────────────────────────────────────────────
    let res: Response
    try {
      res = await fetch(url, { headers })
      await trackRequest(storeId)
    } catch (err: any) {
      await supabase.from("debug_scan_jobs").update({
        status: "error",
        error_msg: `Página ${globalPages}: ${err.message}`,
        pages_scanned: globalPages,
        total_orders_seen: totalSeen,
        orders_with_coupon: ordersWithCoupon,
        finished_at: new Date().toISOString(),
      }).eq("job_id", jobId)
      return
    }

    if (res.status === 429) {
      const wait = Number(res.headers.get("Retry-After") ?? 60) * 1000
      console.warn(`[${jobId}] Rate limit 429! Aguardando ${wait}ms`)
      await sleep(wait)
      continue
    }

    if (!res.ok) {
      await supabase.from("debug_scan_jobs").update({
        status: "error",
        error_msg: `HTTP ${res.status} na página ${globalPages}`,
        pages_scanned: globalPages,
        total_orders_seen: totalSeen,
        finished_at: new Date().toISOString(),
      }).eq("job_id", jobId)
      return
    }

    const data = await res.json()
    const orders: any[] = Array.isArray(data) ? data : (data?.orders ?? [])
    totalSeen += orders.length

    // ── Monta inserts para a tabela orders ───────────────────────────────────
    const inserts: any[] = []
    for (const o of orders) {
      const normalized = normalizeCoupon(o.coupon)

      if (o.coupon && couponSamples.length < 30) {
        if (normalized && !couponSamples.find((s: any) => s.code === normalized)) {
          couponSamples.push({ page: globalPages, code: normalized, raw: o.coupon })
          ordersWithCoupon++
        }
      }

      if (!normalized) continue
      if (!targetCodes.includes(normalized)) continue

      const coupon = couponMap.get(normalized)
      if (!coupon) {
        console.warn(`[${jobId}] Cupom "${normalized}" não encontrado no banco — pulando pedido ${o.id}`)
        continue
      }

      inserts.push({
        id: crypto.randomUUID(),
        business_id: businessId,
        influencer_id: coupon.influencer_id,
        coupon_id: coupon.id,
        internal_id: String(o.number),
        external_id: String(o.id),
        total: o.total != null ? Number(o.total) : null,
        status: o.payment_status ?? o.status ?? null,
        store_type: "NS",
        source: "scan",
        store_id: storeId,
        ordered_at: o.created_at ?? null,
      })
    }

    if (inserts.length > 0) {
      const { error } = await supabase
        .from("orders")
        .upsert(inserts, { onConflict: "business_id,store_type,internal_id" })

      if (error) {
        console.error(`[${jobId}] Erro ao inserir orders na página ${globalPages}:`, error.message)
      } else {
        console.log(`[${jobId}] Página ${globalPages}: ${inserts.length} orders salvos`)
      }
    }

    globalPages++

    // ── Atualiza progresso a cada 3 páginas ─────────────────────────────────
    if (globalPages % 3 === 0) {
      await supabase.from("debug_scan_jobs").update({
        pages_scanned: globalPages,
        total_orders_seen: totalSeen,
        orders_with_coupon: ordersWithCoupon,
        coupon_samples: couponSamples,
      }).eq("job_id", jobId)
    }

    // ── Próxima página via Link header ───────────────────────────────────────
    const linkHeader = res.headers.get("Link")
    let nextUrl: string | null = null
    if (linkHeader) {
      for (const part of linkHeader.split(",")) {
        if (part.includes('rel="next"')) {
          nextUrl = part.match(/<(.*?)>/)?.[1] ?? null
          break
        }
      }
    }
    url = nextUrl
  }

  // ── Finaliza job ─────────────────────────────────────────────────────────
  await supabase.from("debug_scan_jobs").update({
    status: "done",
    pages_scanned: globalPages,
    total_orders_seen: totalSeen,
    orders_with_coupon: ordersWithCoupon,
    coupon_samples: couponSamples,
    next_url: null,
    finished_at: new Date().toISOString(),
  }).eq("job_id", jobId)

  console.log(`[${jobId}] ✅ Scan completo: ${globalPages} páginas, ${totalSeen} pedidos`)
}

// ── Server ────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // GET: status do job
  if (req.method === "GET") {
    const url = new URL(req.url)
    const jobId = url.searchParams.get("job_id")
    if (!jobId) return new Response(JSON.stringify({ error: "Informe ?job_id=..." }), { status: 400 })

    const { data: job } = await supabase.from("debug_scan_jobs").select("*").eq("job_id", jobId).maybeSingle()

    // Busca os orders salvos referentes a este job (via coupon_codes do job)
    const targetCodes: string[] = job?.target_codes ?? []
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("store_id", job?.store_id)
      .in("coupon_id",
        (await supabase
          .from("coupons")
          .select("id")
          .in("code", targetCodes)
        ).data?.map((c: any) => c.id) ?? []
      )
      .order("ordered_at")

    const summary: Record<string, any> = {}
    for (const code of targetCodes) {
      const matched = (orders ?? []).filter((o: any) =>
        // agrupa por código via coupon_samples (aproximado) — a relação exata está no coupon_id
        o.coupon_id != null
      )
      summary[code] = {
        total_found: matched.length,
        oldest_order: matched[0]?.ordered_at ?? null,
        newest_order: matched[matched.length - 1]?.ordered_at ?? null,
        orders: matched,
      }
    }

    return new Response(JSON.stringify({ job, summary }, null, 2), {
      headers: { "Content-Type": "application/json" },
    })
  }

  const body = await req.json().catch(() => ({}))

  // POST com job_id: continuar job pausado
  if (body.job_id) {
    const { data: job } = await supabase
      .from("debug_scan_jobs")
      .select("*")
      .eq("job_id", body.job_id)
      .maybeSingle()

    if (!job) return new Response(JSON.stringify({ error: "Job não encontrado" }), { status: 404 })
    if (!job.next_url) return new Response(JSON.stringify({ error: "Job sem next_url — já finalizado ou nunca pausado" }), { status: 400 })

    const runtime = (globalThis as any).EdgeRuntime
    if (runtime?.waitUntil) {
      runtime.waitUntil(runScan(job.job_id, job.store_id, job.target_codes, job.next_url))
    } else {
      runScan(job.job_id, job.store_id, job.target_codes, job.next_url)
    }

    return new Response(JSON.stringify({
      message: `Continuando job ${job.job_id} a partir da página ${job.pages_scanned}`,
      job_id: job.job_id,
      resuming_from: job.next_url,
    }, null, 2), { headers: { "Content-Type": "application/json" } })
  }

  // POST novo job
  const storeId     = body.store_id    ?? "2819631"
  const targetCodes = (body.coupon_codes ?? []).map((c: string) => c.toUpperCase().trim())
  const startDate   = body.start_date  ?? new Date(Date.now() - 180 * 86400_000).toISOString()
  const startUrl    = `${NS_API_BASE}/${storeId}/orders?per_page=200&created_at_min=${encodeURIComponent(startDate)}`

  const jobId = `scan_${Date.now()}`

  await supabase.from("debug_scan_jobs").insert({
    job_id: jobId,
    store_id: storeId,
    target_codes: targetCodes,
    status: "running",
    next_url: startUrl,
  })

  const runtime = (globalThis as any).EdgeRuntime
  if (runtime?.waitUntil) {
    runtime.waitUntil(runScan(jobId, storeId, targetCodes, startUrl))
  } else {
    runScan(jobId, storeId, targetCodes, startUrl)
  }

  return new Response(JSON.stringify({
    job_id: jobId,
    message: `Scan iniciado! Consulte o status com GET ?job_id=${jobId}`,
    config: { store_id: storeId, target_codes: targetCodes, start_date: startDate },
  }, null, 2), { headers: { "Content-Type": "application/json" } })
})
