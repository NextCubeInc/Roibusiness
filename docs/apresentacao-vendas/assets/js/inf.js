/* App do influenciador (réplica offline da v2.1.0). Usuária logada: a 1ª influenciadora do MOCK.
   As vendas dela na empresa da demo vêm do mesmo MOCK do painel; as outras marcas são locais. */
(function () {
  const M = window.MOCK, f = M.fmt, I = window.icon;
  const ME = M.influencers[0];
  const LEVELS = [
    { level: 1, name: "Bronze", short: "Bronze", color: "#CD7F32", min: 0 },
    { level: 2, name: "Prata", short: "Prata", color: "#C0C0C0", min: 100000 },
    { level: 3, name: "Ouro", short: "Ouro", color: "#FFD700", min: 250000 },
    { level: 4, name: "Platina", short: "Plat.", color: "#E5E4E2", min: 500000 },
    { level: 5, name: "Diamante", short: "Diam.", color: "#B9F2FF", min: 1000000 },
    { level: 6, name: "Elite", short: "Elite", color: "#8b5cf6", min: 2000000 },
  ];
  const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const MON_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const formatSales = (v) => (v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}K` : f.brl(v));
  const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const valid = (o) => o.status === "paid" || o.status === "open";
  const now = () => new Date();

  /* ---------- dados da influenciadora ---------- */
  const BRANDS = [
    { id: "b1", name: M.business.name, site: M.business.site, color: "#a21caf", live: true },
    { id: "b2", name: "Vitta Nutri", site: "vittanutri.com.br", color: "#15803d", coupons: [{ code: "CAMILA15", pct: 15 }] },
    { id: "b3", name: "Bella Pele", site: "bellapele.com.br", color: "#be185d", coupons: [{ code: "CAMIVIP", pct: 12 }] },
  ];
  const brand = (id) => BRANDS.find((b) => b.id === id);
  const brandCoupons = (b) => (b.live ? ME.coupons.map((c) => c.code) : (b.coupons || []).map((c) => c.code));

  const local = [];
  (function genOthers() {
    const today = M.now;
    [["b2", 4, 1.1, [69.9, 89.9, 119.9, 159.9]], ["b3", 3, 1.12, [59.9, 99.9, 139.9, 189.9]]].forEach(([bid, base, g, prices]) => {
      const b = brand(bid), c = b.coupons[0];
      for (let m = 11; m >= 0; m--) {
        const start = new Date(today.getFullYear(), today.getMonth() - m, 1);
        const dim = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        const last = m === 0 ? today.getDate() : dim;
        const n = Math.round(base * Math.pow(g, 11 - m) * (last / dim) * (m === 0 ? 1.35 : 1));
        for (let k = 0; k < n; k++) {
          const at = new Date(start.getFullYear(), start.getMonth(), 1 + Math.floor(M.rnd() * last), 9 + Math.floor(M.rnd() * 14), Math.floor(M.rnd() * 60));
          if (at > today) at.setTime(today.getTime() - M.rnd() * 5 * 3600e3);
          const total = prices[Math.floor(M.rnd() * prices.length)] * (M.rnd() < 0.2 ? 2 : 1);
          local.push({ id: "l" + local.length, at, brand: bid, coupon: c.code, total, commission: Math.round(total * c.pct) / 100, status: M.rnd() < 0.04 ? "cancelled" : "paid" });
        }
      }
    });
  })();
  function myOrders() {
    const mine = M.orders.filter((o) => o.infId === ME.id).map((o) => ({ ...o, brand: "b1" }));
    return mine.concat(local).sort((a, b) => b.at - a.at);
  }
  // volume histórico anterior à janela de 12 meses, para a demo começar perto do Prata
  const BASE = Math.max(0, 99050 - myOrders().filter(valid).reduce((s, o) => s + o.total, 0));
  function levelInfo() {
    const total = BASE + myOrders().filter(valid).reduce((s, o) => s + o.total, 0);
    let cur = LEVELS[0];
    LEVELS.forEach((l) => { if (total >= l.min) cur = l; });
    const next = LEVELS.find((l) => l.level === cur.level + 1);
    const progress = next ? Math.round(((total - cur.min) / (next.min - cur.min)) * 1000) / 10 : 100;
    return { total, cur, next, progress, remaining: next ? next.min - total : 0 };
  }

  const shared = {
    invites: [{ id: "q1", name: "Lumi Cosméticos", site: "lumicosmeticos.com.br" }, { id: "q2", name: "Nórdica Café", site: "nordicacafe.com.br" }],
    notifs: [
      { id: "m1", brand: "Bella Pele", title: "Ranking atualizado", body: "Você subiu para o 2º lugar no Desafio Bella Pele. Faltam 40 pts para o topo!", at: new Date(Date.now() - 2 * 3600e3), read: false },
      ...M.notifHistory.filter((n) => n.audience === "Todos").map((n) => ({ id: n.id, brand: M.business.name, title: n.title, body: n.body, at: n.at, read: true })),
    ],
    pushOn: true,
  };
  const STATIC_CAMPAIGNS = [
    { id: "s1", name: "Black Friday Vitta", brand: "b2", status: "active", start: new Date(M.now.getFullYear(), M.now.getMonth() + 1, 1), end: new Date(M.now.getFullYear(), M.now.getMonth() + 2, 0), commission: 0,
      ranking: ["@camilafer", "@anafit", "@lucasmove", "@bia.skin", "@rafa.run", "@juli.wellness"].map((h) => [h, 0]),
      prizes: [{ from: 1, to: 1, title: "1º lugar", type: "valor", value: "R$ 2.000,00" }, { from: 2, to: 3, title: "Pódio", type: "valor", value: "R$ 500,00" }, { from: 4, to: 10, title: "Top 10", type: "produto", value: "Kit de produtos" }] },
    { id: "s2", name: "Desafio Bella Pele", brand: "b3", status: "active", start: new Date(M.now.getFullYear(), M.now.getMonth(), 1), end: new Date(M.now.getFullYear(), M.now.getMonth() + 1, 0), commission: 312.4,
      ranking: [["@bia.skin", 413.6], ["@camilafer", 312.4], ["@anafit", 288.1], ["@lu.makes", 201.9], ["@pri.glow", 166.0], ["@nat.oliveira", 98.3], ["@carolzinha", 54.7]],
      prizes: [{ from: 1, to: 1, title: "1º lugar", type: "valor", value: "R$ 1.000,00" }, { from: 2, to: 5, title: "Top 5", type: "produto", value: "Kit skincare completo" }] },
  ];
  function myCampaigns() {
    const live = M.campaigns.filter((c) => c.participants.includes(ME.id)).map((c) => {
      const win = (o) => o.at >= c.start && o.at <= new Date(c.end.getTime() + 864e5 - 1);
      const rank = M.ranking(win).filter((r) => c.participants.includes(r.inf.id)).sort((a, b) => b.total_commission - a.total_commission);
      const mine = rank.find((r) => r.inf.id === ME.id);
      return { id: c.id, name: c.name, brand: "b1", status: c.status, start: c.start, end: c.end, commission: mine ? mine.total_commission : 0,
        ranking: rank.map((r) => [r.inf.instagram, r.total_commission]), prizes: c.prizes };
    });
    return live.concat(STATIC_CAMPAIGNS);
  }
  const pts = (x) => ((x * 9) / 5.67 * 0.25).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " pts";
  function shownStatus(c) {
    if ((c.status === "active" || c.status === "paused") && c.end && new Date(c.end.getTime() + 864e5) < now()) return "finished";
    return c.status;
  }
  const PILL = { active: ["Ativa", "#10b981", "rgba(16,185,129,.12)"], draft: ["Rascunho", "#9898a8", "rgba(152,152,168,.10)"], paused: ["Pausada", "#facc15", "rgba(250,204,21,.10)"], finished: ["Encerrada", "#f87171", "rgba(248,113,113,.10)"], cancelled: ["Cancelada", "#f87171", "rgba(248,113,113,.10)"] };

  const ava = (name, size, opts = {}) => `<span class="ava" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.34)}px;${opts.bg ? `background:${opts.bg};` : ""}${opts.fg ? `color:${opts.fg};` : ""}${opts.radius ? `border-radius:${opts.radius}px;` : ""}${opts.ring ? `box-shadow:0 0 0 2px var(--bg),0 0 0 4px ${opts.ring};` : ""}">${f.initials(name)}</span>`;
  const brandAva = (b, size, radius) => ava(b.name, size, { bg: b.color, radius });

  /* ---------- instância ---------- */
  window.InfApp = function (host, opts = {}) {
    const st = { tab: opts.start || "dashboard", stack: [], period: "today", month: null, bperiod: "month", bmonth: null, reqTab: "solicitacoes", highlight: null, prevHero: null };
    const root = document.createElement("div");
    root.className = "inf";
    host.appendChild(root);
    root.innerHTML = `
      <div class="status"><span class="clock"></span><span class="sys">
        <svg viewBox="0 0 18 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
        <svg viewBox="0 0 16 12" fill="#fff"><path d="M8 2.6c2.2 0 4.2.8 5.7 2.2l1.2-1.3C13 1.7 10.6.8 8 .8S3 1.7 1.1 3.5l1.2 1.3C3.8 3.4 5.8 2.6 8 2.6Zm0 3.4c1.3 0 2.5.5 3.4 1.3l1.2-1.3C11.4 4.9 9.8 4.2 8 4.2s-3.4.7-4.6 1.8l1.2 1.3C5.5 6.5 6.7 6 8 6Zm0 3.3c.5 0 1 .2 1.3.5L8 11.2 6.7 9.8c.3-.3.8-.5 1.3-.5Z"/></svg>
        <svg viewBox="0 0 27 12"><rect x=".5" y=".5" width="23" height="11" rx="3.5" fill="none" stroke="rgba(255,255,255,.4)"/><rect x="2" y="2" width="17" height="8" rx="2" fill="#fff"/><rect x="24.5" y="4" width="1.5" height="4" rx=".75" fill="rgba(255,255,255,.4)"/></svg></span></div>
      <div class="nav"></div><div class="scroll"></div>
      <nav class="tabbar">${[["dashboard", "Dashboard", "house"], ["business", "Business", "building-2"], ["vendas", "Vendas", "package"], ["campanhas", "Campanhas", "trophy"]].map(([id, l, ic]) => `<button data-a="tab" data-v="${id}">${I(ic, "", 2.2)}<span>${l}</span></button>`).join("")}</nav>
      <div class="layer"></div>
      <div class="push" data-a="pushtap"><img src="assets/img/logo.png" alt=""><div style="flex:1;min-width:0"><div class="t"><span class="pt">ROInfluencer</span><small>agora</small></div><div class="b"></div></div></div>`;
    const nav = root.querySelector(".nav"), scroll = root.querySelector(".scroll"), layer = root.querySelector(".layer"), push = root.querySelector(".push");
    const clock = root.querySelector(".clock");
    const tick = () => (clock.textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    tick(); setInterval(tick, 30000);

    function screen() { return st.stack.length ? st.stack[st.stack.length - 1] : { id: st.tab }; }
    function render(keep, anim) {
      const top = scroll.scrollTop;
      const s = screen();
      root.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.v === st.tab));
      const pushed = st.stack.length > 0;
      const unread = shared.invites.length;
      nav.innerHTML = pushed
        ? `<button class="back" data-a="back" aria-label="Voltar">${I("chevron-left", "", 2.4)}</button><span class="title">${esc(s.title || "")}</span>${s.id === "ranking" ? `<span class="capsule"><button data-a="prizes" aria-label="Prêmios">${I("trophy")}</button></span>` : ""}`
        : `<span class="capsule"><button data-a="requests" aria-label="Solicitações">${I("bell", "", 1.75)}${unread ? `<span class="bdg">${unread > 9 ? "9+" : unread}</span>` : ""}</button><button data-a="profile" aria-label="Perfil">${I("user", "", 1.75)}</button></span>`;
      scroll.innerHTML = `<div class="${anim ? "fade-in" : ""}">${SCREENS[s.id](s)}</div>`;
      scroll.scrollTop = keep ? top : 0;
      afterRender(s);
    }

    /* S06 Dashboard */
    function dashboard() {
      const os = myOrders(), today = M.now;
      const y = today.getFullYear(), m = today.getMonth();
      const inM = (o, k) => o.at.getFullYear() === new Date(y, m - k, 1).getFullYear() && o.at.getMonth() === new Date(y, m - k, 1).getMonth();
      const sumC = (arr) => arr.reduce((s, o) => s + o.commission, 0);
      const cur = os.filter((o) => valid(o) && inM(o, 0)), prev = os.filter((o) => valid(o) && inM(o, 1));
      const p3 = [1, 2, 3].map((k) => os.filter((o) => valid(o) && inM(o, k)));
      const prospC = p3.reduce((s, a) => s + sumC(a), 0) / 3, prospN = Math.round(p3.reduce((s, a) => s + a.length, 0) / 3);
      const curC = sumC(cur), prevC = sumC(prev);
      const varPct = prevC ? Math.round(((curC - prevC) / prevC) * 10000) / 100 : null;
      st.heroVal = curC;
      return `<div class="pad">
        <div class="eyebrow">Mês atual</div><div class="hero" data-hero>${f.brl(curC)}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:8px">${varPct !== null ? `<span class="badge-var ${varPct >= 0 ? "up" : "down"}">${I(varPct >= 0 ? "trending-up" : "trending-down")}${varPct >= 0 ? "+" : ""}${varPct}%</span>` : ""}<span class="meta">${plural(cur.length, "venda", "vendas")}</span></div>
        <div class="cards2" style="margin-top:12px">
          <div class="stat"><span class="l">Mês anterior</span><span class="v">${f.brl(prevC)}</span><span class="meta">${plural(prev.length, "venda", "vendas")}</span></div>
          <div class="stat"><span class="l">Prospecção próx. mês</span><span class="v">${f.brl(prospC)}</span><span class="meta">${plural(prospN, "venda", "vendas")}</span></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:28px"><span class="h-sec">Vendas Recentes</span><button data-a="tab" data-v="vendas" style="color:var(--purple-lt);font-size:13px;font-weight:600;display:flex;align-items:center;gap:2px">Ver todas${I("chevron-right").replace('class="ic ', 'style="width:15px;height:15px" class="ic ')}</button></div>
        <div>${os.slice(0, 5).map((o) => saleRow(o, "ddmm")).join("") || '<div class="meta" style="padding:16px 0">Nenhuma venda recente.</div>'}</div></div>`;
    }
    function saleRow(o, dfmt) {
      const b = brand(o.brand), bad = !valid(o);
      return `<button class="rowi ${bad ? "cancel" : ""} ${st.highlight === o.id ? "new" : ""}" data-a="sale" data-v="${o.id}">${brandAva(b, 44)}
        <span class="main"><div class="name">${esc(b.name)}</div><div style="display:flex;gap:8px;align-items:center">${bad ? `<span class="chip red">${o.status}</span>` : `<span class="chip">${o.coupon}</span>`}<span style="font-size:10px;font-weight:500;color:var(--sub)">${dfmt === "ddmm" ? f.ddmm(o.at) : f.ddmmyyyy(o.at)}</span></div></span>
        <span class="val">${bad ? f.brl(o.commission) : "+" + f.brl(o.commission)}</span></button>`;
    }

    /* S08 Vendas */
    function periodOrders() {
      const os = myOrders(), t = M.now;
      if (st.month) return os.filter((o) => o.at.getFullYear() === st.month.y && o.at.getMonth() === st.month.m);
      if (st.period === "today") { const d0 = new Date(t.getFullYear(), t.getMonth(), t.getDate()); return os.filter((o) => o.at >= d0); }
      if (st.period === "week") { const d0 = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 6); return os.filter((o) => o.at >= d0); }
      return os.filter((o) => o.at.getFullYear() === t.getFullYear() && o.at.getMonth() === t.getMonth());
    }
    function vendas() {
      const L = levelInfo(), t = M.now;
      const monthTotal = myOrders().filter((o) => valid(o) && o.at.getFullYear() === t.getFullYear() && o.at.getMonth() === t.getMonth()).reduce((s, o) => s + o.commission, 0);
      const list = periodOrders();
      const ftotal = list.filter(valid).reduce((s, o) => s + o.commission, 0);
      const label = st.month ? `${MONTHS[st.month.m]} ${st.month.y}` : st.period === "today" ? "Hoje" : st.period === "week" ? "Semana" : `${MONTHS[t.getMonth()]} ${t.getFullYear()}`;
      st.level = L.cur.level; st.lastProgress = L.progress;
      return `<div class="pad20" style="padding-left:0;padding-right:0"><div style="padding:0 20px">
        <div class="eyebrow">Volume acumulado</div><div class="hero xl" style="margin-bottom:20px">${formatSales(L.total)}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span class="tier" data-tier style="color:${L.cur.color};background:${L.cur.color}22">${L.cur.name}</span>${L.next ? `<span style="font-size:11px;font-weight:500;color:var(--sub)">Próximo: <b style="color:var(--purple-lt)">${L.next.name}</b></span>` : ""}</div>
        <div class="bar"><i data-bar style="width:${st.animBarFrom ?? L.progress}%"></i></div>
        <div style="text-align:right;font-size:11px;font-weight:600;color:var(--sub);margin-bottom:16px"><span style="color:var(--purple-lt)">${L.progress}%</span>${L.next ? ` — faltam ${formatSales(L.remaining)} para o ${L.next.name}` : " — Nível máximo 🏆"}</div>
        <div class="stepper">${LEVELS.map((l) => `<div class="${L.cur.level >= l.level ? "reached" : ""}"><i class="${L.cur.level === l.level ? "cur" : ""}" style="${L.cur.level >= l.level ? `background:${l.color}` : ""}"></i><span>${l.short}</span></div>`).join("")}</div>
        <div class="cards2" style="margin-bottom:4px">
          <div class="stat"><span class="l">Este mês</span><span class="v green">${formatSales(monthTotal)}</span><span style="font-size:11px;color:var(--sub)">acumulado</span></div>
          <div class="stat"><span class="l">${label}</span><span class="v">${formatSales(ftotal)}</span><span style="font-size:11px;color:var(--sub)">${plural(list.length, "lançamento", "lançamentos")}</span></div></div>
        <div class="divider"></div>
        <div class="segm">${[["today", "Hoje"], ["week", "Semanal"], ["month", "Mensal"]].map(([id, l]) => `<button class="${!st.month && st.period === id ? "on" : ""}" data-a="period" data-v="${id}">${l}</button>`).join("")}</div>
        <button class="monthbtn ${st.month ? "on" : ""}" data-a="monthsheet"><span style="display:flex;gap:8px;align-items:center">${I("calendar")}${st.month ? `${MONTHS[st.month.m]} ${st.month.y}` : "Filtrar por mês"}</span>${I("chevron-down")}</button>
        <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:700">Lançamentos</span><span style="font-size:12px;font-weight:500;color:var(--sub)">${plural(list.length, "resultado", "resultados")}</span></div></div>
        <div style="padding:0 20px">${list.length ? list.slice(0, 40).map((o) => saleRow(o, "full")).join("") : `<div class="emptyst"><b>📭</b>Nenhum lançamento neste período.</div>`}</div></div>`;
    }

    /* S09 Business */
    function business() {
      const t = M.now;
      const inP = (o) => {
        if (st.bmonth) return o.at.getFullYear() === st.bmonth.y && o.at.getMonth() === st.bmonth.m;
        if (st.bperiod === "today") return o.at >= new Date(t.getFullYear(), t.getMonth(), t.getDate());
        return o.at.getFullYear() === t.getFullYear() && o.at.getMonth() === t.getMonth();
      };
      const os = myOrders().filter((o) => valid(o) && inP(o));
      const rows = BRANDS.map((b) => ({ b, total: os.filter((o) => o.brand === b.id).reduce((s, o) => s + o.commission, 0) }));
      const total = rows.reduce((s, r) => s + r.total, 0);
      const label = st.bmonth ? `Comissões — ${MONTHS[st.bmonth.m]} ${st.bmonth.y}` : st.bperiod === "today" ? "Comissões hoje" : "Comissões este mês";
      return `<div class="pad20"><div class="eyebrow">${label}</div><div class="hero" data-hero>${f.brl(total)}</div><div class="meta" style="font-weight:500;margin:6px 0 20px">${BRANDS.length === 1 ? "1 negócio ativo" : `${BRANDS.length} negócios ativos`}</div>
        <div class="segm">${[["today", "Hoje"], ["month", "Mensal"]].map(([id, l]) => `<button class="${!st.bmonth && st.bperiod === id ? "on" : ""}" data-a="bperiod" data-v="${id}">${l}</button>`).join("")}</div>
        <button class="monthbtn ${st.bmonth ? "on" : ""}" data-a="bmonthsheet"><span style="display:flex;gap:8px;align-items:center">${I("calendar")}${st.bmonth ? `${MONTHS[st.bmonth.m]} ${st.bmonth.y}` : "Filtrar por mês"}</span>${I("chevron-down")}</button>
        <div class="eyebrow" style="margin-bottom:4px">Todos os negócios</div>
        ${rows.map(({ b, total }) => `<button class="rowi" style="padding:14px 0" data-a="bizdash" data-v="${b.id}">${brandAva(b, 48)}<span class="main"><div class="name">${esc(b.name)}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${brandCoupons(b).map((c) => `<span class="chip" style="border:1px solid var(--border)">${c}</span>`).join("") || '<span class="meta">Aguardando cupom</span>'}</div></span><span class="val">${f.brl(total)}</span><span style="color:var(--faint)">${I("chevron-right")}</span></button>`).join("")}</div>`;
    }

    /* S10 Business dashboard */
    function bizdash(s) {
      const b = brand(s.brand), os = myOrders().filter((o) => o.brand === b.id && valid(o)), t = M.now;
      const month = os.filter((o) => o.at.getFullYear() === t.getFullYear() && o.at.getMonth() === t.getMonth()).reduce((x, o) => x + o.commission, 0);
      const total = os.reduce((x, o) => x + o.commission, 0) + (b.live ? 0 : 0);
      const ticket = os.length ? os.reduce((x, o) => x + o.total, 0) / os.length : 0;
      const topCard = (l, v, ic, green) => `<div class="stat" style="border:1px solid var(--border);box-shadow:inset 0 2px 0 var(--purple);border-radius:16px"><span style="display:flex;justify-content:space-between" class="l">${l}<span style="color:var(--purple-lt)">${I(ic).replace('class="ic ', 'style="width:15px;height:15px" class="ic ')}</span></span><span class="v ${green ? "green" : ""}" style="font-size:22px">${v}</span></div>`;
      return `<div class="pad20"><div class="bhero"><div style="display:flex;gap:14px;align-items:center">${brandAva(b, 64, 16)}<div><div style="font-size:20px;font-weight:800">${esc(b.name)}</div><div class="meta" style="font-weight:500">${b.site}</div></div></div>
          <div class="cards2" style="margin-top:18px"><div class="ibox"><div class="eyebrow" style="font-size:10px">Este mês</div><div style="font-size:18px;font-weight:800;margin-top:4px">${formatSales(month)}</div></div><div class="ibox"><div class="eyebrow" style="font-size:10px">Total</div><div style="font-size:18px;font-weight:800;margin-top:4px;color:var(--purple-lt)">${formatSales(total)}</div></div></div></div>
        <div class="cards2" style="margin:12px 0">${topCard("Vendas", os.length, "shopping-bag")}${topCard("Ticket médio", f.brl(ticket), "ticket", true)}</div>
        <div class="divider"></div>
        <div class="chartcard"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">Últimos 30 dias</b><span class="tag">Comissão</span></div><div class="chart" data-ichart="d30"></div></div>
        <div class="chartcard"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">Últimos 6 meses</b><span class="tag">Comissão</span></div><div class="chart" data-ichart="m6"></div></div></div>`;
    }

    /* S11 Campanhas */
    function campanhas() {
      const cs = myCampaigns();
      return `<div class="pad20"><div class="eyebrow">Suas campanhas</div><div style="font-size:22px;font-weight:800;letter-spacing:-.3px;margin:2px 0 20px">${cs.length} Campanhas</div>
        ${cs.length ? cs.map((c) => { const b = brand(c.brand), [pl, pc, pb] = PILL[shownStatus(c)]; return `<button class="rowi" data-a="ranking" data-v="${c.id}">${brandAva(b, 48)}<span class="main" style="display:flex;flex-direction:column;gap:5px">
          <span style="display:flex;justify-content:space-between;gap:8px"><span class="name" style="margin:0">${esc(c.name)}</span><span class="val">${f.brl(c.commission)}</span></span>
          <span style="display:flex;gap:8px;align-items:center"><span class="status-pill" style="color:${pc};background:${pb}">${pl}</span><span style="font-size:11px;font-weight:500;color:var(--sub)">${f.ddmmyyyy(c.start)} → ${c.end ? f.ddmmyyyy(c.end) : "?"}</span></span>
          <span style="font-size:11px;font-weight:500;color:var(--sub)">${esc(b.name)}</span></span><span style="color:var(--faint)">${I("chevron-right")}</span></button>`; }).join("")
          : `<div class="emptyst"><b>📋</b><div style="font-size:18px;font-weight:800;color:var(--text)">Nenhuma campanha ainda</div>Você ainda não participa de nenhuma campanha</div>`}</div>`;
    }

    /* S12 Ranking */
    const MEDAL = [["#FFD700", "#2a2200"], ["#C0C0C0", "#1e1e22"], ["#CD7F32", "#1e1200"]];
    function ranking(s) {
      const c = myCampaigns().find((x) => x.id === s.campaign);
      const r = c.ranking;
      const pod = (i, big) => {
        const e = r[i];
        if (!e) return `<div><span class="ava" style="width:56px;height:56px;background:var(--card2)"></span><span class="handle" style="color:var(--sub)">Vazio</span></div>`;
        const [col, bg] = MEDAL[i];
        return `<div style="${big ? "margin-bottom:8px" : ""}">${ava(e[0].replace("@", ""), big ? 72 : 56, { bg: "#3a3a4a", fg: "#a78bfa", ring: big ? "#FFD700" : null })}<span class="handle">${e[0]}</span><span class="medal" style="width:${big ? 48 : 40}px;height:${big ? 48 : 40}px;background:${bg};color:${col};font-size:${big ? 24 : 18}px;border:1px solid ${col}40">${i + 1}</span></div>`;
      };
      return `<div class="pad20"><div class="eyebrow">${plural(r.length, "participante", "participantes")}</div><div style="font-size:22px;font-weight:800">Ranking</div>
        ${r.length ? `<div class="podium">${pod(1)}${pod(0, true)}${pod(2)}</div>
        <div class="eyebrow" style="margin-bottom:4px">Classificação completa</div>
        ${r.map((e, i) => `<div class="rowi"><span class="poscircle" style="${i < 3 ? `background:${MEDAL[i][1]};color:${MEDAL[i][0]}` : ""}">${i + 1}</span>${ava(e[0].replace("@", ""), 44, { bg: "#3a3a4a", fg: "#a78bfa" })}<span class="main"><div class="name" style="margin:0">${e[0]}</div></span><span class="val">${pts(e[1])}</span></div>`).join("")}`
          : `<div class="emptyst"><b>🏆</b>Nenhum participante ainda</div>`}</div>`;
    }

    /* S14 Solicitações / Notificações */
    function requests() {
      const unread = shared.notifs.filter((n) => !n.read).length;
      const seg = `<div class="segm" style="margin:0 0 8px">${[["solicitacoes", "Solicitações", shared.invites.length], ["notificacoes", "Notificações", unread]].map(([id, l, n]) => `<button class="${st.reqTab === id ? "on" : ""}" data-a="reqtab" data-v="${id}">${l}${n ? `<span class="cnt">${n > 9 ? "9+" : n}</span>` : ""}</button>`).join("")}</div>`;
      if (st.reqTab === "solicitacoes") {
        return `<div class="pad">${seg}${shared.invites.length ? shared.invites.map((q) => `<div class="rowi">${ava(q.name, 48)}<span class="main"><div class="name" style="font-weight:600">${esc(q.name)}</div><div style="font-size:13px;color:var(--sub)">${q.site}</div></span>
          <button data-a="accept" data-v="${q.id}" style="color:var(--green);padding:6px" aria-label="Aceitar">${I("check", "", 3).replace('class="ic ', 'style="width:22px;height:22px" class="ic ')}</button><button data-a="reject" data-v="${q.id}" style="color:var(--red);padding:6px" aria-label="Recusar">${I("x", "", 2.5).replace('class="ic ', 'style="width:22px;height:22px" class="ic ')}</button></div>`).join("")
          : `<div class="emptyst"><b>📭</b><div style="font-size:16px;font-weight:700;color:var(--text)">Nenhuma solicitação</div>Convites de negócios aparecem aqui</div>`}</div>`;
      }
      return `<div class="pad">${seg}${shared.notifs.length ? shared.notifs.map((n) => `<div class="ncard ${n.read ? "" : "unread"} ${st.highlight === n.id ? "rowi new" : ""}" style="${st.highlight === n.id ? "padding:14px 12px" : ""}">${ava(n.brand, 44)}<div style="flex:1;min-width:0;padding-right:14px"><div style="display:flex;justify-content:space-between"><span style="font-size:12px;font-weight:600;color:var(--sub)">${esc(n.brand)}</span><span style="font-size:11px;color:var(--sub)">${f.rel(n.at)}</span></div>
          <div style="font-size:15px;font-weight:700;margin-top:2px">${esc(n.title || "")}</div><div style="font-size:14px;opacity:.9;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(n.body)}</div></div>${n.read ? "" : '<span class="udot"></span>'}</div>`).join("")
        : `<div class="emptyst"><b>🔔</b>Nenhuma notificação</div>`}</div>`;
    }

    /* S15 Perfil */
    function profile() {
      return `<div class="pad20" style="display:flex;flex-direction:column;align-items:center;padding-top:30px">
        ${ava(ME.name, 96, { bg: "#7C3AED", ring: "rgba(124,58,237,.35)" })}
        <div style="font-size:22px;font-weight:800;margin-top:16px">${esc(ME.name)}</div><div style="font-size:15px;font-weight:600;color:var(--sub);margin-bottom:28px">${ME.instagram}</div>
        <button class="pcard" data-a="edit" style="display:flex;justify-content:center;gap:8px;padding:14px;border-radius:14px;font-weight:600;margin-bottom:12px"><span style="color:var(--purple-lt)">${I("pencil")}</span>Editar perfil</button>
        <div class="pcard" style="margin-bottom:12px"><div class="eyebrow">Código de convite</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><span style="font-size:24px;font-weight:800;letter-spacing:3px;color:var(--purple-lt)">ROI7K2Q</span><button data-a="copy" aria-label="Copiar código">${I("copy")}</button></div></div>
        <div class="pcard" style="margin-bottom:12px"><div class="eyebrow" style="margin-bottom:8px">Notificações</div><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-size:14px;font-weight:500">${shared.pushOn ? "Você receberá alertas de novas vendas" : "Ative para receber alertas de novas vendas"}</span>
          <button class="toggle ${shared.pushOn ? "on" : "off"}" data-a="pushtoggle">${I(shared.pushOn ? "bell" : "bell")}${shared.pushOn ? "Ativa" : "Ativar"}</button></div></div>
        <button data-a="logout" style="width:100%;padding:14px;border-radius:14px;background:#C62828;color:#fff;font-weight:700;display:flex;gap:8px;justify-content:center;margin-top:8px">${I("log-out")}Sair</button>
        <button data-a="delacc" style="width:100%;padding:14px;border-radius:14px;background:rgba(239,68,68,.12);color:var(--red);font-weight:700;display:flex;gap:8px;justify-content:center;margin-top:12px">${I("trash-2")}Excluir conta</button></div>`;
    }
    function edit() {
      const field = (l, v, ph) => `<div style="margin-bottom:12px"><div style="font-size:13px;color:var(--sub);margin-bottom:6px">${l}</div><input value="${esc(v)}" placeholder="${ph || ""}" style="width:100%;background:var(--card2);border:0;border-radius:12px;padding:12px 16px;color:var(--text);font:inherit;font-size:17px;outline:none"></div>`;
      return `<div class="pad20"><div style="display:flex;justify-content:center;margin:10px 0 20px">${ava(ME.name, 112, { bg: "#7C3AED" })}</div>
        <div class="pcard" style="margin-bottom:12px"><div class="eyebrow" style="margin-bottom:12px">Perfil</div>${field("Nome", ME.name)}${field("Instagram", ME.instagram, "@instagram")}${field("Telefone", "(47) 99123-4567", "(12) 93456-7810")}<button class="btn-p" data-a="saveprof">Salvar perfil</button></div></div>`;
    }

    const SCREENS = { dashboard, vendas, business, campanhas, bizdash, ranking, requests, profile, edit };

    function afterRender(s) {
      if (s.id === "bizdash") {
        const os = myOrders().filter((o) => o.brand === s.brand && valid(o)), t = M.now;
        const d30 = [];
        for (let d = 29; d >= 0; d--) {
          const day = new Date(t.getFullYear(), t.getMonth(), t.getDate() - d), nx = new Date(day.getTime() + 864e5);
          d30.push({ label: f.ddmm(day), value: os.filter((o) => o.at >= day && o.at < nx).reduce((x, o) => x + o.commission, 0) });
        }
        const m6 = [];
        for (let k = 5; k >= 0; k--) {
          const a = new Date(t.getFullYear(), t.getMonth() - k, 1), b = new Date(t.getFullYear(), t.getMonth() - k + 1, 1);
          m6.push({ label: MON_SHORT[a.getMonth()], value: os.filter((o) => o.at >= a && o.at < b).reduce((x, o) => x + o.commission, 0) });
        }
        const o = { area: true, color: "#8b5cf6", stroke: 3, dots: false, axis: false, padL: 50, h: 180, yFmt: (v) => "R$ " + Math.round(v), tip: (d) => `${d.label} · ${f.brl(d.value)}`, animate: true };
        Charts.line(scroll.querySelector('[data-ichart="d30"]'), d30, { ...o, xEvery: 6 });
        Charts.line(scroll.querySelector('[data-ichart="m6"]'), m6, { ...o, xEvery: 1 });
      }
      if (st.animBarFrom != null) {
        const bar = scroll.querySelector("[data-bar]");
        const to = levelInfo().progress;
        st.animBarFrom = null;
        if (bar) requestAnimationFrame(() => requestAnimationFrame(() => (bar.style.width = to + "%")));
      }
      st.highlight = null;
    }

    /* camadas */
    function sheet(html) { layer.innerHTML = `<div class="backdrop" data-a="closesheet"></div><div class="bsheet"><div class="grab"></div>${html}</div>`; }
    function closeSheet() { layer.innerHTML = ""; }
    function monthSheet(kind) {
      const t = M.now, list = [];
      const startK = kind === "vendas" ? 1 : 0;
      for (let k = startK; k < startK + 6; k++) { const d = new Date(t.getFullYear(), t.getMonth() - k, 1); list.push({ y: d.getFullYear(), m: d.getMonth() }); }
      const sel = kind === "vendas" ? st.month : st.bmonth;
      sheet(`<div style="font-size:17px;font-weight:800">Filtrar por mês</div><div style="font-size:12px;font-weight:500;color:var(--sub);margin-bottom:20px">${kind === "vendas" ? "Selecione um mês para ver os lançamentos" : "Selecione um mês para ver as comissões"}</div>
        ${list.map((x) => { const on = sel && sel.y === x.y && sel.m === x.m; return `<button class="mrow ${on ? "on" : ""}" data-a="pickmonth" data-k="${kind}" data-v="${x.y}-${x.m}"><span>${MONTHS[x.m]} ${x.y}</span>${on ? I("check") : ""}</button>`; }).join("")}
        ${sel ? `<button class="btn-soft" style="margin-top:16px" data-a="clearmonth" data-k="${kind}">Limpar filtro</button>` : ""}`);
    }
    let copiedT;
    function flash(msg) {
      root.querySelector(".copied")?.remove();
      const d = document.createElement("div"); d.className = "copied"; d.textContent = msg; root.appendChild(d);
      clearTimeout(copiedT); copiedT = setTimeout(() => d.remove(), 1600);
    }

    /* push */
    let pushT, pushTarget = null;
    function showPush(title, body, target) {
      if (opts.banner === false) return;
      push.querySelector(".pt").textContent = "ROInfluencer";
      push.querySelector(".b").innerHTML = `<b>${esc(title)}</b><br>${esc(body)}`;
      pushTarget = target;
      push.classList.remove("show"); void push.offsetWidth; push.classList.add("show");
      clearTimeout(pushT); pushT = setTimeout(() => push.classList.remove("show"), 4200);
    }
    function confetti() {
      const c = document.createElement("div"); c.className = "confetti";
      const cols = ["#C0C0C0", "#a78bfa", "#10b981", "#FFD700", "#f0abfc"];
      c.innerHTML = Array.from({ length: 60 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-delay:${Math.random() * 0.5}s;animation-duration:${1.4 + Math.random()}s"></i>`).join("");
      root.appendChild(c); setTimeout(() => c.remove(), 2600);
    }

    function go(id, extra) { st.stack.push({ id, ...extra }); closeSheet(); render(false, true); }

    root.addEventListener("click", (e) => {
      const t = e.target.closest("[data-a]");
      if (!t) return;
      const a = t.dataset.a, v = t.dataset.v;
      switch (a) {
        case "tab": st.tab = v; st.stack = []; closeSheet(); render(false, true); break;
        case "back": st.stack.pop(); render(false, true); break;
        case "requests": go("requests", { title: "Solicitações" }); break;
        case "profile": go("profile", { title: "Perfil" }); break;
        case "edit": go("edit", { title: "Editar Perfil" }); break;
        case "saveprof": flash("Perfil atualizado!"); break;
        case "period": st.period = v; st.month = null; render(true); break;
        case "bperiod": st.bperiod = v; st.bmonth = null; render(true); break;
        case "monthsheet": monthSheet("vendas"); break;
        case "bmonthsheet": monthSheet("business"); break;
        case "pickmonth": { const [y, m] = v.split("-").map(Number); if (t.dataset.k === "vendas") st.month = { y, m }; else st.bmonth = { y, m }; closeSheet(); render(true); break; }
        case "clearmonth": if (t.dataset.k === "vendas") st.month = null; else st.bmonth = null; closeSheet(); render(true); break;
        case "closesheet": closeSheet(); break;
        case "sale": {
          const o = myOrders().find((x) => x.id === v), b = brand(o.brand);
          sheet(`<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding-top:6px">${ava(b.name, 64, { bg: "var(--card2)", fg: "var(--sub)" })}<div style="font-size:20px;font-weight:700">${esc(b.name)}</div>
            <div style="font-size:28px;font-weight:800;color:${valid(o) ? "var(--green)" : "var(--sub)"}">${valid(o) ? "+ " : ""}${f.brl(o.commission)}</div><div style="font-size:13px;color:var(--sub)">${f.ddmm(o.at)} · cupom ${o.coupon}</div></div>`);
          break;
        }
        case "bizdash": go("bizdash", { brand: v, title: brand(v).name }); break;
        case "ranking": { const c = myCampaigns().find((x) => x.id === v); go("ranking", { campaign: v, title: c.name }); break; }
        case "prizes": {
          const c = myCampaigns().find((x) => x.id === screen().campaign);
          sheet(`<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><span style="color:var(--purple-lt)">${I("trophy")}</span><span style="font-size:18px;font-weight:800">Prêmios da Campanha</span></div>
            ${c.prizes.slice().sort((a, b) => a.from - b.from).map((p) => `<div style="display:flex;gap:12px;align-items:center;padding:10px 0"><span style="background:var(--card2);border-radius:8px;padding:6px 10px;min-width:48px;text-align:center;color:var(--purple-lt);font-size:13px;font-weight:700">#${p.from}${p.to !== p.from ? "–" + p.to : ""}</span><span style="flex:1;font-size:14px;font-weight:700">${esc(p.title)}</span><span style="font-size:15px;font-weight:800;color:var(--green)">${esc(p.value)}</span></div>`).join("") || '<div class="meta">Nenhum prêmio cadastrado</div>'}`);
          break;
        }
        case "reqtab": st.reqTab = v; if (v === "notificacoes") { render(true); setTimeout(() => { shared.notifs.forEach((n) => (n.read = true)); }, 1200); } else render(true); break;
        case "accept": case "reject": {
          const q = shared.invites.find((x) => x.id === v);
          shared.invites = shared.invites.filter((x) => x.id !== v);
          if (a === "accept") { BRANDS.push({ id: "b" + (BRANDS.length + 1), name: q.name, site: q.site, color: "#0e7490", coupons: [] }); flash(`${q.name} agora é parceira`); }
          render(true);
          break;
        }
        case "copy": try { navigator.clipboard?.writeText("ROI7K2Q"); } catch { /* sem permissão em file:// */ } flash("Código copiado"); break;
        case "pushtoggle": shared.pushOn = !shared.pushOn; render(true); break;
        case "logout": flash("Modo demonstração"); break;
        case "delacc":
          layer.innerHTML = `<div class="backdrop" data-a="closesheet"></div><div class="modal"><div style="font-size:18px;font-weight:800;margin-bottom:8px">Excluir conta?</div><div style="font-size:14px;color:var(--sub);line-height:1.45;margin-bottom:18px">Seus dados pessoais serão permanentemente removidos. Seu histórico de vendas será mantido de forma anonimizada. Essa ação não pode ser desfeita.</div>
            <button data-a="closesheet" style="width:100%;padding:13px;border-radius:14px;background:#C62828;color:#fff;font-weight:700;margin-bottom:10px">Sim, excluir minha conta</button><button data-a="closesheet" style="width:100%;padding:13px;border-radius:14px;background:var(--card2);font-weight:700">Cancelar</button></div>`;
          break;
        case "pushtap":
          push.classList.remove("show");
          if (pushTarget === "notif") { st.reqTab = "notificacoes"; if (screen().id !== "requests") go("requests", { title: "Solicitações" }); else render(true); }
          else { st.tab = "vendas"; st.stack = []; st.period = "today"; st.month = null; render(false, true); }
          break;
      }
    });

    /* venda nova da influenciadora */
    M.on("order", (o) => {
      if (o.infId !== ME.id) return;
      const s = screen();
      const beforeLevel = st.level, beforeProgress = st.lastProgress;
      const prevHero = st.heroVal;
      const L = levelInfo();
      st.highlight = o.id;
      if (s.id === "vendas") st.animBarFrom = L.cur.level > beforeLevel ? 0 : beforeProgress;
      render(true);
      if (s.id === "dashboard" && prevHero != null) {
        const el = scroll.querySelector("[data-hero]"), to = st.heroVal, t0 = performance.now();
        (function step(t) { const k = Math.min(1, (t - t0) / 900), ee = 1 - Math.pow(1 - k, 3); el.textContent = f.brl(prevHero + (to - prevHero) * ee); if (k < 1) requestAnimationFrame(step); })(t0);
      }
      if (beforeLevel && L.cur.level > beforeLevel) {
        confetti();
        scroll.querySelector("[data-tier]")?.classList.add("levelup");
      }
      if (shared.pushOn) showPush("Nova venda! 🎉", `+${f.brl(o.commission)} de comissão com o cupom ${o.coupon} · ${M.business.name}`, "sale");
      st.level = L.cur.level;
    });
    /* notificação enviada pelo painel da empresa */
    M.on("push", (n) => {
      if (!n.ids.includes(ME.id)) return;
      if (!shared.notifs.some((x) => x.id === n.id)) shared.notifs.unshift({ id: n.id, brand: n.business, title: n.title, body: n.body, at: new Date(), read: false });
      st.highlight = n.id;
      if (screen().id === "requests") render(true);
      setTimeout(() => showPush(n.title || n.business, n.body, "notif"), 600);
    });
    M.on("campaign", () => { if (screen().id === "campanhas") render(true); });

    st.level = levelInfo().cur.level; st.lastProgress = levelInfo().progress;
    render();
    return { tab(v) { st.tab = v; st.stack = []; render(); }, root };
  };
})();
