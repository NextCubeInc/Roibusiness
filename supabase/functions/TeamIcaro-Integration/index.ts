import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// =====================================================
// ENV
// =====================================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ICAROTOKEN = Deno.env.get("ICAROTOKEN");
const BUSINESS_ID = "0701a39d-b897-4ce5-b594-d19681f3c915";
const STORE_TYPE = "DOPPUS";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Log estruturado — permite filtrar/agregar no painel de logs
const log = (level: "info" | "warn" | "error", event: string, data: Record<string, unknown> = {}) =>
  console[level === "warn" ? "warn" : level === "error" ? "error" : "log"](
    JSON.stringify({ fn: "TeamIcaro-Integration", event, ...data }),
  );

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // ---------------------------------
    // AUTH
    // ---------------------------------
    if (!ICAROTOKEN) {
      log("error", "missing_env", { missing: "ICAROTOKEN" });
      return json({ success: false, message: "Server misconfigured" }, 500);
    }
    if (req.headers.get("apikey") !== ICAROTOKEN) {
      log("warn", "unauthorized");
      return new Response("Unauthorized Invalid Token", { status: 401 });
    }

    // ---------------------------------
    // PARSE BODY
    // ---------------------------------
    let payload: Record<string, any>;
    try {
      payload = await req.json();
    } catch {
      log("warn", "invalid_json");
      return json({ success: false, message: "Invalid JSON body" }, 400);
    }
    if (!payload || typeof payload !== "object") {
      return json({ success: false, message: "Invalid payload" }, 400);
    }

    if (payload.coupon === "TEAPOT" && payload.external_id === "TEAPOT") {
      log("info", "teapot", { payload });
      return new Response("I'm NOT a teapot 🫖", { status: 418 });
    }

    const status = String(payload.status ?? "").toUpperCase();
    const externalId = payload.external_id ?? null;
    const internalId = payload.internal_id != null ? String(payload.internal_id) : null;
    const storeId = payload.store_id ?? null;

    // ---------------------------------
    // VALIDAR CUPOM (sem lançar TypeError)
    // ---------------------------------
    const rawCoupon = typeof payload.coupon === "string" ? payload.coupon.trim() : "";
    if (!rawCoupon) {
      // Venda sem cupom: não é erro, é venda orgânica. ACK para não gerar retry.
      log("info", "no_coupon", { external_id: externalId, internal_id: internalId, status });
      return json({ success: true, message: "Ignored: no coupon", ignored: true }, 200);
    }
    const couponCode = rawCoupon.toUpperCase();

    // ---------------------------------
    // BUSCAR CUPOM
    // ---------------------------------
    const { data: coupon, error: couponError } = await supabase
      .from("coupons")
      .select("id, influencer_id")
      .eq("code", couponCode)
      .eq("business_id", BUSINESS_ID)
      .maybeSingle();

    if (couponError) {
      log("error", "coupon_query_failed", {
        coupon: couponCode,
        external_id: externalId,
        code: couponError.code,
        message: couponError.message,
      });
      return json({ success: false, message: "Database error" }, 500);
    }

    if (!coupon) {
      // Cupom não pertence a este business (ou não cadastrado).
      // ACK 200 de propósito: 404 faz a Doppus reenviar o mesmo webhook indefinidamente.
      log("warn", "coupon_not_registered", {
        coupon: couponCode,
        external_id: externalId,
        internal_id: internalId,
        status,
      });
      return json(
        { success: true, message: `Ignored: coupon not registered (${couponCode})`, ignored: true },
        200,
      );
    }

    // ---------------------------------
    // PAID
    // ---------------------------------
    if (status === "PAID") {
      if (!externalId || !internalId) {
        log("error", "paid_missing_ids", { coupon: couponCode, external_id: externalId, internal_id: internalId });
        return json({ success: false, message: "Missing external_id/internal_id" }, 400);
      }

      const total = Number(payload.net_value);
      if (!Number.isFinite(total)) {
        log("error", "paid_invalid_total", { external_id: externalId, net_value: payload.net_value });
        return json({ success: false, message: "Invalid net_value" }, 400);
      }

      // upsert → idempotente. Reenvios do mesmo pedido não viram 23505/500.
      const { error: insertError } = await supabase
        .from("orders")
        .upsert(
          {
            business_id: BUSINESS_ID,
            influencer_id: coupon.influencer_id,
            coupon_id: coupon.id,
            internal_id: internalId,
            external_id: externalId,
            total,
            status: "open",
            store_type: payload.origin ?? STORE_TYPE,
            source: payload.origin ?? STORE_TYPE,
            store_id: storeId,
            ordered_at: payload.created_at ?? new Date().toISOString(),
          },
          { onConflict: "business_id,external_id", ignoreDuplicates: false },
        );

      if (insertError) {
        log("error", "order_upsert_failed", {
          external_id: externalId,
          internal_id: internalId,
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
        });
        return json({ success: false, message: "Failed to insert order" }, 500);
      }

      log("info", "order_saved", { external_id: externalId, internal_id: internalId, coupon: couponCode, total });
      return json({ success: true, message: "Order saved" }, 200);
    }

    // ---------------------------------
    // REFUNDED
    // ---------------------------------
    if (status === "REFUNDED") {
      if (!externalId) {
        log("error", "refund_missing_external_id", { internal_id: internalId });
        return json({ success: false, message: "Missing external_id" }, 400);
      }

      // Sem filtro por store_id: se o payload vier com store_id diferente do
      // gravado, o update casava 0 linhas e a função respondia 200 silenciosamente.
      const { data: updated, error: updateError } = await supabase
        .from("orders")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("business_id", BUSINESS_ID)
        .eq("external_id", externalId)
        .select("id");

      if (updateError) {
        log("error", "refund_update_failed", {
          external_id: externalId,
          code: updateError.code,
          message: updateError.message,
        });
        return json({ success: false, message: "Failed to update order" }, 500);
      }

      if (!updated || updated.length === 0) {
        // Estorno de um pedido que nunca chegou (webhook de PAID perdido).
        log("warn", "refund_no_match", { external_id: externalId, internal_id: internalId, coupon: couponCode });
        return json({ success: true, message: "Refund: no matching order", ignored: true }, 200);
      }

      log("info", "order_refunded", { external_id: externalId, rows: updated.length });
      return json({ success: true, message: "Order refunded" }, 200);
    }

    // ---------------------------------
    // OUTROS STATUS
    // ---------------------------------
    log("info", "status_ignored", { status, external_id: externalId, coupon: couponCode });
    return json({ success: true, message: `Ignored status: ${status}`, ignored: true }, 200);
  } catch (err) {
    log("error", "unhandled", { message: err instanceof Error ? err.message : String(err) });
    return json({ success: false, message: "Internal Server Error" }, 500);
  }
});
