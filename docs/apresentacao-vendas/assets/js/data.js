/* Dados fictícios e "banco" em memória compartilhado pelas demos.
   Nada aqui acessa rede: pedidos são gerados com semente fixa, relativos à data de hoje. */
(function () {
  /* ---------- utilidades ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20261026);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  function weighted(items, w) {
    const total = items.reduce((s, it) => s + w(it), 0);
    let r = rnd() * total;
    for (const it of items) { r -= w(it); if (r <= 0) return it; }
    return items[items.length - 1];
  }

  const fmt = {
    brl: (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    brlShort: (v) => v >= 1000 ? "R$ " + (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: v >= 100000 ? 0 : 1 }) + "K" : fmt.brl(v),
    num: (v) => (v || 0).toLocaleString("pt-BR"),
    ddmm: (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    ddmmyyyy: (d) => d.toLocaleDateString("pt-BR"),
    dmh: (d) => {
      const m = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      return `${String(d.getDate()).padStart(2, "0")} ${m}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    },
    longDate: (d) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" }),
    longDateTime: (d) => fmt.longDate(d) + ", " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    dMonY: (d) => {
      const m = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      return `${String(d.getDate()).padStart(2, "0")} ${m} ${d.getFullYear()}`;
    },
    ym: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    initials: (name) => {
      const p = (name || "?").trim().split(/\s+/);
      return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase();
    },
    rel: (d) => {
      const s = Math.round((Date.now() - d.getTime()) / 1000);
      if (s < 60) return "agora";
      if (s < 3600) return `há ${Math.round(s / 60)} min`;
      if (s < 86400) return `há ${Math.round(s / 3600)} h`;
      return fmt.ddmm(d);
    },
  };

  /* ---------- empresa e influenciadores ---------- */
  const params = new URLSearchParams(location.search);
  const business = {
    id: "b1",
    name: params.get("empresa") || "Aurora Fit",
    email: "contato@aurorafit.com.br",
    instagram: "@aurorafit",
    phone: "(47) 99812-4410",
    site: "aurorafit.com.br",
    plan: "roi-pro",
  };
  business.initials = fmt.initials(business.name);

  const AVATAR_COLORS = ["#7c3aed", "#db2777", "#0891b2", "#ea580c", "#16a34a", "#2563eb", "#c026d3", "#ca8a04", "#0d9488", "#dc2626", "#4f46e5", "#9333ea"];
  const influencers = [
    ["Camila Ferreira", "@camilafer", "CAMILA10", 10, 18.45, 48210, 23, "ios"],
    ["Lucas Mendes", "@lucasm", "LUCAS15", 15, 15.2, 31870, 17, "android"],
    ["Beatriz Santos", "@biasantos", "BIA20", 15, 12.8, 27440, 14, "ios"],
    ["Rafael Costa", "@rafacosta", "RAFA10", 10, 11.3, 22105, 12, "ios"],
    ["Juliana Alves", "@jualves", "JU15", 15, 9.87, 19830, 11, "android"],
    ["Thiago Ribeiro", "@thiagor", "THIAGO10", 10, 8.45, 15420, 9, "ios"],
    ["Mariana Oliveira", "@marioli", "MARI20", 20, 7.2, 12960, 8, null],
    ["Pedro Nascimento", "@pedron", "PEDRO10", 10, 5.93, 9870, 6, "android"],
    ["Ana Clara Lima", "@anaclara", "ANA15", 15, 4.2, 7310, 4, "ios"],
    ["Gabriel Souza", "@gabsouza", "GABI10", 10, 3.8, 5240, 3, null],
  ].map(([name, handle, code, pct, weight, followers, posts, platform], i) => ({
    id: "i" + (i + 1), name, instagram: handle, weight, followers, posts, platform,
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    coupons: [{ id: "c" + (i + 1), code, active: true, pct, periods: [{ id: "p" + (i + 1), pct, from: null, to: null }] }],
  }));
  // Camila tem um segundo cupom com comissão de Black Friday programada
  influencers[0].coupons.push({
    id: "c11", code: "CAMILABF", active: false, pct: 15,
    periods: [{ id: "p11", pct: 15, from: new Date(2026, 10, 20), to: new Date(2026, 10, 30) }],
  });

  const pendingInvites = [
    { id: "x1", name: "Fernanda Guimarães", instagram: "@fernandagui", invitedAt: new Date(Date.now() - 2 * 864e5) },
    { id: "x2", name: "Diego Martins", instagram: "@diegomartins", invitedAt: new Date(Date.now() - 5 * 864e5) },
  ];
  const invitePool = [
    { name: "Larissa Moura", instagram: "@lari.moura", followers: 36400 },
    { name: "Bruno Teixeira", instagram: "@brunotx", followers: 18200 },
    { name: "Helena Prado", instagram: "@helenaprado", followers: 51200 },
  ];

  /* ---------- pedidos (12 meses, crescendo todo mês) ---------- */
  const now = new Date();
  const PRICES = [89.9, 119.9, 149.9, 169.9, 199.9, 229.9, 249.9, 279.9, 319.9, 359.9];
  const orders = [];
  let extId = 54000;
  function makeOrder(at, inf, opts = {}) {
    const coupon = inf.coupons.find((c) => c.active) || inf.coupons[0];
    const qty = weighted([1, 2, 3], (q) => (q === 1 ? 8 : q === 2 ? 2 : 0.5));
    const total = opts.total || Math.round((pick(PRICES) * qty + (rnd() < 0.3 ? 19.9 : 0)) * 100) / 100;
    const status = opts.status || (rnd() < 0.035 ? pick(["cancelled", "refunded"]) : rnd() < 0.08 ? "open" : "paid");
    const commission = Math.round(total * coupon.pct) / 100;
    return { id: "o" + extId, ext: "#" + extId++, at, infId: inf.id, coupon: coupon.code, platform: "Nuvemshop", total, commission, status };
  }
  for (let m = 11; m >= 0; m--) {
    const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const lastDay = m === 0 ? now.getDate() : daysInMonth;
    const count = Math.round(50 * Math.pow(1.13, 11 - m) * (lastDay / daysInMonth) * (m === 0 ? 1.35 : 1) * (0.92 + rnd() * 0.16));
    for (let k = 0; k < count; k++) {
      const day = 1 + Math.floor(rnd() * lastDay);
      const hour = weighted([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], (h) => (h >= 19 && h <= 22 ? 3 : h >= 12 ? 2 : 1));
      const at = new Date(start.getFullYear(), start.getMonth(), day, hour, Math.floor(rnd() * 60));
      if (at > now) at.setTime(now.getTime() - rnd() * 6 * 3600e3);
      orders.push(makeOrder(at, weighted(influencers, (i) => i.weight)));
    }
  }
  orders.sort((a, b) => b.at - a.at);

  /* ---------- campanhas ---------- */
  const campaigns = [
    {
      id: "k1", name: "Outubro Rosa — Desafio de vendas", description: "Quem vender mais até o fim do mês leva os prêmios.",
      start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0), status: "active",
      prizes: [
        { from: 1, to: 1, type: "valor", value: "R$ 500", title: "Campeã de vendas" },
        { from: 2, to: 3, type: "porcentagem", value: "10%", title: "Bônus de comissão" },
        { from: 4, to: 5, type: "frete", value: "Frete grátis", title: "Frete grátis" },
      ],
      participants: influencers.slice(0, 8).map((i) => i.id),
    },
    {
      id: "k2", name: "Lançamento Coleção Verão", description: "Coleção nova, cupom novo.",
      start: new Date(now.getFullYear(), now.getMonth() - 1, 10), end: new Date(now.getFullYear(), now.getMonth() - 1, 30), status: "finished",
      prizes: [
        { from: 1, to: 1, type: "produto", value: "Kit exclusivo", title: "Kit exclusivo" },
        { from: 2, to: 3, type: "valor", value: "R$ 200", title: "Prêmio em dinheiro" },
      ],
      participants: influencers.map((i) => i.id),
    },
  ];

  /* ---------- notificações ---------- */
  const groups = [{ id: "g1", name: "Top 5", ids: influencers.slice(0, 5).map((i) => i.id) }];
  const notifHistory = [
    { id: "n2", at: new Date(Date.now() - 3 * 864e5), title: "Campanha Outubro Rosa no ar 🎀", body: "Quem vender mais até dia 31 ganha R$ 500. Bora?", audience: "Todos", recipients: 8, delivered: 8, failed: 0, status: "sent" },
    { id: "n1", at: new Date(Date.now() - 12 * 864e5), title: "Coleção Verão chegou", body: "Use seu cupom nos stories hoje: 15% de desconto para seguidores.", audience: "Grupo: Top 5", recipients: 5, delivered: 4, failed: 1, status: "partial" },
  ];

  /* ---------- eventos ---------- */
  const listeners = {};
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
  function emit(evt, payload) { (listeners[evt] || []).forEach((fn) => fn(payload)); }

  /* ---------- consultas (mesma forma das RPCs reais) ---------- */
  const isValid = (o) => o.status === "paid" || o.status === "open";
  const byId = (id) => influencers.find((i) => i.id === id);

  function kpis() {
    const valid = orders.filter(isValid);
    const total_sales = valid.reduce((s, o) => s + o.total, 0);
    const total_commission = valid.filter((o) => o.status === "paid").reduce((s, o) => s + o.commission, 0);
    return {
      total_orders: valid.length, total_sales, total_commission,
      avg_ticket: valid.length ? total_sales / valid.length : 0,
      roi: total_commission ? total_sales / total_commission : 0,
      active_influencers: influencers.length,
    };
  }
  function salesByDay(days) {
    const out = [];
    for (let d = days - 1; d >= 0; d--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
      const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      const os = orders.filter((o) => isValid(o) && o.at >= day && o.at < next);
      out.push({ label: fmt.ddmm(day), total: os.reduce((s, o) => s + o.total, 0), count: os.length });
    }
    return out;
  }
  function salesByMonth(months) {
    const out = [];
    for (let m = months - 1; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      const os = orders.filter((o) => isValid(o) && o.at >= start && o.at < end);
      out.push({ label: fmt.ym(start), total: os.reduce((s, o) => s + o.total, 0), count: os.length });
    }
    return out;
  }
  function ranking(filter) {
    const rows = influencers.map((inf) => {
      const os = orders.filter((o) => o.infId === inf.id && isValid(o) && (!filter || filter(o)));
      return {
        inf, total_orders: os.length,
        total_sales: os.reduce((s, o) => s + o.total, 0),
        total_commission: os.filter((o) => o.status === "paid").reduce((s, o) => s + o.commission, 0),
      };
    });
    return rows.sort((a, b) => b.total_sales - a.total_sales);
  }
  function monthStats(year, month) {
    const start = new Date(year, month, 1), end = new Date(year, month + 1, 1);
    return ranking((o) => o.at >= start && o.at < end);
  }

  /* ---------- simulação de venda ---------- */
  function simulateSale(opts = {}) {
    const inf = opts.infId ? byId(opts.infId) : weighted(influencers, (i) => (i.id === "i1" ? 30 : i.weight));
    const o = makeOrder(new Date(), inf, { status: "paid" });
    orders.unshift(o);
    emit("order", o);
    return o;
  }

  window.MOCK = {
    fmt, business, influencers, pendingInvites, invitePool, orders, campaigns, groups, notifHistory,
    on, emit, kpis, salesByDay, salesByMonth, ranking, monthStats, simulateSale, byId, isValid, now, rnd,
  };
})();
