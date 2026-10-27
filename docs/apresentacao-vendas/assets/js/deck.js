/* Navegação dos slides, escala do palco e interações dos slides de conteúdo. */
(function () {
  const stage = document.querySelector(".stage");
  const slides = Array.from(document.querySelectorAll(".slide"));
  const nav = document.querySelector(".deck-nav");
  const hint = document.querySelector(".hint");
  const countEl = nav.querySelector(".count");
  const progress = document.querySelector(".deck-progress");
  const overview = document.querySelector(".overview");
  let current = 0;

  /* ---------- escala do palco 1920×1080 ---------- */
  const viewport = document.querySelector(".viewport");
  function fit() {
    const w = viewport.clientWidth || window.innerWidth, h = viewport.clientHeight || window.innerHeight;
    const s = Math.min(w / 1920, h / 1080);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
    stage.style.width = "1920px";
    stage.style.height = "1080px";
    document.documentElement.style.setProperty("--stage-scale", s);
  }
  window.addEventListener("resize", fit);
  // painéis e iframes podem mudar de tamanho sem disparar "resize" na janela
  if (window.ResizeObserver) new ResizeObserver(fit).observe(viewport);
  fit();

  /* ---------- navegação ---------- */
  function go(i, opts = {}) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === current && !opts.force) return;
    const prev = slides[current];
    prev.classList.remove("active");
    prev.dispatchEvent(new CustomEvent("slide:leave"));
    current = i;
    const next = slides[current];
    next.classList.add("active");
    next.dispatchEvent(new CustomEvent("slide:enter"));
    countEl.textContent = `${current + 1} / ${slides.length}`;
    progress.style.width = `${((current + 1) / slides.length) * 100}%`;
    if (!opts.noHash) history.replaceState(null, "", `#${current + 1}`);
    overview.querySelectorAll("button").forEach((b, k) => b.classList.toggle("current", k === current));
  }
  window.Deck = { go, next: () => go(current + 1), prev: () => go(current - 1), get current() { return current; }, toast };

  nav.querySelector("[data-act=prev]").addEventListener("click", () => go(current - 1));
  nav.querySelector("[data-act=next]").addEventListener("click", () => go(current + 1));
  nav.querySelector("[data-act=overview]").addEventListener("click", toggleOverview);
  nav.querySelector("[data-act=full]").addEventListener("click", toggleFull);

  function isTyping(e) {
    const t = e.target;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  }
  let digits = "";
  let lastNav = 0;
  let digitTimer;
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTyping(e)) {
      if (e.key === "Escape") e.target.blur();
      return;
    }
    const k = e.key;
    // espaço/enter num botão focado acionam o botão, não o slide
    if ((k === " " || k === "Enter") && e.target.closest && e.target.closest("button, a, [role=button]") && !digits) return;
    if (overview.classList.contains("open")) {
      if (k === "Escape" || k === "o" || k === "O") toggleOverview();
      return;
    }
    const navKey = ["ArrowRight", "ArrowLeft", "PageDown", "PageUp", " ", "Backspace"].includes(k);
    if (navKey && (e.repeat || performance.now() - lastNav < 250)) { e.preventDefault(); return; }
    if (navKey) lastNav = performance.now();
    if (k === "ArrowRight" || k === "PageDown" || k === " ") {
      e.preventDefault(); go(current + 1);
    } else if (k === "ArrowLeft" || k === "PageUp" || k === "Backspace") {
      e.preventDefault(); go(current - 1);
    } else if (k === "Home") { go(0); }
    else if (k === "End") { go(slides.length - 1); }
    else if (k === "f" || k === "F") { toggleFull(); }
    else if (k === "o" || k === "O") { toggleOverview(); }
    else if (k === "Escape") { exitFocus(); }
    else if (/^[0-9]$/.test(k)) {
      digits += k; clearTimeout(digitTimer);
      digitTimer = setTimeout(() => { digits = ""; }, 1500);
    } else if (k === "Enter" && digits) {
      go(parseInt(digits, 10) - 1); digits = "";
    }
  });

  function exitFocus() {
    const s = slides[current];
    if (s.classList.contains("focus")) s.querySelector("[data-act=focus]")?.click();
  }

  function toggleFull() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  /* visão geral */
  const grid = overview.querySelector(".overview-grid");
  slides.forEach((s, i) => {
    const b = document.createElement("button");
    b.innerHTML = `<span class="n">${s.dataset.extra != null ? "EXTRA" : String(i + 1).padStart(2, "0")}</span><span class="t">${s.dataset.title || ""}</span>${s.dataset.demo ? `<span class="tag">demo interativa</span>` : ""}`;
    b.addEventListener("click", () => { toggleOverview(); go(i); });
    grid.appendChild(b);
  });
  function toggleOverview() { overview.classList.toggle("open"); }

  /* esconde controles quando o mouse fica parado */
  let idleTimer;
  function wake() {
    nav.classList.remove("idle"); hint.classList.remove("idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { nav.classList.add("idle"); hint.classList.add("idle"); }, 2600);
  }
  document.addEventListener("mousemove", wake);
  document.addEventListener("keydown", wake);
  wake();

  /* swipe em touch */
  let tx = null;
  stage.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (tx == null) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (e.target.closest(".app-viewport, .phone")) return;
    if (Math.abs(dx) > 60) go(current + (dx < 0 ? 1 : -1));
  });

  /* toast do palco */
  const toastEl = document.querySelector(".stage-toast");
  let toastTimer;
  function toast(html) {
    toastEl.innerHTML = html;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  /* entrada escalonada dos elementos animados */
  slides.forEach((s) => {
    s.querySelectorAll("[data-anim]").forEach((el, i) => {
      const d = el.dataset.delay != null ? Number(el.dataset.delay) : i * 90;
      el.style.transitionDelay = `${d}ms`;
    });
  });

  /* ---------- rede decorativa animada ---------- */
  function network(canvas) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width = 560, H = canvas.height = 1080;
    const pts = Array.from({ length: 34 }, () => ({
      x: 120 + Math.random() * 420, y: Math.random() * H,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: 3 + Math.random() * 5,
    }));
    let raf;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 80 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 190) {
          ctx.strokeStyle = `rgba(170, 90, 200, ${0.35 * (1 - d / 190)})`;
          ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      for (const p of pts) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        g.addColorStop(0, "rgba(230, 170, 245, .95)"); g.addColorStop(.35, "rgba(190, 90, 220, .6)"); g.addColorStop(1, "rgba(150, 40, 180, 0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    const slide = canvas.closest(".slide");
    slide.addEventListener("slide:enter", () => { cancelAnimationFrame(raf); frame(); });
    slide.addEventListener("slide:leave", () => cancelAnimationFrame(raf));
  }
  document.querySelectorAll(".network canvas").forEach(network);

  /* ---------- formatação ---------- */
  const brl = (v, dec = 0) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  function countUp(el, to, { dur = 1400, fmt = (v) => Math.round(v).toLocaleString("pt-BR") } = {}) {
    const t0 = performance.now();
    function step(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(to * e);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- estado compartilhado do roteiro ---------- */
  const deal = { invest: 0, revenue: 0, influencers: 0, monthlyCost: 3168 };

  /* ---------- slide 2: perguntas de diagnóstico ---------- */
  const qs = document.querySelector(".s-questions");
  if (qs) {
    const rows = qs.querySelectorAll(".qrow");
    const roiNow = qs.querySelector(".roi-now");
    rows.forEach((row) => {
      const btn = row.querySelector(":scope > button");
      const input = row.querySelector("input");
      const ans = row.querySelector(".ans");
      btn.addEventListener("click", () => {
        const open = !row.classList.contains("open");
        row.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open);
        if (open) setTimeout(() => input.focus(), 250);
      });
      input.addEventListener("input", () => {
        const key = row.dataset.key;
        if (key === "influencers") {
          input.value = input.value.replace(/\D/g, "");
          deal.influencers = parseInt(input.value || "0", 10);
          ans.textContent = deal.influencers ? `${deal.influencers} influenciadores` : "";
        } else {
          const digitsOnly = input.value.replace(/\D/g, "");
          const v = digitsOnly ? parseInt(digitsOnly, 10) : 0;
          input.value = v ? v.toLocaleString("pt-BR") : "";
          deal[key] = v;
          ans.textContent = v ? brl(v) + "/mês" : "";
        }
        updateRoiNow();
        updatePlans();
      });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { row.classList.remove("open"); input.blur(); } });
    });
    function updateRoiNow() {
      if (deal.invest && deal.revenue) {
        const roi = deal.revenue / deal.invest;
        roiNow.innerHTML = `Hoje: cada <b>R$ 1</b> investido volta <b>${brl(roi, 2)}</b> em vendas, se o número estiver certo. <b>A ROI mostra isso por influenciador.</b>`;
        roiNow.classList.add("show");
      } else if (deal.invest || deal.revenue) {
        roiNow.innerHTML = deal.invest && !deal.revenue
          ? `Investem <b>${brl(deal.invest)}</b>/mês. E quanto disso volta? <b>Sem dado, é aposta.</b>`
          : `<b>${brl(deal.revenue)}</b>/mês em vendas. De quais influenciadores?`;
        roiNow.classList.add("show");
      } else roiNow.classList.remove("show");
    }
  }

  /* ---------- slide 3: barras ---------- */
  const bars = document.querySelector(".s-bars");
  if (bars) {
    const a = [62, 14, 79, 9, 50, 19], b = [21, 33, 45, 58, 72, 87];
    const ia = bars.querySelectorAll(".bars.a i"), ib = bars.querySelectorAll(".bars.b i");
    bars.addEventListener("slide:enter", () => {
      ia.forEach((el, i) => { el.style.height = "0"; setTimeout(() => (el.style.height = a[i] + "%"), 300 + i * 90); });
      ib.forEach((el, i) => { el.style.height = "0"; setTimeout(() => (el.style.height = b[i] + "%"), 900 + i * 140); });
    });
    bars.addEventListener("slide:leave", () => { ia.forEach((el) => (el.style.height = "0")); ib.forEach((el) => (el.style.height = "0")); });
  }

  /* ---------- slide 4: calculadora de custo ---------- */
  const cost = document.querySelector(".s-cost");
  if (cost) {
    const st = { people: 3, hours: 8, rate: 33 };
    const pEl = cost.querySelector("[data-v=people]"), tEl = cost.querySelector("[data-v=team]");
    const hEl = cost.querySelector("[data-v=hours]"), rEl = cost.querySelector("[data-v=rate]");
    const mEl = cost.querySelector("[data-v=month]"), yEl = cost.querySelector("[data-v=year]");
    const monthly = () => st.people * st.hours * st.rate * 4;
    function render(bump) {
      const month = monthly();
      deal.monthlyCost = month;
      pEl.textContent = st.people;
      tEl.textContent = st.people === 1 ? "1 pessoa" : `equipe de ${st.people} pessoas`;
      hEl.textContent = `${st.hours} h`;
      rEl.textContent = brl(st.rate);
      mEl.textContent = brl(month);
      const year = month * 12;
      yEl.textContent = year >= 1000 ? `R$ ${(year / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil por ano` : `${brl(year)} por ano`;
      if (bump) { mEl.classList.remove("bump"); void mEl.offsetWidth; mEl.classList.add("bump"); }
      updatePlans();
    }
    cost.querySelectorAll("[data-step]").forEach((b) => {
      b.addEventListener("click", () => {
        const [key, d] = b.dataset.step.split(":");
        const inc = Number(d);
        st[key] = Math.max(1, st[key] + inc);
        render(true);
      });
    });
    cost.addEventListener("slide:enter", () => {
      countUp(mEl, monthly(), { dur: 1300, fmt: (v) => brl(Math.round(v)) });
    });
    render(false);
  }

  /* ---------- slide 10: planos ---------- */
  function updatePlans() {
    const price = document.querySelector(".s-price");
    if (!price) return;
    const closing = price.querySelector(".closing");
    const m = deal.monthlyCost;
    const times = Math.floor(m / 497);
    const costHtml = `<span class="hl">${brl(m)}/mês</span>`;
    if (times >= 2) closing.innerHTML = `O Basic custa ${times} vezes menos que o controle manual da equipe: ${costHtml}.`;
    else if (m > 497) closing.innerHTML = `O Basic custa menos que o controle manual da equipe: ${costHtml}.`;
    else closing.innerHTML = `O controle manual da equipe: ${costHtml}. Sem ver quem vende.`;
    const n = deal.influencers;
    price.querySelectorAll(".plan").forEach((p) => p.classList.remove("recommended"));
    if (n) {
      const id = n <= 50 ? "basic" : n <= 150 ? "pro" : "elite";
      price.querySelector(`.plan.${id}`).classList.add("recommended");
    }
  }
  updatePlans();

  /* ---------- slide 9: órbitas de influenciadores ---------- */
  const orb = document.querySelector(".orbits");
  if (orb) {
    let h = "";
    [[180, 10, 50], [300, 18, 80], [430, 28, 120], [540, 40, 170]].forEach(([r, n, dur], k) => {
      h += `<circle cx="550" cy="550" r="${r}" fill="none" stroke="rgba(255,255,255,.18)" stroke-dasharray="2 8"/>`;
      h += `<g style="transform-origin:550px 550px;animation:orbit ${dur}s linear infinite ${k % 2 ? "reverse" : ""}">`;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k, x = 550 + r * Math.cos(a), y = 550 + r * Math.sin(a);
        h += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(6 + ((i * 7 + k) % 5) * 2.2).toFixed(1)}" fill="rgba(255,255,255,${(0.35 + ((i + k) % 4) * 0.15).toFixed(2)})"/>`;
      }
      h += "</g>";
    });
    h += `<circle cx="550" cy="550" r="74" fill="rgba(255,255,255,.95)"/><image href="assets/img/logo.png" x="500" y="500" width="100" height="100"/>`;
    orb.innerHTML = h;
  }

  /* ---------- números que contam ---------- */
  document.querySelectorAll("[data-count]").forEach((el) => {
    const slide = el.closest(".slide");
    const to = Number(el.dataset.count);
    const prefix = el.dataset.prefix || "", suffix = el.dataset.suffix || "";
    const fmt = (v) => prefix + Math.round(v).toLocaleString("pt-BR") + suffix;
    slide.addEventListener("slide:enter", () => countUp(el, to, { dur: Number(el.dataset.dur || 1500), fmt }));
    el.textContent = fmt(to);
  });

  /* ---------- início ---------- */
  const fromHash = parseInt(location.hash.replace("#", ""), 10);
  slides[0].classList.add("active");
  go(Number.isFinite(fromHash) ? fromHash - 1 : 0, { force: true, noHash: !Number.isFinite(fromHash) });
})();
