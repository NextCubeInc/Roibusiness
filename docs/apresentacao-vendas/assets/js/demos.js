/* Monta os apps nos slides de demo, ajusta a escala e liga os controles do apresentador. */
(function () {
  const M = window.MOCK;

  document.querySelectorAll("[data-ic]").forEach((el) => { el.outerHTML = window.icon(el.dataset.ic); });

  /* painel da empresa: largura lógica de 1280px, escalada para caber no notebook */
  document.querySelectorAll('[data-app="biz"]').forEach((el) => {
    const vp = el.parentElement;
    window.BizApp(el, { start: el.dataset.start });
    const fit = () => {
      const w = vp.clientWidth, h = vp.clientHeight;
      if (!w) return;
      const s = w / 1280;
      el.style.width = 1280 + "px";
      el.style.height = h / s + "px";
      el.style.transform = `scale(${s})`;
    };
    new ResizeObserver(fit).observe(vp);
    fit();
  });

  /* app do influenciador: tela lógica 390×844 */
  document.querySelectorAll('[data-app="inf"]').forEach((el) => {
    const app = window.InfApp(el, { start: el.dataset.start, banner: el.dataset.banner !== "0" });
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w) return;
      const s = w / 390;
      app.root.style.height = h / s + "px";
      app.root.style.transform = `scale(${s})`;
    };
    new ResizeObserver(fit).observe(el);
    fit();
  });

  /* controles do apresentador */
  document.querySelectorAll(".s-demo").forEach((slide) => {
    const onlyMe = slide.dataset.demo === "influencer";
    const fire = () => {
      const o = M.simulateSale(onlyMe ? { infId: M.influencers[0].id } : {});
      const inf = M.byId(o.infId);
      window.Deck.toast(`${window.icon("zap")}<span>Nova venda: <b>${inf.name}</b> · cupom ${o.coupon} · ${M.fmt.brl(o.total)}</span>`);
    };
    slide.querySelectorAll('[data-act="sale"]').forEach((b) => b.addEventListener("click", fire));

    const autoBtn = slide.querySelector('[data-act="auto"]');
    let timer = null;
    const stop = () => { clearTimeout(timer); timer = null; autoBtn?.classList.add("off"); };
    const loop = () => { fire(); timer = setTimeout(loop, 3500 + Math.random() * 2500); };
    if (autoBtn) {
      autoBtn.classList.add("off");
      autoBtn.addEventListener("click", () => { if (timer) stop(); else { autoBtn.classList.remove("off"); timer = setTimeout(loop, 600); } });
    }
    slide.addEventListener("slide:leave", stop);

    const focusBtn = slide.querySelector('[data-act="focus"]');
    if (focusBtn) {
      focusBtn.addEventListener("click", () => {
        const on = slide.classList.toggle("focus");
        focusBtn.innerHTML = window.icon(on ? "minimize-2" : "maximize-2");
        focusBtn.setAttribute("aria-label", on ? "Reduzir demo" : "Expandir demo");
      });
      slide.addEventListener("slide:leave", () => { if (slide.classList.contains("focus")) focusBtn.click(); });
    }
  });
})();
