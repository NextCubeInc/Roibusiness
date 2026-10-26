/* Gráfico de linha em SVG puro (monotone, como Recharts/gifted-charts), com tooltip. */
(function () {
  function niceStep(max, n) {
    const rough = max / n;
    const mag = Math.pow(10, Math.floor(Math.log10(rough || 1)));
    const norm = rough / mag;
    return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  }

  function monotone(pts) {
    const n = pts.length;
    if (n === 0) return "";
    if (n === 1) return `M${pts[0].x},${pts[0].y}`;
    if (n === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;
    const dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1].x - pts[i].x; m[i] = (pts[i + 1].y - pts[i].y) / dx[i]; }
    t[0] = m[0];
    for (let i = 1; i < n - 1; i++) {
      if (m[i - 1] * m[i] <= 0) t[i] = 0;
      else { const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1]; t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]); }
    }
    t[n - 1] = m[n - 2];
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i] / 3;
      d += `C${pts[i].x + h},${pts[i].y + h * t[i]} ${pts[i + 1].x - h},${pts[i + 1].y - h * t[i + 1]} ${pts[i + 1].x},${pts[i + 1].y}`;
    }
    return d;
  }

  /* opts: { color, area, dots, grid, yFmt, xEvery, tip(d), padL, h, animate, axis } */
  function line(el, data, opts = {}) {
    const w = el.clientWidth || 400, h = opts.h || el.clientHeight || 200;
    const padL = opts.padL ?? 60, padR = opts.padR ?? 14, padT = 10, padB = 24;
    const color = opts.color || "#c026d3";
    const maxV = Math.max(1, ...data.map((d) => d.value));
    const step = niceStep(maxV, 4);
    const top = Math.ceil(maxV / step) * step;
    const iw = w - padL - padR, ih = h - padT - padB;
    const x = (i) => padL + (data.length === 1 ? iw / 2 : (i * iw) / (data.length - 1));
    const y = (v) => padT + ih * (1 - v / top);
    const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
    const path = monotone(pts);
    const every = opts.xEvery || Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(iw / 64))));
    const uid = "g" + Math.random().toString(36).slice(2, 8);
    let s = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    if (opts.area) {
      s += `<defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${opts.areaTop || "#a78bfa"}" stop-opacity=".35"/><stop offset="1" stop-color="${opts.areaBottom || "#7c3aed"}" stop-opacity=".04"/></linearGradient></defs>`;
    }
    for (let v = 0; v <= top + 1e-9; v += step) {
      const yy = y(v);
      if (opts.grid !== false) s += `<line class="grid" x1="${padL}" x2="${w - padR}" y1="${yy}" y2="${yy}" stroke="rgba(255,255,255,.06)"/>`;
      s += `<text class="tick" x="${padL - 8}" y="${yy + 4}" text-anchor="end">${(opts.yFmt || ((v) => v))(v)}</text>`;
    }
    if (opts.axis !== false) {
      s += `<line class="axis" x1="${padL}" x2="${padL}" y1="${padT}" y2="${padT + ih}"/><line class="axis" x1="${padL}" x2="${w - padR}" y1="${padT + ih}" y2="${padT + ih}"/>`;
    }
    data.forEach((d, i) => {
      const last = i === data.length - 1;
      if (i % every === 0 || last && (data.length - 1) % every > every / 2) s += `<text class="tick" x="${x(i)}" y="${h - 6}" text-anchor="middle">${d.label}</text>`;
    });
    if (opts.area && pts.length > 1) {
      s += `<path d="${path}L${pts[pts.length - 1].x},${padT + ih}L${pts[0].x},${padT + ih}Z" fill="url(#${uid})"/>`;
    }
    s += `<path class="line" d="${path}" fill="none" style="fill:none;stroke:${color};stroke-width:${opts.stroke || 2}" ${opts.animate ? 'data-anim-line="1"' : ""}/>`;
    if (opts.dots !== false) pts.forEach((p) => (s += `<circle class="dot" cx="${p.x}" cy="${p.y}" r="3" fill="#212125" stroke-width="2" style="stroke:${color}"/>`));
    s += `<line class="cursor" x1="0" x2="0" y1="${padT}" y2="${padT + ih}" stroke="rgba(255,255,255,.18)" style="display:none"/>`;
    s += `<circle class="active-dot" r="5" fill="${color}" style="display:none"/>`;
    s += `<rect class="hit" x="${padL}" y="0" width="${iw}" height="${h}" fill="transparent" style="fill:transparent"/>`;
    s += `</svg><div class="tip"></div>`;
    el.innerHTML = s;

    const svg = el.querySelector("svg");
    const pathEl = svg.querySelector("path.line");
    if (opts.animate && pathEl.getTotalLength) {
      const len = pathEl.getTotalLength();
      pathEl.style.strokeDasharray = len; pathEl.style.strokeDashoffset = len;
      pathEl.getBoundingClientRect();
      pathEl.style.transition = "stroke-dashoffset 1s ease";
      pathEl.style.strokeDashoffset = 0;
    }
    const tip = el.querySelector(".tip"), cur = svg.querySelector(".cursor"), ad = svg.querySelector(".active-dot");
    const hit = svg.querySelector(".hit");
    function move(ev) {
      const r = svg.getBoundingClientRect();
      const scale = r.width / w;
      const mx = (ev.clientX - r.left) / scale;
      let best = 0, bd = Infinity;
      pts.forEach((p, i) => { const dd = Math.abs(p.x - mx); if (dd < bd) { bd = dd; best = i; } });
      const p = pts[best];
      cur.setAttribute("x1", p.x); cur.setAttribute("x2", p.x); cur.style.display = "";
      ad.setAttribute("cx", p.x); ad.setAttribute("cy", p.y); ad.style.display = "";
      tip.innerHTML = opts.tip ? opts.tip(data[best]) : data[best].value;
      tip.style.left = p.x + "px"; tip.style.top = p.y - 8 + "px";
      tip.classList.add("show");
    }
    hit.addEventListener("mousemove", move);
    hit.addEventListener("touchstart", (e) => move(e.touches[0]), { passive: true });
    hit.addEventListener("mouseleave", () => { tip.classList.remove("show"); cur.style.display = "none"; ad.style.display = "none"; });
  }

  window.Charts = { line, monotone };
})();
