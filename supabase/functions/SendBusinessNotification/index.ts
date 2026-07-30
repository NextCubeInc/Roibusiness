// SendBusinessNotification
// Push notifications iniciadas pelo BUSINESS (dashboard web). Exige JWT do usuário business.
// Diferente das funções automáticas (CampaignNotification/InviteNotification/OrderNotification),
// que rodam com verify_jwt=false e recebem payload.record de um trigger.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100;

// Deep-link fixo: toque na notificação abre business-request na aba "notificacoes".
const DEEP_LINK = { type: "notificacao", screen: "business-request", tab: "notificacoes" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

type Target =
  | { type: "all" }
  | { type: "group"; groupId: string }
  | { type: "custom"; influencerIds: string[] };

type ExpoMessage = {
  title?: string | null;
  body: string;
  subtitle?: string | null;
  data?: Record<string, unknown> | null;
  priority?: "default" | "normal" | "high";
  ttl?: number | null;
  sound?: string | null;
  badge?: number | null;
  interruptionLevel?: string | null;
  mutableContent?: boolean;
  channelId?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "missing_token" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente com o JWT do usuário → identifica quem está chamando
    const authClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) return json({ ok: false, error: "invalid_token" }, 401);

    const businessId = user.id; // businesses.id = auth.uid()

    // Cliente com service role para leituras/escritas (bypassa RLS, mas SEMPRE filtramos por businessId)
    const db = createClient(url, service);

    // Confere role
    const { data: urow } = await db.from("users").select("role").eq("id", businessId).single();
    if (urow?.role !== "business") return json({ ok: false, error: "not_a_business" }, 403);

    // ── Valida body ──
    const payload = await req.json().catch(() => null);
    const target = payload?.target as Target | undefined;
    const message = payload?.message as ExpoMessage | undefined;
    if (!target || !message || !message.body?.trim()) {
      return json({ ok: false, error: "invalid_payload" }, 422);
    }

    // ── Resolve influencer_ids (sempre restrito a vínculos ativos do business) ──
    const { data: links } = await db
      .from("business_influencers")
      .select("influencer_id")
      .eq("business_id", businessId)
      .eq("status", "active");
    const activeIds = new Set((links ?? []).map((l) => l.influencer_id as string));

    let influencerIds: string[] = [];
    let audienceLabel = "";

    if (target.type === "all") {
      influencerIds = [...activeIds];
      audienceLabel = "Todos";
    } else if (target.type === "group") {
      // Garante que o grupo é do business
      const { data: group } = await db
        .from("influencer_groups")
        .select("id, name")
        .eq("id", target.groupId)
        .eq("business_id", businessId)
        .single();
      if (!group) return json({ ok: false, error: "group_not_found" }, 404);

      const { data: members } = await db
        .from("influencer_group_members")
        .select("influencer_id")
        .eq("group_id", target.groupId);
      influencerIds = (members ?? [])
        .map((m) => m.influencer_id as string)
        .filter((id) => activeIds.has(id));
      audienceLabel = `Grupo: ${group.name}`;
    } else if (target.type === "custom") {
      const requested = Array.isArray(target.influencerIds) ? target.influencerIds : [];
      influencerIds = requested.filter((id) => activeIds.has(id));
      audienceLabel = `${influencerIds.length} influencer${influencerIds.length === 1 ? "" : "s"}`;
    } else {
      return json({ ok: false, error: "invalid_target" }, 422);
    }

    // ── Tokens (multi-device) ──
    let tokens: string[] = [];
    if (influencerIds.length > 0) {
      const { data: tks } = await db
        .from("push_tokens")
        .select("expo_push_token")
        .in("user_id", influencerIds);
      tokens = [...new Set((tks ?? [])
        .map((t) => t.expo_push_token as string | null)
        .filter((t): t is string => !!t))];
    }
    const recipients = tokens.length;

    // ── Cota do plano (plans.max_push) ──
    const { data: biz } = await db
      .from("businesses")
      .select("plan_id, plans(max_push)")
      .eq("id", businessId)
      .single();
    // @ts-ignore relação aninhada
    const maxPush: number | null = biz?.plans?.max_push ?? null;

    // Cota é por NOTIFICAÇÃO enviada no mês (cada envio = 1), não por destinatário.
    if (maxPush && maxPush > 0) {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const { count: usedCount } = await db
        .from("business_notifications")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("sent_at", monthStart.toISOString());
      const used = usedCount ?? 0;
      if (used + 1 > maxPush) {
        return json({ ok: false, error: "quota_exceeded", used, limit: maxPush }, 402);
      }
    }

    // ── Data do push: força o deep-link (mescla extras do body, se houver) ──
    const data = { ...(message.data ?? {}), ...DEEP_LINK };

    // ── Envia em lotes ──
    let delivered = 0;
    let failed = 0;

    for (let i = 0; i < tokens.length; i += CHUNK) {
      const chunk = tokens.slice(i, i + CHUNK).map((to) => ({
        to,
        title: message.title ?? undefined,
        body: message.body,
        subtitle: message.subtitle ?? undefined,
        data,
        sound: message.sound === null ? undefined : (message.sound ?? "default"),
        ttl: message.ttl ?? undefined,
        priority: message.priority ?? "default",
        badge: message.badge ?? undefined,
        interruptionLevel: message.interruptionLevel ?? undefined,
        mutableContent: message.mutableContent ?? undefined,
        channelId: message.channelId ?? undefined,
      }));

      const resp = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });
      const result = await resp.json().catch(() => null);
      const tickets = Array.isArray(result?.data) ? result.data : [];
      for (const t of tickets) {
        if (t?.status === "ok") delivered++;
        else failed++;
      }
      // Se a request inteira falhou, conta todos como falha
      if (!resp.ok && tickets.length === 0) failed += chunk.length;
    }

    const status = recipients === 0 || delivered === 0
      ? "failed"
      : delivered === recipients
      ? "sent"
      : "partial";

    // ── Persiste resumo do envio (lado business) ──
    const { data: inserted, error: insErr } = await db
      .from("business_notifications")
      .insert({
        business_id: businessId,
        message: { ...message, data },
        audience_label: audienceLabel,
        recipients,
        delivered,
        failed,
        status,
      })
      .select("id")
      .single();
    if (insErr) console.error("Erro ao gravar histórico:", insErr);

    // ── Feed por influencer (o que o app do influencer exibe) ──
    // Uma linha por influencer alvo, independente de quantos devices/tokens ele tem.
    if (influencerIds.length > 0) {
      const feedRows = influencerIds.map((influencer_id) => ({
        influencer_id,
        business_id: businessId,
        notification_id: inserted?.id ?? null,
        title: message.title ?? null,
        body: message.body,
        data,
      }));
      const { error: feedErr } = await db.from("influencer_notifications").insert(feedRows);
      if (feedErr) console.error("Erro ao gravar feed do influencer:", feedErr);
    }

    return json({
      ok: true,
      notification_id: inserted?.id ?? null,
      recipients,
      delivered,
      failed,
      status,
    });
  } catch (err) {
    console.error("Erro na SendBusinessNotification:", err);
    return json({ ok: false, error: "internal_error" }, 500);
  }
});
