/* Painel da empresa (réplica offline). Cada chamada a BizApp monta uma instância independente
   que lê e escreve no mesmo MOCK, então uma venda simulada aparece em todas. */
(function () {
  const M = window.MOCK, f = M.fmt, I = window.icon;
  const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const NAV = [
    ["dashboard", "Dashboard", "layout-dashboard"],
    ["influencers", "Influencers", "users"],
    ["notificacoes", "Notificações", "bell"],
    ["comunidade", "Comunidade", "contact"],
    ["vendas", "Vendas", "shopping-bag"],
    ["ranking", "Ranking", "trending-up"],
    ["integracoes", "Integrações", "zap"],
  ];
  const removed = new Set();
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const av = (name, size = 32, cls = "") => `<span class="av ${cls}" style="width:${size}px;height:${size}px;font-size:${size >= 56 ? 18 : 12}px">${f.initials(name)}</span>`;
  const yFmt = (v) => "R$" + Math.round(v);
  const prizeEmoji = (p) => (p.from === 1 ? "🥇" : p.from === 2 ? "🥈" : p.from === 3 ? "🥉" : "🏅");
  const prizeLabel = (p) => `${p.from === p.to ? `${p.from}º lugar` : `${p.from}º–${p.to}º lugar`} — ${p.value}`;
  const statusBadge = {
    active: '<span class="badge ok">Ativa</span>', paused: '<span class="badge warn">Pausada</span>',
    finished: '<span class="badge done">Encerrada</span>', draft: '<span class="badge done">Rascunho</span>', cancelled: '<span class="badge cancel">Cancelada</span>',
  };
  const activeInfluencers = () => M.influencers.filter((i) => !removed.has(i.id));

  window.BizApp = function (root, opts = {}) {
    const st = {
      route: opts.start || "dashboard", days: 7, months: 6, collapsed: false,
      v: { page: 1, coupon: "", q: "", from: "", to: "" },
      infQ: "", infMonth: M.now.getMonth(), infYear: M.now.getFullYear(), infMode: "month",
      rankTab: "geral", notifTab: "enviar", target: "all", groupId: "g1", picked: new Set(["i1", "i2"]), pv: "ios",
      nt: { title: "", subtitle: "", body: "" }, comQ: "", detail: null, cfgTab: "perfil",
      integ: { ns: true, ig: true }, fees: { other: 0, pix: 0.99, c1: 3.49, cn: 4.99, boleto: 2.49, debit: 1.99 },
      highlight: null, prevKpi: null,
    };
    root.classList.add("biz");
    root.innerHTML = `
      <aside class="sb">
        <div class="sb-head"><img src="assets/img/logo.png" alt=""><label>ROINFLUENCER</label><span class="vsep"></span>
          <button class="icon-btn" data-a="collapse" aria-label="Recolher menu">${I("panel-left")}</button></div>
        <div class="hsep"></div>
        <nav class="menu">${NAV.map(([id, label, ic]) => `<button data-a="nav" data-v="${id}" title="${label}">${I(ic)}<span>${label}</span></button>`).join("")}</nav>
        <button class="sb-foot" data-a="usermenu">${av(M.business.name, 32, "lg")}<span class="who"><b>${esc(M.business.name)}</b><small>${M.business.email}</small></span>${I("chevrons-up-down")}</button>
      </aside>
      <main></main>
      <div class="dropdown">
        <div class="row">${av(M.business.name, 32, "lg")}<span class="who" style="display:grid;line-height:1.25"><b style="font-weight:500">${esc(M.business.name)}</b><small class="muted xs">${M.business.email}</small></span></div>
        <hr><button data-a="nav" data-v="config">${I("user")}Account</button><hr>
        <button data-a="logout" style="color:var(--red)">${I("log-out")}Log out</button>
      </div>
      <div class="layer"></div>
      <div class="btoast"></div>`;
    const main = root.querySelector("main");
    const layer = root.querySelector(".layer");
    const dropdown = root.querySelector(".dropdown");

    /* ---------- render ---------- */
    function render(keepScroll) {
      const top = main.scrollTop;
      root.querySelectorAll(".menu button").forEach((b) => b.classList.toggle("active", b.dataset.v === st.route || (st.route === "detalhe" && b.dataset.v === "comunidade")));
      main.innerHTML = `<div class="page">${PAGES[st.route]()}</div>`;
      if (keepScroll) { main.style.scrollBehavior = "auto"; main.scrollTop = top; main.style.scrollBehavior = ""; }
      else main.scrollTop = 0;
      after();
    }
    function title(t, extra = "") {
      return `<div class="ptitle">${st.collapsed ? `<button class="icon-btn" data-a="collapse">${I("panel-left")}</button>` : ""}${extra}${t}</div>`;
    }

    /* ---------- S01 Dashboard ---------- */
    function dashboard() {
      const k = M.kpis();
      const last = M.orders.slice(0, 10);
      const top = M.ranking().filter((r) => !removed.has(r.inf.id)).slice(0, 5);
      const seg = (key, vals) => vals.map((v) => `<button class="btn xs ${st[key] === v ? "" : "outline"}" data-a="period" data-k="${key}" data-v="${v}">${v}${key === "days" ? "d" : "m"}</button>`).join("");
      return `${title("Dashboard")}
        <div class="kpis">
          ${kpi("Total Comissão", f.brl(k.total_commission), "em vendas pagas", "total_commission")}
          ${kpi("Total Vendas", f.brl(k.total_sales), `${k.total_orders} pedidos`, "total_sales")}
          ${kpi("ROI", k.roi.toFixed(2) + "x", "retorno sobre comissão", "roi")}
          ${kpi("Ticket Médio", f.brl(k.avg_ticket), "por pedido", "avg_ticket")}
          ${kpi("Influencers", activeInfluencers().length, "conectados ativos", "active_influencers")}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="card"><div class="card-h"><span class="card-t sm">Vendas por dia</span><div class="seg">${seg("days", [7, 15, 30])}</div></div>
            <div class="card-c"><div class="chart" data-chart="days"></div></div></div>
          <div class="card"><div class="card-h"><span class="card-t sm">Vendas por mês</span><div class="seg">${seg("months", [3, 6, 12])}</div></div>
            <div class="card-c"><div class="chart" data-chart="months"></div></div></div>
        </div>
        <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:16px;align-items:start">
          <div class="card" style="padding-bottom:8px"><div class="card-h"><span class="card-t">Últimas vendas</span></div>
            <div><table><thead><tr><th>Data</th><th>ID Externo</th><th>Influencer</th><th>Cupom</th><th>Plataforma</th><th class="r">Valor</th><th class="r">Comissão</th></tr></thead>
            <tbody>${last.map((o) => orderRowDash(o)).join("")}</tbody></table></div></div>
          <div class="card" style="padding-bottom:8px"><div class="card-h"><span class="card-t">Top influencers</span></div>
            <div><table><thead><tr><th>Influencer</th><th class="r">Vendas</th><th class="r">Comissão</th></tr></thead>
            <tbody>${top.map((r) => `<tr><td><div class="row" style="gap:10px">${av(r.inf.name)}<div><div style="font-weight:500;line-height:1">${esc(r.inf.name)}</div><div class="xxs muted" style="margin-top:2px">${r.total_orders} pedidos</div></div></div></td>
              <td class="r" style="font-weight:500">${f.brl(r.total_sales)}</td><td class="r green">${f.brl(r.total_commission)}</td></tr>`).join("")}</tbody></table></div></div>
        </div>`;
    }
    function kpi(label, value, sub, key) {
      return `<div class="kpi" data-kpi="${key}"><p class="l" style="margin:0">${label}</p><p class="v" style="margin:0">${value}</p><p class="s" style="margin:0">${sub}</p></div>`;
    }
    function orderRowDash(o) {
      const inf = M.byId(o.infId);
      const bad = !M.isValid(o);
      return `<tr class="${bad ? "cancelled" : ""} ${st.highlight === o.id ? "new" : ""}"><td class="muted xs">${f.ddmm(o.at)}</td><td class="mono xs strike">${o.ext}</td><td>${esc(inf.name)}</td>
        <td><code class="cp">${o.coupon}</code></td><td>${bad ? `<span class="badge cancel">${o.status}</span>` : `<span class="badge nuvem">${o.platform}</span>`}</td>
        <td class="r strike" style="font-weight:500">${f.brl(o.total)}</td><td class="r green strike">${f.brl(o.commission)}</td></tr>`;
    }

    /* ---------- S02 Influencers ---------- */
    function influencers() {
      const rows = M.monthStats(st.infYear, st.infMonth).filter((r) => !removed.has(r.inf.id));
      const q = st.infQ.trim().toLowerCase();
      const list = rows.filter((r) => !q || r.inf.name.toLowerCase().includes(q) || r.inf.instagram.includes(q) || r.inf.coupons.some((c) => c.code.toLowerCase().includes(q)));
      const years = [0, 1, 2, 3, 4].map((d) => M.now.getFullYear() - d);
      return `<div class="phead">${title("Influencers", "")}<div class="row">
          <button class="btn outline sm" data-a="invites" style="position:relative">${I("clock")}Convites${M.pendingInvites.length ? `<span class="badge" style="position:absolute;top:-8px;right:-8px;height:20px;min-width:20px;justify-content:center;padding:0 4px;font-size:10px;background:#eab308;color:#fff">${M.pendingInvites.length}</span>` : ""}</button>
          <button class="btn sm" data-a="addinf">${I("plus")}Adicionar Influencer</button></div></div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="row" style="gap:20px"><label class="radio"><input type="radio" name="m${root.dataset.uid}" ${st.infMode === "month" ? "checked" : ""} data-a="infmode" value="month">Mês / Ano</label>
            <label class="radio"><input type="radio" name="m${root.dataset.uid}" ${st.infMode === "range" ? "checked" : ""} data-a="infmode" value="range">Período personalizado</label></div>
          <div class="filters"><input class="input" style="max-width:320px" placeholder="Buscar influencer..." data-in="infQ" value="${esc(st.infQ)}">
            ${st.infMode === "month" ? `<select class="input" style="width:140px" data-ch="infMonth">${MONTHS.map((m, i) => `<option value="${i}" ${i === st.infMonth ? "selected" : ""}>${m}</option>`).join("")}</select>
            <select class="input" style="width:100px" data-ch="infYear">${years.map((y) => `<option ${y === st.infYear ? "selected" : ""}>${y}</option>`).join("")}</select>`
              : `<input type="date" class="input" style="width:160px"><span class="muted">até</span><input type="date" class="input" style="width:160px"><button class="btn sm">Filtrar</button>`}
          </div></div>
        <table><thead><tr><th>Influencer</th><th>Cupons</th><th>Seguidores</th><th>Posts</th><th>Vendas</th><th>Comissão</th><th class="r">Ações</th></tr></thead><tbody>
        ${list.length ? list.map((r) => `<tr class="${st.highlight === r.inf.id ? "new" : ""}"><td><div class="row" style="gap:10px">${av(r.inf.name, 36)}<div><div style="font-weight:500">${esc(r.inf.name)}</div><div class="xs muted">${r.inf.instagram}</div></div></div></td>
          <td style="white-space:normal;max-width:220px">${r.inf.coupons.map((c) => `<span class="cpill ${c.active ? "" : "off"}">${c.code}<span>${c.pct}%</span></span>`).join("")}</td>
          <td style="font-weight:500">${f.num(r.inf.followers)}</td><td>${r.inf.posts}</td><td>${f.brl(r.total_sales)}</td><td class="green" style="font-weight:500">${f.brl(r.total_commission)}</td>
          <td class="r"><button class="btn ghost sm icon" title="Ver métricas de Instagram" data-a="detail" data-v="${r.inf.id}">${I("layout-dashboard")}</button><button class="btn ghost sm icon" title="Cupons" data-a="coupons" data-v="${r.inf.id}">${I("pen")}</button><button class="btn ghost sm icon" style="color:#C62828" title="Remover" data-a="rminf" data-v="${r.inf.id}">${I("trash-2")}</button></td></tr>`).join("")
          : `<tr><td colspan="7" class="empty">Nenhum influencer encontrado</td></tr>`}
        </tbody></table>`;
    }

    /* ---------- S03 Notificações ---------- */
    function notificacoes() {
      const withApp = activeInfluencers().filter((i) => i.platform);
      const reach = reachList().length;
      const tabs = `<div class="tabs"><button class="${st.notifTab === "enviar" ? "on" : ""}" data-a="ntab" data-v="enviar">Enviar</button><button class="${st.notifTab === "historico" ? "on" : ""}" data-a="ntab" data-v="historico">Histórico<span class="badge secondary" style="margin-left:8px;height:20px;padding:0 6px;font-size:10px">${M.notifHistory.length}</span></button></div>`;
      if (st.notifTab === "historico") {
        return `${title("Notificações", I("bell"))}${tabs}
          <table><thead><tr><th class="xs">Data</th><th class="xs">Mensagem</th><th class="xs">Público</th><th class="xs c">Enviados</th><th class="xs c">Falhas</th><th class="xs">Status</th></tr></thead><tbody>
          ${M.notifHistory.map((n) => `<tr style="cursor:pointer" data-a="ndetail" data-v="${n.id}" class="${st.highlight === n.id ? "new" : ""}"><td class="xs muted">${f.longDateTime(n.at)}</td>
            <td style="max-width:320px"><div style="font-weight:500;overflow:hidden;text-overflow:ellipsis">${esc(n.title || "(sem título)")}</div><div class="xs muted" style="overflow:hidden;text-overflow:ellipsis">${esc(n.body)}</div></td>
            <td>${n.audience}</td><td class="c">${n.delivered}/${n.recipients}</td><td class="c" style="color:${n.failed ? "var(--red)" : "var(--muted-fg)"}">${n.failed}</td>
            <td>${n.status === "sent" ? `<span class="status sent">${I("circle-check")}Enviado</span>` : `<span class="status partial">${I("triangle-alert")}Parcial</span>`}</td></tr>`).join("")}
          </tbody></table>`;
      }
      const chip = (id, label, ic) => `<button class="chip ${st.target === id ? "on" : ""}" data-a="target" data-v="${id}">${I(ic)}${label}</button>`;
      const n = st.nt;
      return `${title("Notificações", I("bell"))}${tabs}
        <div style="display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start">
          <div style="display:flex;flex-direction:column;gap:24px">
            <div class="card" style="padding:16px;gap:16px"><span class="label" style="font-weight:600;margin:0">Destinatários</span>
              <div class="row" style="flex-wrap:wrap">${chip("all", `Todos (${withApp.length})`, "users")}${chip("group", "Grupo", "users")}${chip("custom", "Específicos", "user")}</div>
              ${st.target === "group" ? `<div class="row"><select class="input" data-ch="groupId">${M.groups.map((g) => `<option value="${g.id}" ${g.id === st.groupId ? "selected" : ""}>${esc(g.name)} · ${g.ids.length}</option>`).join("")}</select><button class="btn outline sm" data-a="newgroup">${I("plus")}Novo grupo</button></div>` : ""}
              ${st.target === "custom" ? `<div style="border:1px solid var(--border);border-radius:8px;padding:8px;max-height:200px;overflow:auto">${activeInfluencers().map((i) => `<label class="row" style="padding:6px;gap:10px;${i.platform ? "" : "opacity:.5"}"><input type="checkbox" ${st.picked.has(i.id) ? "checked" : ""} ${i.platform ? "" : "disabled"} data-a="pick" value="${i.id}" style="accent-color:#a800b7">${av(i.name, 28)}<span style="flex:1"><span style="font-size:14px">${esc(i.name)}</span> <span class="xs muted">${i.instagram}</span></span>${i.platform === "ios" ? `<span class="muted">${I("apple")}</span>` : i.platform === "android" ? `<span style="color:#16a34a">${I("smartphone")}</span>` : `<span class="muted" style="font-size:10px">sem app</span>`}</label>`).join("")}</div>` : ""}
              <p class="xs muted" style="margin:0">Alcance estimado: <b style="color:var(--fg)">${reach}</b> influencer(s) com o app instalado.</p></div>
            <div class="card" style="padding:16px;gap:14px"><span class="label" style="font-weight:600;margin:0">Conteúdo</span>
              <div><span class="label">Título</span><input class="input" maxlength="100" placeholder="Título da notificação" data-in="nt.title" value="${esc(n.title)}"></div>
              <div><span class="label">Subtítulo <span class="muted">· iOS</span></span><input class="input" placeholder="Subtítulo (opcional)" data-in="nt.subtitle" value="${esc(n.subtitle)}"></div>
              <div><span class="label">Mensagem *</span><textarea class="input" rows="3" maxlength="800" placeholder="Escreva a mensagem..." data-in="nt.body">${esc(n.body)}</textarea>
                <div class="row xs muted" style="justify-content:space-between;margin-top:4px"><span>Máximo 20 linhas.</span><span data-count>${n.body.length}/800</span></div></div>
              <div class="xs muted" style="border:1px dashed var(--border);border-radius:8px;padding:12px;display:flex;gap:8px">${I("info")}<span>Ao tocar na notificação, o influencer é levado para a tela <b>Solicitações</b> com a aba <b>Notificações</b> ativa.</span></div></div>
            <div class="row" style="gap:16px"><button class="btn lg" data-a="send" ${n.body.trim() && reach ? "" : "disabled"}>${I("send")}Enviar para ${reach} influencer(s)</button><span class="send-msg"></span></div>
          </div>
          <div style="position:sticky;top:0;display:flex;flex-direction:column;gap:12px">
            <span class="xs muted" style="text-transform:uppercase;letter-spacing:.1em">Preview</span>
            <div class="seg-toggle"><button class="${st.pv === "ios" ? "on" : ""}" data-a="pv" data-v="ios">${I("apple")}iOS</button><button class="${st.pv === "android" ? "on" : ""}" data-a="pv" data-v="android">${I("smartphone")}Android</button></div>
            <div data-preview>${preview()}</div>
            <p class="xs muted" style="margin:0">${st.pv === "ios" ? "No iOS o subtítulo aparece entre o app e o título." : "No Android o subtítulo é ignorado; o app aparece como cabeçalho."}</p>
          </div>
        </div>`;
    }
    function preview() {
      const n = st.nt;
      const t = esc(n.title) || "Título da notificação", b = esc(n.body) || "Prévia da mensagem aparece aqui.";
      if (st.pv === "ios") {
        return `<div class="pv-ios"><div class="pv-card"><div class="pv-icon">${I("bell")}</div><div style="flex:1;min-width:0">
          <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:11px;text-transform:uppercase">ROINFLUENCER</span><span class="muted" style="font-size:11px">agora</span></div>
          ${n.subtitle ? `<div class="muted" style="font-size:11px">${esc(n.subtitle)}</div>` : ""}<div style="font-weight:600;font-size:14px">${t}</div>
          <div class="xs muted" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${b}</div></div></div></div>`;
      }
      return `<div class="pv-and"><div class="pv-card" style="flex-direction:column;gap:6px;border-radius:12px"><div class="row" style="gap:6px"><span style="width:20px;height:20px;border-radius:4px;background:rgba(22,163,74,.2);color:#22c55e;display:grid;place-items:center">${I("bell", "", 2.5).replace('class="ic ', 'style="width:12px;height:12px" class="ic ')}</span><span class="muted" style="font-size:11px">ROINFLUENCER · agora</span></div>
        <div style="font-weight:600;font-size:14px">${t}</div><div class="xs muted" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${b}</div></div></div>`;
    }
    function reachList() {
      const withApp = activeInfluencers().filter((i) => i.platform);
      if (st.target === "all") return withApp;
      if (st.target === "group") { const g = M.groups.find((g) => g.id === st.groupId); return withApp.filter((i) => g && g.ids.includes(i.id)); }
      return withApp.filter((i) => st.picked.has(i.id));
    }

    /* ---------- S04 Comunidade ---------- */
    function comunidade() {
      const q = st.comQ.toLowerCase();
      const list = activeInfluencers().filter((i) => !q || i.name.toLowerCase().includes(q) || i.instagram.includes(q));
      return `${title("Comunidade")}
        <div class="filters"><label class="radio"><input type="radio" checked>Mês / Ano</label><label class="radio"><input type="radio">Período personalizado</label></div>
        <div class="filters"><input class="input" style="max-width:320px" placeholder="Buscar influencer..." data-in="comQ" value="${esc(st.comQ)}">
          <select class="input" style="width:140px">${MONTHS.map((m, i) => `<option ${i === M.now.getMonth() ? "selected" : ""}>${m}</option>`).join("")}</select>
          <select class="input" style="width:100px"><option>${M.now.getFullYear()}</option></select></div>
        <table><thead><tr><th>Influencer</th><th><span class="row" style="gap:6px">${I("users")}Seguidores</span></th><th><span class="row" style="gap:6px">${I("images")}Posts</span></th><th class="r">Detalhe</th></tr></thead><tbody>
        ${list.map((i) => `<tr><td><div class="row" style="gap:10px">${av(i.name, 36)}<div><div style="font-weight:500">${esc(i.name)}</div><div class="xs muted">${i.instagram}</div></div></div></td><td style="font-weight:500">${f.num(i.followers)}</td><td>${i.posts}</td>
          <td class="r"><button class="btn ghost sm" data-a="detail" data-v="${i.id}">Ver${I("chevron-right")}</button></td></tr>`).join("")}</tbody></table>`;
    }
    const KINDS = { post: ["Post", "#2563eb"], reels: ["Reels", "#c026d3"], story_mention: ["Story", "#f59e0b"], post_mention: ["Menção · Post", "#059669"], reel_mention: ["Menção · Reel", "#e11d48"] };
    const CAPTIONS = ["Look do treino de hoje com a nova legging", "Meu kit favorito chegou 💜", "3 dicas para treinar em casa", "Unboxing da coleção nova", "Cupom liberado nos stories!", "Antes e depois da corrida", "O top que não sai do meu corpo", "Rotina de domingo", "Provador: 4 combinações", "Treino de pernas 🔥", "Recebidos da semana", "Desafio de 7 dias"];
    function mediaFor(inf) {
      const r = (n) => { let x = Math.sin(n * 9301 + inf.id.length * 49297) * 233280; return x - Math.floor(x); };
      const kinds = ["reels", "post_mention", "story_mention", "post", "reel_mention", "reels", "post", "story_mention", "post_mention", "reels", "post", "reel_mention"];
      return kinds.map((k, n) => {
        const hue = 280 + Math.floor(r(n + inf.name.length) * 80) - 40;
        return { kind: k, cap: CAPTIONS[(n + inf.name.length) % CAPTIONS.length], hue, likes: Math.floor(200 + r(n) * 4200), comments: Math.floor(8 + r(n + 3) * 180), days: n * 2 + 1 };
      });
    }
    function detalhe() {
      const inf = M.byId(st.detail);
      const media = mediaFor(inf);
      const counts = { posts: 6, reels: 5, stories: 3 };
      const gain = Math.round(inf.followers * 0.025);
      const card = (ic, label, val, extra = "") => `<div class="card" style="padding:16px;gap:4px"><span class="row xs muted" style="gap:6px;text-transform:uppercase;letter-spacing:.04em">${I(ic)}${label}</span><span style="font-size:24px;font-weight:600">${val}</span>${extra}</div>`;
      return `<div><button class="btn ghost sm" data-a="nav" data-v="comunidade">${I("arrow-left")}Comunidade</button></div>
        <div class="row" style="gap:16px">${av(inf.name, 64)}<div><h1 style="margin:0;font-size:20px;font-weight:600">${esc(inf.name)}</h1><div class="muted">${inf.instagram} · CREATOR</div><div class="xxs muted" style="opacity:.6">Sincronizado em ${f.ddmmyyyy(new Date(Date.now() - 864e5))}</div></div></div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px">
          ${card("users", "Seguidores", f.num(inf.followers), `<span class="row xs" style="gap:4px;color:#22c55e">${I("trending-up")}+${f.num(gain)} no período</span>`)}
          ${card("at-sign", "Menções", counts.posts + counts.reels + counts.stories)}${card("images", "Posts", counts.posts)}${card("film", "Reels", counts.reels)}${card("at-sign", "Stories", counts.stories)}
        </div>
        <div class="ptitle">Menções</div>
        <table><thead><tr><th>Data</th><th>Legenda</th><th class="r">Link</th></tr></thead><tbody>
          ${media.filter((m) => m.kind.includes("mention")).slice(0, 3).map((m) => `<tr><td class="muted">${f.ddmmyyyy(new Date(Date.now() - m.days * 864e5))}</td><td>${esc(m.cap)} @${M.business.instagram.slice(1)}</td><td class="r"><button class="btn ghost sm icon">${I("external-link")}</button></td></tr>`).join("")}
        </tbody></table>
        <div class="ptitle">Mídias</div>
        <div class="masonry">${media.map((m, n) => {
          const [label, color] = KINDS[m.kind];
          const tall = m.kind.includes("reel") || m.kind.includes("story");
          return `<div class="media" data-a="media" data-v="${n}"><div class="art" style="aspect-ratio:${tall ? "1/1.45" : "1/1"};background:radial-gradient(circle at 30% 20%, hsl(${m.hue} 70% 62%), hsl(${m.hue + 30} 60% 30%) 60%, hsl(${m.hue + 50} 50% 14%))">
            ${I(tall ? "circle-play" : "images")}<span class="kind" style="background:${color}">${label}</span><span class="cap">${esc(m.cap)}</span></div>
            <div class="foot"><span>${I("heart")}${f.num(m.likes)}</span><span>${I("message-circle")}${m.comments}</span></div></div>`;
        }).join("")}</div>`;
    }

    /* ---------- S05 Vendas ---------- */
    function filteredOrders() {
      const v = st.v;
      return M.orders.filter((o) => (!v.coupon || o.coupon === v.coupon) && (!v.q || o.ext.includes(v.q)) &&
        (!v.from || o.at >= new Date(v.from + "T00:00")) && (!v.to || o.at <= new Date(v.to + "T23:59")));
    }
    function vendas() {
      const list = filteredOrders();
      const valid = list.filter(M.isValid);
      const sales = valid.reduce((s, o) => s + o.total, 0), comm = valid.filter((o) => o.status === "paid").reduce((s, o) => s + o.commission, 0);
      const per = 15, pages = Math.max(1, Math.ceil(list.length / per));
      st.v.page = Math.min(st.v.page, pages);
      const rows = list.slice((st.v.page - 1) * per, st.v.page * per);
      const coupons = M.influencers.flatMap((i) => i.coupons.filter((c) => c.active).map((c) => c.code));
      return `<div class="phead">${title("Vendas")}<button class="btn outline sm" data-a="csv">${I("download")}Exportar CSV</button></div>
        <div class="filters"><input type="date" class="input" style="width:155px" data-ch="v.from" value="${st.v.from}"><input type="date" class="input" style="width:155px" data-ch="v.to" value="${st.v.to}">
          <input class="input" style="width:180px" placeholder="ID do pedido..." data-in="v.q" value="${esc(st.v.q)}">
          <select class="input" style="width:170px" data-ch="v.coupon"><option value="">Todos os cupons</option>${coupons.map((c) => `<option ${c === st.v.coupon ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        <div class="summary">${kpi("Total Vendas", f.brl(sales), "no período", "v_sales")}${kpi("Total Comissões", `<span class="green">${f.brl(comm)}</span>`, "em vendas pagas", "v_comm")}${kpi("Pedidos", valid.length, "pedidos válidos", "v_orders")}${kpi("Ticket Médio", f.brl(valid.length ? sales / valid.length : 0), "por pedido", "v_ticket")}</div>
        <div class="card p0"><table><thead><tr><th class="xs">Data</th><th class="xs">ID Pedido</th><th class="xs">Influencer</th><th class="xs">Cupom</th><th class="xs">Plataforma</th><th class="xs r">Valor</th><th class="xs r">Comissão</th></tr></thead><tbody>
          ${rows.length ? rows.map((o) => { const inf = M.byId(o.infId), bad = !M.isValid(o); return `<tr class="${bad ? "cancelled" : ""} ${st.highlight === o.id ? "new" : ""}"><td class="xs muted">${f.dmh(o.at)}</td><td class="xs mono muted strike">${o.ext}</td>
            <td><span class="row" style="gap:8px">${av(inf.name, 24)}<span class="xs">${esc(inf.name)}</span></span></td><td><span class="badge secondary mono" style="font-size:10px">${o.coupon}</span></td>
            <td>${bad ? `<span class="badge cancel" style="font-size:10px">${o.status}</span>` : `<span class="badge nuvem" style="font-size:10px;border-radius:999px">${o.platform}</span>`}</td><td class="xs r strike">${f.brl(o.total)}</td><td class="xs r green strike" style="font-weight:500">${f.brl(o.commission)}</td></tr>`; }).join("")
          : `<tr><td colspan="7"><div class="empty">${I("package-open")}Nenhuma venda encontrada</div></td></tr>`}
        </tbody></table></div>
        ${pages > 1 ? `<div class="pager"><button class="btn outline sm" data-a="page" data-v="${st.v.page - 1}" ${st.v.page === 1 ? "disabled" : ""}>${I("chevron-left")}Anterior</button>
          ${pageList(st.v.page, pages).map((p) => p === "…" ? `<span class="muted" style="padding:0 6px">…</span>` : `<button class="btn sm pg ${p === st.v.page ? "" : "outline"}" data-a="page" data-v="${p}">${p}</button>`).join("")}
          <button class="btn outline sm" data-a="page" data-v="${st.v.page + 1}" ${st.v.page === pages ? "disabled" : ""}>Próximo${I("chevron-right")}</button></div>` : ""}`;
    }
    function pageList(cur, total) {
      const set = [...new Set([1, cur - 1, cur, cur + 1, total])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
      const out = [];
      set.forEach((p, i) => { if (i && p - set[i - 1] > 1) out.push("…"); out.push(p); });
      return out;
    }

    /* ---------- S06 Ranking ---------- */
    function ranking() {
      const rows = M.ranking().filter((r) => !removed.has(r.inf.id) && r.total_orders);
      const tabs = `<div class="tabs"><button class="${st.rankTab === "geral" ? "on" : ""}" data-a="rtab" data-v="geral">Ranking Geral</button><button class="${st.rankTab === "camp" ? "on" : ""}" data-a="rtab" data-v="camp">Campanhas<span class="count-pill">${M.campaigns.length}</span></button></div>`;
      const pos = (i) => (i < 3 ? `<span class="pos p${i + 1}">${i + 1}</span>` : `<span class="xs muted" style="padding-left:8px">${i + 1}</span>`);
      const head = `<div class="phead">${title("Ranking")}<button class="btn sm" data-a="newcamp">${I("plus")}Criar Campanha</button></div>${tabs}`;
      if (st.rankTab === "geral") {
        return `${head}<div class="card p0"><table><thead><tr><th class="xs" style="width:60px">#</th><th class="xs">Influencer</th><th class="xs r">Pedidos</th><th class="xs r">Vendas</th><th class="xs r">Comissão</th></tr></thead><tbody>
          ${rows.map((r, i) => `<tr class="${i < 3 ? "b" + (i + 1) : ""}"><td>${pos(i)}</td><td><span class="row" style="gap:10px">${av(r.inf.name)}${i === 0 ? `<span style="color:#eab308">${I("crown")}</span>` : ""}<span style="font-weight:500">${esc(r.inf.name)}</span></span></td>
            <td class="r xs muted">${r.total_orders}</td><td class="r">${f.brl(r.total_sales)}</td><td class="r green" style="font-weight:500">${f.brl(r.total_commission)}</td></tr>`).join("")}</tbody></table></div>`;
      }
      return `${head}<div class="camp-grid">${M.campaigns.map((c) => {
        const r = M.ranking((o) => o.at >= c.start && o.at <= new Date(c.end.getTime() + 864e5 - 1)).filter((x) => c.participants.includes(x.inf.id) && x.total_orders).slice(0, 5);
        return `<div class="camp ${st.highlight === c.id ? "new" : ""}"><div><div class="xs muted" style="font-weight:500;margin-bottom:8px">Prêmios</div><div class="prize-badges">${c.prizes.map((p) => `<span class="badge secondary">${prizeEmoji(p)} ${prizeLabel(p)}</span>`).join("")}</div></div>
          <div style="height:1px;background:var(--border)"></div>
          ${r.length ? `<table style="font-size:12px"><thead><tr><th class="xs">#</th><th class="xs">Influencer</th><th class="xs r">Vendas</th><th class="xs r">Comissão</th></tr></thead><tbody>${r.map((x, i) => `<tr><td style="padding-left:0">${pos(i)}</td><td><span class="row" style="gap:8px">${av(x.inf.name, 24)}${esc(x.inf.name)}</span></td><td class="r">${f.brl(x.total_sales)}</td><td class="r green">${f.brl(x.total_commission)}</td></tr>`).join("")}</tbody></table>` : `<div class="xs muted">Nenhuma venda registrada</div>`}
          <div class="row" style="justify-content:space-between"><div><div style="font-weight:600">${esc(c.name)}</div><div class="xs muted">${f.dMonY(c.start)} → ${c.end ? f.dMonY(c.end) : "Sem fim"}</div></div>
            <div class="row">${statusBadge[c.status]}<button class="btn ghost icon" style="height:28px;width:28px" data-a="delcamp" data-v="${c.id}" title="Excluir">${I("ellipsis")}</button></div></div></div>`;
      }).join("")}</div>`;
    }

    /* ---------- S07 Integrações ---------- */
    function integracoes() {
      const integ = (logo, name, badge, desc, footer, soon) => `<div class="integ ${soon ? "soon" : ""}"><div class="row" style="gap:12px">${logo}<div><div class="card-t">${name}</div>${badge}</div></div><p class="muted" style="margin:0;flex:1">${desc}</p>${footer}</div>`;
      return `${title("Integrações")}
        <div class="grid3"><div class="integ"><span class="muted">${I("settings").replace('class="ic ', 'style="width:32px;height:32px" class="ic ')}</span><div class="card-t">Taxas</div><p class="muted" style="margin:0">Configure as Taxas dos seus pedidos!</p><button class="btn full" data-a="fees">Configurar</button></div></div>
        <div style="height:1px;background:var(--border)"></div>
        <div class="grid3">
          ${integ(`<span class="logo-tile" style="background:#2c6bed">${I("store")}</span>`, "NuvemShop", st.integ.ns ? '<span class="badge green-solid">Conectado</span>' : '<span class="badge outline">Desconectado</span>',
            `Sincronize os pedidos da sua loja <u style="color:var(--sb-primary)">NuvemShop</u>`,
            st.integ.ns ? `<button class="btn outline full" style="color:var(--red)" data-a="unplug" data-v="ns">${I("unplug")}Desconectar</button>` : `<div><span class="label xs">Link da loja</span><input class="input" placeholder="exempleloja.lojavirtualnuvem.com.br"></div><button class="btn full" data-a="plug" data-v="ns">Conectar</button>`)}
          ${integ(`<span class="logo-tile" style="background:linear-gradient(45deg,#f59e0b,#db2777,#7c3aed)">${I("camera")}</span>`, "Instagram", st.integ.ig ? `<span class="badge green-solid">${M.business.instagram}</span>` : '<span class="badge outline">Desconectado</span>',
            "Conecte sua conta profissional para coletar seguidores, posts, reels e menções.",
            st.integ.ig ? `<button class="btn outline full" style="color:var(--red)" data-a="unplug" data-v="ig">${I("unplug")}Desconectar</button>` : `<button class="btn full" data-a="plug" data-v="ig">${I("camera")}Conectar</button>`)}
          ${integ(`<span class="logo-tile" style="background:#65a30d">P</span>`, "Pagar.me", '<span class="badge outline">Em breve</span>', "Sincronize os pedidos processados pela Pagar.me", '<button class="btn full" disabled>Conectar</button>', true)}
          ${integ(`<span class="logo-tile" style="background:#0f766e">C</span>`, "Cakto", '<span class="badge outline">Em breve</span>', "Sincronize os pedidos processados pela Cakto", '<button class="btn full" disabled>Conectar</button>', true)}
        </div>`;
    }

    /* ---------- S08 Configurações ---------- */
    function config() {
      const tab = (id, l) => `<button class="${st.cfgTab === id ? "on" : ""}" data-a="cfg" data-v="${id}">${l}</button>`;
      const monthOrders = M.orders.filter((o) => o.at.getMonth() === M.now.getMonth() && o.at.getFullYear() === M.now.getFullYear()).length;
      const meter = (l, a, b) => `<div><div class="row" style="justify-content:space-between;margin-bottom:4px"><span>${l}</span><span>${a}/${b}</span></div><div class="progress"><i style="width:${Math.min(100, (a / b) * 100)}%"></i></div></div>`;
      const field = (l, v, dis, span) => `<div style="${span ? "grid-column:span 2" : ""}"><span class="label">${l}</span><input class="input" value="${esc(v)}" ${dis ? 'disabled style="background:var(--muted)"' : ""}></div>`;
      let body = "";
      if (st.cfgTab === "perfil") body = `<div class="card" style="padding:24px"><div class="row" style="gap:16px"><span class="av" style="width:64px;height:64px;background:var(--primary);color:var(--primary-fg);font-size:18px;font-weight:600">${M.business.initials}</span><button class="btn outline sm" disabled>Alterar foto</button></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${field("Nome", M.business.name)}${field("Email", M.business.email, true)}${field("Telefone", M.business.phone)}${field("Instagram", M.business.instagram)}${field("Site", M.business.site, false, true)}</div>
        <div class="row"><button class="btn" data-a="saved">Salvar alterações</button><span class="save-msg"></span></div></div>`;
      if (st.cfgTab === "plano") body = `<div class="card" style="padding:24px"><div class="row"><h3 style="margin:0;font-size:18px;font-weight:600">Plano ${M.business.plan}</h3><span class="badge" style="background:rgba(138,1,148,.15);color:#f0abfc">Ativo</span></div>
        <div class="xs muted" style="margin-top:-16px">Desde 12 de março de 2026</div>${meter("Influencers", activeInfluencers().length, 150)}${meter("Pedidos", monthOrders, 2000)}${meter('Notificações <span class="xs muted">(este mês)</span>', Math.min(2, M.notifHistory.length), 2)}
        <div><button class="btn">Fazer upgrade</button></div></div>`;
      if (st.cfgTab === "seg") body = `<div class="card" style="padding:24px;gap:16px">${["Senha atual", "Nova senha", "Confirmar nova senha"].map((l) => `<div><span class="label">${l}</span><input type="password" class="input"></div>`).join("")}<div><button class="btn">Alterar senha</button></div></div>`;
      return `${title("Configurações")}<div class="cfg"><nav>${tab("perfil", "Perfil")}${tab("plano", "Plano")}${tab("seg", "Segurança")}</nav><div style="flex:1">${body}</div></div>`;
    }

    const PAGES = { dashboard, influencers, notificacoes, comunidade, detalhe, vendas, ranking, integracoes, config };

    /* ---------- pós-render: gráficos e contadores ---------- */
    function after() {
      const dEl = main.querySelector('[data-chart="days"]');
      if (dEl) Charts.line(dEl, M.salesByDay(st.days).map((d) => ({ label: d.label, value: d.total })), { yFmt, tip: (d) => `<div style="color:#fff">${d.label}</div><div style="color:#fff">Vendas : ${f.brl(d.value)}</div>`, xEvery: st.days === 7 ? 1 : st.days === 15 ? 2 : 4 });
      const mEl = main.querySelector('[data-chart="months"]');
      if (mEl) Charts.line(mEl, M.salesByMonth(st.months).map((d) => ({ label: d.label, value: d.total })), { yFmt, tip: (d) => `<div style="color:#fff">${d.label}</div><div style="color:#fff">Vendas : ${f.brl(d.value)}</div>`, xEvery: st.months === 12 ? 2 : 1 });
      if (st.route === "dashboard") {
        const k = M.kpis();
        if (st.prevKpi && st.highlight) {
          const p = st.prevKpi;
          animateKpi("total_commission", p.total_commission, k.total_commission, f.brl);
          animateKpi("total_sales", p.total_sales, k.total_sales, f.brl);
          animateKpi("avg_ticket", p.avg_ticket, k.avg_ticket, f.brl);
          animateKpi("roi", p.roi, k.roi, (v) => v.toFixed(2) + "x");
        }
        st.prevKpi = k;
      }
      st.highlight = null;
    }
    function animateKpi(key, from, to, fmt) {
      const box = main.querySelector(`[data-kpi="${key}"]`);
      if (!box) return;
      const el = box.querySelector(".v");
      box.classList.add("flash");
      const t0 = performance.now();
      (function step(t) {
        const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
      setTimeout(() => box.classList.remove("flash"), 1000);
    }

    /* ---------- camadas ---------- */
    function openLayer(html, kind = "dialog") {
      layer.innerHTML = `<div class="overlay" data-a="close"></div>${kind === "dialog" ? `<div class="dialog" role="dialog">${html}<button class="btn ghost icon x-close" data-a="close" aria-label="Fechar">${I("x")}</button></div>` : `<div class="sheet ${kind === "wide" ? "wide" : ""}" role="dialog">${html}</div>`}`;
    }
    function closeLayer() { layer.innerHTML = ""; }
    let toastT;
    function toast(msg) {
      const t = root.querySelector(".btoast");
      t.innerHTML = I("circle-check") + msg; t.classList.add("show");
      clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
    }

    function invitesSheet(highlightFirst) {
      openLayer(`<div class="sh-h"><h3><span style="color:#eab308">${I("clock")}</span>Convites pendentes</h3><p class="desc">Estes influencers ainda não aceitaram o convite.</p><button class="btn ghost icon x-close" data-a="close">${I("x")}</button></div>
        <div class="sh-b">${M.pendingInvites.length ? M.pendingInvites.map((p, i) => `<div class="row ${highlightFirst && i === 0 ? "hl-pulse" : ""}" style="gap:12px;border:1px solid var(--border);border-radius:8px;padding:12px">${av(p.name, 40)}<div style="flex:1"><div style="font-weight:500">${esc(p.name)}</div><div class="xs muted">${p.instagram}</div><div class="xxs muted" style="opacity:.6">Convidado em ${f.longDate(p.invitedAt)}</div></div><button class="btn ghost icon" data-a="cancelinv" data-v="${p.id}" title="Cancelar convite">${I("x")}</button></div>`).join("")
          : `<div class="empty">${I("clock")}Nenhum convite pendente.</div>`}</div>`, "sheet");
    }

    function addInfluencerDialog() {
      openLayer(`<div style="display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center">
        <div><h3 style="justify-content:center">Adicionar Influencer</h3><p class="desc">Digite o código do influencer para conectá-lo à sua conta.</p></div>
        <div class="otp">${[0, 1, 2, 3].map((i) => `<input maxlength="1" data-otp="${i}" aria-label="Caractere ${i + 1}">`).join("")}<span class="dot"></span>${[4, 5, 6, 7].map((i) => `<input maxlength="1" data-otp="${i}" aria-label="Caractere ${i + 1}">`).join("")}</div>
        <button class="btn outline full" data-a="search" disabled>Pesquisar</button><div class="found" style="width:100%;display:flex;flex-direction:column;gap:12px"></div></div>`);
      setTimeout(() => layer.querySelector('[data-otp="0"]')?.focus(), 50);
    }

    function couponsSheet(id) {
      const inf = M.byId(id);
      const box = (c) => `<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <div class="row" style="justify-content:space-between;padding:8px 12px;background:rgba(42,42,46,.3)"><span class="mono" style="font-weight:600">${c.code}</span><span class="row"><button class="switch ${c.active ? "on" : ""}" data-a="togglecp" data-v="${c.id}" aria-label="Ativar cupom"></button><button class="btn ghost icon" style="color:#C62828;height:28px" data-a="delcp" data-v="${c.id}">${I("trash-2")}</button></span></div>
        ${c.periods.map((p) => `<div class="row" style="justify-content:space-between;padding:10px 12px;border-top:1px solid var(--border)"><div><div style="font-weight:500">${p.pct}%</div><div class="xxs muted">${p.from ? f.ddmmyyyy(p.from) : "Início"} → ${p.to ? f.ddmmyyyy(p.to) : '<span style="color:#22c55e;font-weight:500">em aberto</span>'}</div></div><span class="row muted">${I("pen")}${I("trash-2")}</span></div>`).join("")}
        <button class="btn ghost xs" style="margin:6px 8px;color:var(--muted-fg)">${I("plus")}Adicionar período</button></div>`;
      openLayer(`<div class="sh-h"><h3>Cupons de ${esc(inf.name)}</h3><p class="desc">Gerencie os cupons e comissões deste influencer.</p><button class="btn ghost icon x-close" data-a="close">${I("x")}</button></div>
        <div class="sh-b" data-inf="${id}"><div><span class="label">Cupons cadastrados</span><div style="display:flex;flex-direction:column;gap:10px">${inf.coupons.map(box).join("") || '<span class="muted">Nenhum cupom cadastrado.</span>'}</div></div>
          <div style="display:flex;flex-direction:column;gap:10px"><span class="label" style="margin:0">Adicionar cupom</span>
            <input class="input mono" placeholder="Ex: GABRIEL10" data-newcp="code" style="text-transform:uppercase">
            <div class="row"><input class="input" type="number" placeholder="Comissão %" data-newcp="pct" style="width:140px"><span class="muted">%</span></div>
            <div class="row"><button class="btn outline sm" style="flex:1">${I("calendar")}De (opcional)</button><button class="btn outline sm" style="flex:1">${I("calendar")}Até (opcional)</button></div>
            <span class="cp-err xs" style="color:var(--red)"></span>
            <button class="btn full" data-a="addcp" data-v="${id}">${I("plus")}Adicionar cupom</button></div></div>`, "sheet");
    }

    function campaignSheet() {
      const conn = activeInfluencers().flatMap((i) => i.coupons.filter((c) => c.active).map((c) => ({ inf: i, c })));
      openLayer(`<div class="sh-h"><h3>Criar Campanha</h3><button class="btn ghost icon x-close" data-a="close">${I("x")}</button></div>
        <div class="sh-b" data-camp>
          <div><span class="label">Nome</span><input class="input" data-cf="name" placeholder="Ex: Black Friday 2025" value="Black Friday ${M.now.getFullYear()}"></div>
          <div><span class="label">Descrição</span><textarea class="input" rows="2" data-cf="desc">Top vendas de novembro levam prêmio.</textarea></div>
          <div><span class="label">Período</span><div class="row"><input type="date" class="input" data-cf="start" value="${M.now.getFullYear()}-11-01"><input type="date" class="input" data-cf="end" value="${M.now.getFullYear()}-11-30"></div></div>
          <div><span class="label">Prêmios</span><div class="prizes" style="display:flex;flex-direction:column;gap:8px">${prizeBox(1, 1, "valor", "R$ 1.000", "Campeão de vendas")}${prizeBox(2, 3, "porcentagem", "+5%", "Pódio")}</div>
            <button class="btn outline sm" style="margin-top:8px" data-a="addprize">${I("plus")}Adicionar prêmio</button></div>
          <div><span class="label">Influencers participantes</span><div style="border:1px solid var(--border);border-radius:8px;padding:8px">
            <div style="max-height:200px;overflow:auto">${conn.map(({ inf, c }, i) => `<label class="row" style="padding:6px 8px;border-radius:6px;gap:10px;cursor:pointer"><input type="checkbox" ${i < 6 ? "checked" : ""} data-cp="${inf.id}" style="accent-color:#a800b7"><span class="badge secondary mono">${c.code}</span>${av(inf.name, 24)}<span class="xs muted">${esc(inf.name)}</span></label>`).join("")}</div></div>
            <div class="xs muted sel-count" style="margin-top:6px">6 influencers selecionados</div></div>
          <div class="camp-err xs" style="color:var(--red)"></div>
        </div>
        <div class="sh-f"><button class="btn outline" data-a="close">Cancelar</button><button class="btn" data-a="createcamp">Criar campanha</button></div>`, "wide");
    }
    function prizeBox(a, b, type, value, t) {
      return `<div class="prize" style="display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg)">
        <input class="input xs" style="height:32px" placeholder="Título do prêmio (ex: Campeão de vendas)" value="${t}" data-p="title">
        <div class="row"><span class="xxs muted">De</span><input class="input" type="number" min="1" style="width:56px;height:32px" value="${a}" data-p="from"><span class="xxs muted">Até</span><input class="input" type="number" min="1" style="width:56px;height:32px" value="${b}" data-p="to">
          <select class="input" style="height:32px;width:140px" data-p="type">${[["valor", "Valor em R$"], ["porcentagem", "Porcentagem"], ["produto", "Produto"], ["frete", "Frete grátis"]].map(([v, l]) => `<option value="${v}" ${v === type ? "selected" : ""}>${l}</option>`).join("")}</select>
          <input class="input" style="height:32px" placeholder="Valor / Descrição" value="${value}" data-p="value"><button class="btn ghost icon" data-a="rmprize">${I("trash-2")}</button></div></div>`;
    }

    function feesDialog() {
      const F = st.fees;
      const rows = [["pix", "PIX"], ["c1", "Crédito 1x"], ["cn", "Crédito +1x"], ["boleto", "Boleto"], ["debit", "Débito"]];
      const net = (v) => f.brl(100 * (1 - v / 100) * (1 - F.other / 100));
      openLayer(`<div><h3>Taxas por meio de pagamento</h3><p class="desc">Configure as taxas cobradas pela sua plataforma de pagamento.</p></div>
        <div class="row" style="gap:16px;border:1px solid rgba(138,1,148,.3);background:rgba(138,1,148,.05);border-radius:8px;padding:12px">
          <div style="flex:1"><div style="font-weight:600">Taxa base (Outros)</div><div class="xs muted">Incide sobre todas as taxas abaixo</div></div>
          <input class="input" style="width:80px;text-align:center;font-weight:600" data-fee="other" value="${String(F.other).replace(".", ",")}"><span class="muted" data-feeo style="font-variant-numeric:tabular-nums">−${F.other.toFixed(2).replace(".", ",")}%</span></div>
        <div style="display:grid;grid-template-columns:1fr 100px 1fr;gap:12px 16px;align-items:center">
          <span class="xs muted" style="text-transform:uppercase">Método</span><span class="xs muted c" style="text-transform:uppercase">Taxa %</span><span class="xs muted r" style="text-transform:uppercase">/ R$ 100</span>
          ${rows.map(([k, l]) => `<span>${l}</span><input class="input" style="height:32px;text-align:center" data-fee="${k}" value="${String(F[k]).replace(".", ",")}"><span class="r" data-net="${k}" style="font-variant-numeric:tabular-nums">${net(F[k])}</span>`).join("")}
        </div>
        <div class="row" style="justify-content:flex-end"><button class="btn outline" data-a="close">Cancelar</button><button class="btn" data-a="savefees">Salvar</button></div>`);
    }

    /* ---------- eventos ---------- */
    root.addEventListener("click", (e) => {
      const t = e.target.closest("[data-a]");
      if (!e.target.closest(".dropdown, [data-a=usermenu]")) dropdown.classList.remove("open");
      if (!t || !root.contains(t)) return;
      const a = t.dataset.a, v = t.dataset.v;
      switch (a) {
        case "nav": closeLayer(); st.route = v; render(); break;
        case "collapse": st.collapsed = !st.collapsed; root.classList.toggle("collapsed", st.collapsed); setTimeout(() => render(true), 260); break;
        case "usermenu": dropdown.classList.toggle("open"); break;
        case "logout": dropdown.classList.remove("open"); toast("Modo demonstração: a sessão continua ativa."); break;
        case "period": st[t.dataset.k] = Number(v); render(true); break;
        case "close": closeLayer(); break;
        case "invites": invitesSheet(false); break;
        case "cancelinv": M.pendingInvites.splice(M.pendingInvites.findIndex((p) => p.id === v), 1); invitesSheet(false); render(true); break;
        case "addinf": addInfluencerDialog(); break;
        case "search": {
          t.innerHTML = I("loader-circle", "spin"); t.disabled = true;
          setTimeout(() => {
            const p = M.invitePool[M.pendingInvites.length % M.invitePool.length];
            t.innerHTML = "Pesquisar"; t.disabled = false;
            layer.querySelector(".found").innerHTML = `<div class="card" style="padding:16px;flex-direction:row;align-items:center;gap:14px">${av(p.name, 56)}<div style="text-align:left"><div style="font-size:18px;font-weight:600">${esc(p.name)}</div><div class="muted">${p.instagram}</div></div></div><button class="btn full" data-a="confirminv" data-v="${esc(p.name)}|${p.instagram}">Adicionar</button>`;
          }, 700);
          break;
        }
        case "confirminv": {
          const [name, ig] = v.split("|");
          M.pendingInvites.unshift({ id: "x" + Date.now(), name, instagram: ig, invitedAt: new Date() });
          closeLayer(); render(true); setTimeout(() => invitesSheet(true), 120);
          break;
        }
        case "rminf": removed.add(v); render(true); toast("Influencer removido."); break;
        case "coupons": couponsSheet(v); break;
        case "togglecp": { const c = M.influencers.flatMap((i) => i.coupons).find((c) => c.id === v); c.active = !c.active; t.classList.toggle("on", c.active); render(true); break; }
        case "delcp": { const inf = M.influencers.find((i) => i.coupons.some((c) => c.id === v)); inf.coupons = inf.coupons.filter((c) => c.id !== v); couponsSheet(inf.id); render(true); break; }
        case "addcp": {
          const inf = M.byId(v), sheet = layer.querySelector("[data-inf]");
          const code = sheet.querySelector('[data-newcp="code"]').value.trim().toUpperCase(), pct = Number(sheet.querySelector('[data-newcp="pct"]').value);
          const err = sheet.querySelector(".cp-err");
          if (!code || !pct) { err.textContent = "Informe o código e a comissão."; break; }
          if (M.influencers.some((i) => i.coupons.some((c) => c.code === code))) { err.textContent = "Este código já está cadastrado nesta conta."; break; }
          inf.coupons.push({ id: "c" + Date.now(), code, active: true, pct, periods: [{ id: "p" + Date.now(), pct, from: null, to: null }] });
          couponsSheet(v); render(true); toast(`Cupom ${code} criado com ${pct}% de comissão.`);
          break;
        }
        case "detail": st.detail = v; st.route = "detalhe"; render(); break;
        case "media": {
          const inf = M.byId(st.detail), m = mediaFor(inf)[Number(v)], [label, color] = KINDS[m.kind];
          layer.innerHTML = `<div class="overlay" data-a="close"></div><div class="dialog" style="padding:0;width:400px;gap:0;overflow:hidden;background:#000">
            <div style="aspect-ratio:${m.kind.includes("reel") || m.kind.includes("story") ? "9/14" : "1/1"};background:radial-gradient(circle at 30% 20%, hsl(${m.hue} 70% 62%), hsl(${m.hue + 30} 60% 30%) 60%, hsl(${m.hue + 50} 50% 14%));display:grid;place-items:center">${I("circle-play").replace('class="ic ', 'style="width:56px;height:56px;opacity:.8" class="ic ')}</div>
            <div class="row" style="justify-content:space-between;background:var(--muted-50);padding:12px 16px" ><span class="row xs"><span class="badge" style="background:${color};color:#fff;font-size:10px">${label}</span><span class="muted">${f.ddmmyyyy(new Date(Date.now() - m.days * 864e5))}</span></span><span class="row xs" style="gap:4px">${I("external-link")}Ver no Instagram</span></div>
            <div style="padding:12px 16px 16px;background:var(--muted-50);font-size:14px;color:rgba(250,250,250,.8)">${esc(m.cap)} ✨ Use o cupom ${inf.coupons[0].code} @${M.business.instagram.slice(1)}</div></div>`;
          break;
        }
        case "page": st.v.page = Number(v); render(true); break;
        case "csv": {
          const rows = filteredOrders().slice(0, 15);
          const csv = ["Data;ID Pedido;Influencer;Cupom;Plataforma;Status;Valor;Comissão"].concat(rows.map((o) => [f.dmh(o.at), o.ext, M.byId(o.infId).name, o.coupon, o.platform, o.status, o.total.toFixed(2).replace(".", ","), o.commission.toFixed(2).replace(".", ",")].join(";"))).join("\n");
          const a2 = document.createElement("a");
          a2.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
          a2.download = `vendas_${new Date().toISOString().slice(0, 10)}.csv`; a2.click();
          toast("CSV exportado (página atual).");
          break;
        }
        case "rtab": st.rankTab = v; render(true); break;
        case "newcamp": campaignSheet(); break;
        case "addprize": layer.querySelector(".prizes").insertAdjacentHTML("beforeend", prizeBox(4, 5, "frete", "Frete grátis", "Top 5")); break;
        case "rmprize": t.closest(".prize").remove(); break;
        case "createcamp": {
          const sh = layer.querySelector("[data-camp]"), err = sh.querySelector(".camp-err");
          const name = sh.querySelector('[data-cf="name"]').value.trim();
          const prizes = [...sh.querySelectorAll(".prize")].map((p) => ({ title: p.querySelector('[data-p="title"]').value, from: Number(p.querySelector('[data-p="from"]').value), to: Number(p.querySelector('[data-p="to"]').value), type: p.querySelector('[data-p="type"]').value, value: p.querySelector('[data-p="value"]').value }));
          const parts = [...new Set([...sh.querySelectorAll("[data-cp]:checked")].map((c) => c.dataset.cp))];
          const start = new Date(sh.querySelector('[data-cf="start"]').value + "T00:00"), end = new Date(sh.querySelector('[data-cf="end"]').value + "T00:00");
          if (!name) { err.textContent = "Informe o nome da campanha."; break; }
          if (!parts.length) { err.textContent = "Selecione ao menos um influencer."; break; }
          if (!prizes.length) { err.textContent = "Adicione ao menos um prêmio."; break; }
          if (end < start) { err.textContent = "A data de fim não pode ser anterior à data de início."; break; }
          const c = { id: "k" + Date.now(), name, start, end, status: "active", prizes, participants: parts };
          M.campaigns.unshift(c); st.rankTab = "camp"; st.highlight = c.id; closeLayer(); render(); toast("Campanha criada e enviada aos influencers.");
          M.emit("campaign", c);
          break;
        }
        case "delcamp": {
          const c = M.campaigns.find((c) => c.id === v);
          openLayer(`<div><h3>Excluir campanha?</h3><p class="desc">A campanha <b>${esc(c.name)}</b> e todos os seus participantes serão removidos. Esta ação não pode ser desfeita.</p></div><div class="row" style="justify-content:flex-end"><button class="btn outline" data-a="close">Cancelar</button><button class="btn danger" data-a="delcampok" data-v="${v}">Excluir</button></div>`);
          break;
        }
        case "delcampok": M.campaigns.splice(M.campaigns.findIndex((c) => c.id === v), 1); closeLayer(); render(true); break;
        case "ntab": st.notifTab = v; render(true); break;
        case "target": st.target = v; render(true); break;
        case "pv": st.pv = v; render(true); break;
        case "newgroup": {
          openLayer(`<div><h3>Criar grupo</h3><p class="desc">Agrupe influencers para enviar notificações em lote.</p></div><input class="input" placeholder="Nome do grupo" data-gname value="VIPs">
            <div style="border:1px solid var(--border);border-radius:8px;padding:8px;max-height:240px;overflow:auto">${activeInfluencers().map((i, k) => `<label class="row" style="padding:6px;gap:10px"><input type="checkbox" ${k < 3 ? "checked" : ""} data-gm="${i.id}" style="accent-color:#a800b7">${av(i.name, 28)}<span>${esc(i.name)} <span class="xs muted">${i.instagram}</span></span></label>`).join("")}</div>
            <div class="row" style="justify-content:flex-end"><button class="btn" data-a="mkgroup">Criar grupo</button></div>`);
          break;
        }
        case "mkgroup": {
          const ids = [...layer.querySelectorAll("[data-gm]:checked")].map((c) => c.dataset.gm);
          const g = { id: "g" + Date.now(), name: layer.querySelector("[data-gname]").value || "Grupo", ids };
          M.groups.push(g); st.groupId = g.id; st.target = "group"; closeLayer(); render(true);
          break;
        }
        case "send": {
          const list = reachList(); const n = st.nt;
          t.innerHTML = I("loader-circle", "spin") + "Enviando..."; t.disabled = true;
          setTimeout(() => {
            const rec = { id: "n" + Date.now(), at: new Date(), title: n.title, subtitle: n.subtitle, body: n.body, audience: st.target === "all" ? "Todos" : st.target === "group" ? "Grupo: " + (M.groups.find((g) => g.id === st.groupId)?.name || "") : `${list.length} influencers`, recipients: list.length, delivered: list.length, failed: 0, status: "sent" };
            M.notifHistory.unshift(rec);
            M.emit("push", { ...rec, ids: list.map((i) => i.id), business: M.business.name });
            st.nt = { title: "", subtitle: "", body: "" };
            render(true);
            const msg = main.querySelector(".send-msg");
            if (msg) { msg.innerHTML = `<span class="row" style="color:#22c55e;gap:6px">${I("circle-check")}Notificação enviada!</span>`; setTimeout(() => (msg.innerHTML = ""), 3500); }
          }, 900);
          break;
        }
        case "ndetail": {
          const n = M.notifHistory.find((x) => x.id === v);
          const payload = { title: n.title || null, subtitle: n.subtitle || null, body: n.body, data: { type: "notificacao", screen: "business-request", tab: "notificacoes" }, priority: "high", sound: "default", channelId: "default" };
          openLayer(`<div class="sh-h"><h3>Detalhe do envio</h3><p class="desc">${f.longDateTime(n.at)}</p><button class="btn ghost icon x-close" data-a="close">${I("x")}</button></div>
            <div class="sh-b"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${[["Público", n.recipients], ["Enviados", n.delivered], ["Falhas", n.failed]].map(([l, x]) => `<div style="border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center"><div class="xs muted">${l}</div><div style="font-size:18px;font-weight:600">${x}</div></div>`).join("")}</div>
            <span class="label" style="margin:0">Payload Expo</span><pre style="margin:0;font-size:11px;background:rgba(42,42,46,.4);border-radius:8px;padding:12px;white-space:pre-wrap" class="mono">${esc(JSON.stringify(payload, null, 2))}</pre></div>`, "sheet");
          break;
        }
        case "fees": feesDialog(); break;
        case "savefees": closeLayer(); toast("Taxas salvas. As comissões passam a usar o valor líquido."); break;
        case "unplug": {
          const name = v === "ns" ? "NuvemShop" : "Instagram";
          openLayer(`<div><h3>Desconectar ${name}?</h3><p class="desc">${v === "ns" ? "Isso vai remover o token de acesso. Novos pedidos não serão mais sincronizados. Você pode reconectar a qualquer momento." : "Isso remove o token de acesso. A coleta de métricas será interrompida. Você pode reconectar a qualquer momento."}</p></div><div class="row" style="justify-content:flex-end"><button class="btn outline" data-a="close">Cancelar</button><button class="btn danger" data-a="unplugok" data-v="${v}">Desconectar</button></div>`);
          break;
        }
        case "unplugok": st.integ[v] = false; closeLayer(); render(true); break;
        case "plug": t.innerHTML = I("loader-circle", "spin") + "Conectando..."; setTimeout(() => { st.integ[v] = true; render(true); toast(v === "ns" ? "Loja conectada. Pedidos sincronizando." : "Instagram conectado."); }, 900); break;
        case "cfg": st.cfgTab = v; render(true); break;
        case "saved": { const m = main.querySelector(".save-msg"); m.innerHTML = `<span class="row" style="color:#22c55e;gap:6px">${I("circle-check")}Alterações salvas com sucesso.</span>`; break; }
      }
    });

    root.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.a === "infmode") { st.infMode = t.value; render(true); return; }
      if (t.dataset.a === "pick") { if (t.checked) st.picked.add(t.value); else st.picked.delete(t.value); render(true); return; }
      if (t.matches("[data-cp]")) { const n = layer.querySelectorAll("[data-cp]:checked").length; layer.querySelector(".sel-count").textContent = `${n} influencers selecionados`; return; }
      const k = t.dataset.ch;
      if (!k) return;
      const val = t.value;
      if (k === "infMonth" || k === "infYear") { st[k] = Number(val); render(true); }
      else if (k === "groupId") { st.groupId = val; render(true); }
      else if (k.startsWith("v.")) { st.v[k.slice(2)] = val; st.v.page = 1; render(true); }
    });

    root.addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.otp != null) {
        t.value = t.value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 1);
        const i = Number(t.dataset.otp);
        if (t.value && i < 7) layer.querySelector(`[data-otp="${i + 1}"]`).focus();
        const code = [...layer.querySelectorAll("[data-otp]")].map((x) => x.value).join("");
        layer.querySelector("[data-a=search]").disabled = code.length < 8;
        return;
      }
      if (t.dataset.fee) {
        st.fees[t.dataset.fee] = parseFloat(t.value.replace(",", ".")) || 0;
        const F = st.fees;
        layer.querySelectorAll("[data-net]").forEach((el) => (el.textContent = f.brl(100 * (1 - F[el.dataset.net] / 100) * (1 - F.other / 100))));
        layer.querySelector("[data-feeo]").textContent = `−${F.other.toFixed(2).replace(".", ",")}%`;
        return;
      }
      const k = t.dataset.in;
      if (!k) return;
      if (k.startsWith("nt.")) {
        st.nt[k.slice(3)] = t.value;
        main.querySelector("[data-preview]").innerHTML = preview();
        const c = main.querySelector("[data-count]"); if (c) c.textContent = `${st.nt.body.length}/800`;
        const sb = main.querySelector("[data-a=send]"); if (sb) sb.disabled = !(st.nt.body.trim() && reachList().length);
        return;
      }
      const pos = t.selectionStart;
      if (k === "infQ") st.infQ = t.value;
      else if (k === "comQ") st.comQ = t.value;
      else if (k === "v.q") { st.v.q = t.value; st.v.page = 1; }
      render(true);
      const again = main.querySelector(`[data-in="${k}"]`);
      if (again) { again.focus(); again.setSelectionRange(pos, pos); }
    });

    root.addEventListener("keydown", (e) => {
      if (e.target.dataset.otp != null && e.key === "Backspace" && !e.target.value) {
        const i = Number(e.target.dataset.otp);
        if (i > 0) layer.querySelector(`[data-otp="${i - 1}"]`).focus();
      }
    });
    root.addEventListener("paste", (e) => {
      if (e.target.dataset.otp == null) return;
      e.preventDefault();
      const code = (e.clipboardData.getData("text") || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 8);
      layer.querySelectorAll("[data-otp]").forEach((x, i) => (x.value = code[i] || ""));
      layer.querySelector("[data-a=search]").disabled = code.length < 8;
    });

    /* venda nova chegando */
    M.on("order", (o) => {
      if (layer.innerHTML && st.route !== "dashboard" && st.route !== "vendas") return;
      if (["dashboard", "vendas", "ranking", "influencers"].includes(st.route)) {
        st.highlight = o.id;
        render(true);
      }
    });
    M.on("refresh", () => render(true));

    root.dataset.uid = Math.random().toString(36).slice(2, 7);
    render();
    return {
      go(r, patch) { closeLayer(); dropdown.classList.remove("open"); Object.assign(st, patch); st.route = r; render(); },
      /* destaca um bloco da tela atual (usado pelos chips do slide) */
      spot(sel) {
        main.querySelectorAll(sel).forEach((el) => {
          const box = el.closest(".kpi, .card") || el;
          box.classList.remove("spot"); void box.offsetWidth; box.classList.add("spot");
        });
      },
      render: () => render(true), get route() { return st.route; },
    };
  };
})();
