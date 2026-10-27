/* Monta os apps nos slides de demo, ajusta a escala e liga os controles do apresentador. */
(function () {
  const M = window.MOCK;

  document.querySelectorAll("[data-ic]").forEach((el) => { el.outerHTML = window.icon(el.dataset.ic); });

  /* painel da empresa: largura lógica de 1280px, escalada para caber no notebook */
  document.querySelectorAll('[data-app="biz"]').forEach((el) => {
    const vp = el.parentElement;
    el.bizApp = window.BizApp(el, { start: el.dataset.start });
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

  /* chips: acendem por um instante ao clicar */
  function flashChip(chip) {
    chip.parentElement.querySelectorAll(".d-chip").forEach((c) => c.classList.toggle("on", c === chip));
    clearTimeout(chip.flashT);
    chip.flashT = setTimeout(() => chip.classList.remove("on"), 1500);
  }

  /* slide 5: cada chip leva o painel à tela que mostra aquele número */
  document.querySelectorAll("[data-go]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const app = chip.closest(".slide").querySelector('[data-app="biz"]').bizApp;
      app.go(chip.dataset.go, chip.dataset.tab ? { rankTab: chip.dataset.tab } : {});
      if (chip.dataset.spot) setTimeout(() => app.spot(chip.dataset.spot), 120);
      flashChip(chip);
    });
  });

  /* slide 6: a marca manda uma mensagem e ela chega no celular da influenciadora */
  const MSGS = {
    campanha: () => ({ title: "Nova campanha no ar 🏆", body: "Quem mais vender até o fim do mês leva R$ 1.000. Seu cupom já está valendo." }),
    briefing: () => ({ title: "Briefing do lançamento", body: "Mostre o produto em uso e fale do seu cupom nos primeiros 5 segundos do vídeo." }),
    comissao: () => {
      const c = M.influencers[0].coupons[0];
      return { title: "Comissão em dobro no fim de semana", body: `De sexta a domingo, o cupom ${c.code} paga ${c.pct * 2}% em todas as vendas.` };
    },
    materiais: () => ({ title: "Materiais novos 📸", body: "Fotos, vídeos e roteiro da coleção nova já estão no drive da marca." }),
  };
  document.querySelectorAll("[data-msg]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const me = M.influencers[0];
      const rec = { id: "n" + Date.now(), at: new Date(), ...MSGS[chip.dataset.msg](), audience: me.name, recipients: 1, delivered: 1, failed: 0, status: "sent" };
      M.notifHistory.unshift(rec);
      M.emit("push", { ...rec, ids: [me.id], business: M.business.name });
      const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
      window.Deck.toast(`${window.icon("send")}<span>${esc(M.business.name)} → <b>${me.name}</b>: ${rec.title}</span>`);
      flashChip(chip);
    });
  });

  /* controles do apresentador */
  document.querySelectorAll(".s-demo").forEach((slide) => {
    const onlyMe = slide.dataset.demo === "influencer";
    const fire = () => {
      const o = M.simulateSale(onlyMe ? { infId: M.influencers[0].id } : {});
      const inf = M.byId(o.infId);
      window.Deck.toast(`${window.icon("zap")}<span>Nova venda: <b>${inf.name}</b> · cupom ${o.coupon} · ${M.fmt.brl(o.total)}</span>`);
    };
    slide.querySelectorAll('[data-act="sale"]').forEach((b) => b.addEventListener("click", () => {
      fire();
      if (b.classList.contains("d-chip")) flashChip(b);
    }));

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
