/* rows.js: Analytics Work hub renderer, Builds-style rows.
   Same data and page logic as work.js (site.json, hero.json, lanes.json, page.json).
   Only the card changed: one full-width row per case, thumbnail on the front,
   and a step-by-step walkthrough instead of the open-all detail panel.
   Every field is optional, so old JSON still renders. Needs site.js first
   (loadJSON, applyOrgChrome, renderOrgPage, mountSectionMedia, embedNode, setText).
   No server, no build step. Card classes start with r- (rows.css), charts reuse w- (work.css). */
(function () {
  const $ = (id) => document.getElementById(id);
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const fmt = (n, d) => Number(n).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSvg = (s) => /\.svg(\?|#|$)/i.test(s || "");
  const LANE_LIMIT = 3; // a lane with more cards shows the first 3 plus "Show all"

  /* ---------- lightbox ---------- */
  function lightbox(src, alt) {
    const lb = mk("div", "r-lightbox");
    lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", alt || "Image");
    const img = document.createElement("img"); img.src = src; img.alt = alt || "";
    lb.appendChild(img);
    if (alt) lb.appendChild(mk("p", "r-lb-cap", alt));
    const close = () => { lb.remove(); document.removeEventListener("keydown", onKey, true); };
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    lb.addEventListener("click", close); document.addEventListener("keydown", onKey, true);
    document.body.appendChild(lb);
  }

  function imgNode(src, alt, cls) {
    const im = document.createElement("img");
    im.src = src; im.alt = alt || ""; im.loading = "lazy";
    im.className = (cls || "") + (isSvg(src) ? " svg" : "");
    return im;
  }

  function linkRow(p, cls) {
    const row = mk("div", cls || "r-links");
    (p.links || []).filter((l) => l && l.url).forEach((l) => {
      const demo = l.kind === "demo";
      const a = mk("a", "r-link" + (demo ? " demo" : ""), (l.label || "Link") + (demo ? " ↗" : " →"));
      a.href = l.url; a.target = "_blank"; a.rel = "noopener"; row.appendChild(a);
    });
    return row;
  }

  /* ---------- charts (optional `chart` on a project), same as work.js ---------- */
  function chartNode(c, grow) {
    if (!c || !c.type) return null;
    const box = mk("div", "w-chart");
    if (c.title) box.appendChild(mk("p", "w-chart-title", c.title));
    if (c.type === "bars" && c.items && c.items.length) {
      const max = Math.max(...c.items.map((i) => Math.abs(i.value || 0))) || 1;
      c.items.forEach((it, i) => {
        const row = mk("div", "w-bar" + (it.highlight ? " hl" : ""));
        row.appendChild(mk("span", "w-bar-l", it.label));
        const track = mk("span", "w-bar-t"); const fill = mk("span", "w-bar-f");
        fill.style.transitionDelay = i * 80 + "ms"; track.appendChild(fill);
        const wrap = mk("span", "w-bar-w"); wrap.appendChild(track); wrap.appendChild(mk("span", "w-bar-v", it.display || fmt(it.value)));
        row.appendChild(wrap); box.appendChild(row);
        grow.push(() => { fill.style.width = ((Math.abs(it.value || 0) / max) * 100).toFixed(1) + "%"; });
      });
    } else if (c.type === "compare" && c.left && c.right) {
      const g = mk("div", "w-compare");
      [c.left, c.right].forEach((sd, i) => {
        const s = mk("div", "w-side" + (i ? " after" : ""));
        s.appendChild(mk("span", "w-mono", sd.label || ""));
        (sd.points || []).forEach((pt) => s.appendChild(mk("p", "", pt)));
        g.appendChild(s);
      });
      box.appendChild(g);
    } else if (c.type === "hub") {
      const chips = (arr, cls) => { const r = mk("div", "w-chips"); (arr || []).forEach((t) => r.appendChild(mk("span", cls, t))); return r; };
      box.appendChild(chips(c.inputs, "w-chip"));
      box.appendChild(mk("span", "w-arrow", "↓"));
      box.appendChild(mk("span", "w-hub", c.hub || ""));
      box.appendChild(mk("span", "w-arrow", "↓"));
      box.appendChild(chips(c.outputs, "w-chip out"));
    } else if (c.type === "steps" && c.items) {
      c.items.forEach((st, i) => {
        const r = mk("div", "w-step" + (st.highlight ? " hl" : ""));
        r.appendChild(mk("span", "w-mono", String(i + 1).padStart(2, "0")));
        const t = mk("span"); t.appendChild(mk("b", "", st.label || "")); if (st.note) t.appendChild(mk("small", "", st.note));
        r.appendChild(t); box.appendChild(r);
      });
    }
    if (c.caption) box.appendChild(mk("p", "w-caption", c.caption));
    return box;
  }

  /* ---------- the walkthrough steps, built from the data ----------
     Leads with the finding when `outcome` exists. Thinking process uses `calls`,
     falling back to My call (`hers`), same rule as work.js. CSR tiles become steps too. */
  function stepsOf(p) {
    const b = p.body || {};
    const out = [];
    const add = (k, v, kind) => { if (v && (!Array.isArray(v) || v.length)) out.push({ k, v, kind: kind || "text" }); };
    if (p.outcome && p.outcome !== p.hook) add("The finding", p.outcome);
    add("Context", p.context);
    add("Problem", b.problem);
    add("Solution", b.approach, "solution");
    (p.csr || []).forEach((t) => add(t.k || "Note", t.v));
    add("Result", b.result);
    if (p.calls && p.calls.length) add("Thinking process", p.calls, "list");
    else add("My call", b.hers);
    add("Lesson", b.lesson);
    return out;
  }

  /* ---------- one row ---------- */
  function cardNode(p, n, ctl) {
    const steps = stepsOf(p);
    const card = mk("article", "r-card" + (n % 2 ? " flip" : "")); card.id = "card-" + p.id;
    const num = String(n + 1).padStart(2, "0");
    const thumbSrc = p.visual || (p.images && p.images[0] && p.images[0].src) || p.diagram;
    const thumbAlt = p.visual ? p.visualAlt : (p.images && p.images[0] && p.images[0].src) ? p.images[0].alt : p.diagramAlt;

    const head = mk("div", "r-head");
    if (thumbSrc) {
      const th = mk("button", "r-thumb"); th.type = "button";
      th.setAttribute("aria-label", "Enlarge: " + (thumbAlt || p.title));
      const ti = imgNode(thumbSrc, thumbAlt || p.title); if (n < 4) ti.loading = "eager"; th.appendChild(ti);
      th.appendChild(mk("span", "r-num", num));
      th.addEventListener("click", () => lightbox(thumbSrc, thumbAlt || p.title));
      head.appendChild(th);
    } else head.classList.add("no-thumb");

    const copy = mk("div", "r-copy");
    const meta = mk("div", "r-meta");
    meta.appendChild(mk("span", "", p.metric || (p.year ? String(p.year) : "")));
    const badge = mk("span", "r-badge", p.badge || (p.status === "live" ? "Live" : p.status === "draft" ? "Draft" : "Building"));
    if (p.status === "draft" && !p.badge) badge.classList.add("draft");
    meta.appendChild(badge);
    copy.appendChild(meta);
    copy.appendChild(mk("h3", "r-title", p.title || ""));
    if (p.hook) copy.appendChild(mk("p", "r-hook", p.hook));
    if (p.tools && p.tools.length) { const t = mk("div", "r-chips"); p.tools.forEach((x) => t.appendChild(mk("span", "r-chip", x))); copy.appendChild(t); }
    const foot = mk("div", "r-foot");
    foot.appendChild(linkRow(p));
    const btnLabel = p.btnLabel || "Deep dive";
    let btn = null;
    if (steps.length) {
      btn = mk("button", "r-btn"); btn.type = "button";
      btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "walk-" + p.id);
      btn.innerHTML = "<span></span><i>+</i>"; btn.querySelector("span").textContent = btnLabel;
      if (p.hint) btn.title = p.hint;
      btn.addEventListener("click", () => ctl.toggle(card));
      foot.appendChild(btn);
    }
    copy.appendChild(foot);
    head.appendChild(copy);
    card.appendChild(head);
    if (!steps.length) return card;

    /* walkthrough: built on first open */
    const walk = mk("div", "r-walk"); walk.id = "walk-" + p.id;
    let built = false, step = 0, fig, media, chartBox, cap, counter, h, body, endBox, dots, back, next;
    const grow = []; let grown = false;
    const vis = p.visual ? [p.visual, p.visualAlt] : thumbSrc ? [thumbSrc, thumbAlt] : null;
    const dia = p.diagram ? [p.diagram, p.diagramAlt] : null;
    let curImg = null;

    function build() {
      if (built) return; built = true;
      fig = mk("div", "r-fig");
      media = mk("button", "r-media"); media.type = "button";
      media.appendChild(mk("span", "r-zoom", "Enlarge ⤢"));
      media.addEventListener("click", () => { if (curImg) lightbox(curImg[0], curImg[1]); });
      fig.appendChild(media);
      chartBox = chartNode(p.chart, grow);
      if (chartBox) { chartBox.classList.add("r-chart"); fig.appendChild(chartBox); }
      cap = mk("p", "r-cap"); fig.appendChild(cap);
      if (vis || dia || chartBox) walk.appendChild(fig); else walk.classList.add("no-media");

      const panel = mk("div", "r-panel");
      const top = mk("div", "r-ptop");
      counter = mk("span", "r-mono"); top.appendChild(counter);
      const x = mk("button", "r-x", "+"); x.type = "button"; x.setAttribute("aria-label", "Close");
      x.addEventListener("click", () => ctl.toggle(card)); top.appendChild(x);
      panel.appendChild(top);
      h = mk("h4", "r-step-h"); body = mk("div", "r-step-t");
      panel.appendChild(h); panel.appendChild(body);

      // last step: evidence (links, public files, setting). Course and group labels stay off the public page.
      endBox = mk("div", "r-end");
      const ev = linkRow(p, "r-links");
      (p.files || []).filter((f) => f.public && f.src).forEach((f) => { const a = mk("a", "r-link", (f.title || "File") + " →"); a.href = f.src; a.target = "_blank"; a.rel = "noopener"; ev.appendChild(a); });
      if (ev.children.length) { endBox.appendChild(mk("span", "r-mono", "Evidence")); endBox.appendChild(ev); }
      if (p.setting) endBox.appendChild(mk("p", "r-setting", p.setting));
      panel.appendChild(endBox);

      const nav = mk("div", "r-nav");
      back = mk("button", "r-back", "← Back"); back.type = "button"; back.addEventListener("click", () => go(step - 1));
      dots = mk("div", "r-dots");
      steps.forEach((s, j) => { const d = mk("button", "r-dot"); d.type = "button"; d.setAttribute("aria-label", s.k); d.addEventListener("click", () => go(j)); dots.appendChild(d); });
      next = mk("button", "r-next"); next.type = "button"; next.addEventListener("click", () => (step === steps.length - 1 ? ctl.toggle(card) : go(step + 1)));
      nav.appendChild(back); nav.appendChild(dots); nav.appendChild(next);
      panel.appendChild(nav);
      panel.setAttribute("aria-live", "polite");
      walk.appendChild(panel);
    }

    function showMedia(s, idx) {
      // Solution step shows the chart when there is one. From Solution on, the diagram replaces the cover.
      const solIdx = steps.findIndex((x) => x.kind === "solution");
      const after = solIdx >= 0 ? idx >= solIdx : idx >= 1;
      const useChart = chartBox && s.kind === "solution";
      const img = useChart ? null : (after && dia) ? dia : (vis || dia);
      const showChart = useChart || (!img && chartBox);
      if (chartBox) chartBox.hidden = !showChart;
      media.hidden = showChart || !img;
      if (!showChart && img && (!curImg || curImg[0] !== img[0])) {
        const old = media.querySelector("img"); if (old) old.remove();
        media.insertBefore(imgNode(img[0], img[1] || p.title, "r-img"), media.firstChild);
      }
      curImg = showChart ? null : img;
      cap.textContent = showChart ? "" : (img && img[1]) || "";
      cap.hidden = !cap.textContent;
      if (showChart && !grown) { grown = true; requestAnimationFrame(() => setTimeout(() => grow.forEach((f) => f()), reduce ? 0 : 150)); }
    }

    function go(n2) {
      step = Math.max(0, Math.min(steps.length - 1, n2));
      const s = steps[step], last = step === steps.length - 1;
      counter.textContent = "Step " + (step + 1) + " of " + steps.length;
      h.textContent = s.k;
      body.innerHTML = "";
      if (s.kind === "list") s.v.forEach((t) => body.appendChild(mk("p", "r-call", t)));
      else body.appendChild(mk("p", "", s.v));
      endBox.hidden = !last || !endBox.children.length;
      back.disabled = step === 0;
      next.textContent = last ? "Done" : "Next →";
      [...dots.children].forEach((d, j) => d.classList.toggle("on", j === step));
      if (walk.contains(fig)) showMedia(s, step);
      body.classList.remove("r-in"); void body.offsetWidth; if (!reduce) body.classList.add("r-in");
    }
    card.appendChild(walk);

    card._set = (open) => {
      card.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.querySelector("span").textContent = open ? "Close" : btnLabel;
      if (open) { build(); go(0); }
    };
    card._step = (d) => go(step + d);
    return card;
  }

  /* ---------- page (same as work.js except the card list) ---------- */
  Promise.all([loadJSON("data/site.json"), loadJSON("data/hero.json"), loadJSON("data/lanes.json"), loadJSON("data/page.json").catch(() => null)])
    .then(([site, hero, data, page]) => {
      applyOrgChrome(site);
      renderOrgPage(site, page);
      mountSectionMedia("top", hero);
      setText("hero-eyebrow", hero.eyebrow); setText("hero-headline", hero.headline); setText("hero-lede", hero.lede);

      const lanes = data.lanes || [];
      const liveOf = (l) => (l.projects || []).filter((p) => p.status === "live");
      const draftOf = (l) => (l.projects || []).filter((p) => p.status === "draft");
      const visibleOf = (l) => (l.projects || []).filter((p) => p.status === "live" || p.status === "draft");
      const shipped = lanes.reduce((a, l) => a + liveOf(l).length, 0);
      const drafted = lanes.reduce((a, l) => a + draftOf(l).length, 0);
      const queued = lanes.reduce((a, l) => a + (l.pipeline || []).length, 0);

      const setNum = (id, v) => { const e = $(id); if (e) e.textContent = v; };
      setNum("t-live", shipped); setNum("t-draft", drafted); setNum("t-pipe", queued);
      const total = shipped + drafted + queued;
      const tbL = $("tb-live"), tbD = $("tb-draft");
      if (tbL && tbD && total > 0) {
        setTimeout(() => {
          if (shipped > 0) tbL.style.width = ((shipped / total) * 100) + "%";
          if (drafted > 0) tbD.style.width = ((drafted / total) * 100) + "%";
        }, reduce ? 0 : 300);
      }

      // one open card at a time, Esc closes, arrow keys step
      let openCard = null;
      const ctl = {
        toggle(card) {
          if (openCard && openCard !== card) openCard._set(false);
          const willOpen = openCard !== card;
          card._set(willOpen); openCard = willOpen ? card : null;
          if (willOpen) {
            const top = card.getBoundingClientRect().top;
            if (top < 80 || top > window.innerHeight * 0.6) window.scrollTo({ top: top + window.scrollY - 110, behavior: reduce ? "auto" : "smooth" });
          }
        },
      };
      document.addEventListener("keydown", (e) => {
        if (!openCard || document.querySelector(".r-lightbox")) return;
        if (e.target.closest && e.target.closest("input, textarea, select")) return;
        if (e.key === "Escape") ctl.toggle(openCard);
        else if (e.key === "ArrowRight") { e.preventDefault(); openCard._step(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); openCard._step(-1); }
      });

      const mount = $("lanes"); const sections = []; let n = 0;
      lanes.forEach((lane, i) => {
        const sec = mk("section", i % 2 ? "band w-lane" : "section w-lane"); sec.id = lane.id;
        const wrap = mk("div", "wrap");
        wrap.innerHTML = '<div class="section-head"><div class="sh-main"><span class="eyebrow"></span><h2></h2></div><p class="sh-side"></p></div>';
        wrap.querySelector(".eyebrow").textContent = ((page && page.laneEyebrow) || "Lane") + " " + (i + 1);
        wrap.querySelector("h2").textContent = lane.name;
        wrap.querySelector(".sh-side").textContent = lane.blurb || "";
        const emb = embedNode(lane.embed); if (emb) wrap.querySelector(".section-head").appendChild(emb);
        const shown = visibleOf(lane);
        if (shown.length) {
          const list = mk("div", "r-list");
          shown.forEach((p, j) => { const c = cardNode(p, n++, ctl); if (j >= LANE_LIMIT) c.classList.add("r-more"); list.appendChild(c); });
          wrap.appendChild(list);
          if (shown.length > LANE_LIMIT) {
            const more = mk("button", "r-showall"); more.type = "button";
            more.textContent = "Show all " + shown.length;
            more.addEventListener("click", () => { list.classList.add("all"); more.remove(); });
            wrap.appendChild(more);
          }
        }
        const pipe = lane.pipeline || [];
        if (pipe.length) {
          const d = mk("details", "w-pipe"); if (!shown.length) d.open = true;
          const sm = mk("summary"); sm.appendChild(mk("span", "w-pipe-h", "In the pipeline")); sm.appendChild(mk("span", "w-mono", shown.length + " shipped · " + pipe.length + " in progress"));
          d.appendChild(sm);
          const list = mk("div", "w-pipe-list");
          pipe.forEach((t, j) => {
            const r = mk("div", "w-pipe-row"); r.appendChild(mk("span", "w-mono", String(j + 1).padStart(2, "0")));
            if (t.link) { const a = mk("a", "", t.title); a.href = t.link; a.target = "_blank"; a.rel = "noopener"; r.appendChild(a); } else r.appendChild(mk("span", "", t.title));
            r.appendChild(mk("span", "w-mono w-status", t.status || "In the pipeline")); list.appendChild(r);
          });
          d.appendChild(list); wrap.appendChild(d);
        }
        sec.appendChild(wrap); mount.appendChild(sec); mountSectionMedia(lane.id, lane); sections.push(sec);
      });

      // filter chips in the nav row
      const sub = $("nav-chips");
      if (sub) {
        sub.innerHTML = "";
        const chips = [];
        const pick = (id) => {
          chips.forEach((c) => c.classList.toggle("on", c.dataset.id === id));
          sections.forEach((s) => { s.hidden = id !== "all" && s.id !== id; });
          const t = $(id === "all" ? "top" : id); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 100, behavior: reduce ? "auto" : "smooth" });
        };
        [["all", (page && page.subnavTop) || "All", shipped + drafted + queued]].concat(lanes.map((l) => [l.id, l.name, visibleOf(l).length + (l.pipeline || []).length])).forEach(([id, label, cnt]) => {
          const b = mk("button", "w-chip-btn" + (id === "all" ? " on" : "")); b.type = "button"; b.dataset.id = id;
          b.appendChild(document.createTextNode(label)); if (id !== "all") b.appendChild(mk("i", "", String(cnt)));
          b.addEventListener("click", () => pick(id)); sub.appendChild(b); chips.push(b);
        });
      }
      // section order, hidden sections, looks and builder-added sections (admin page builder)
      if (window.Theme && Theme.applyLayout && page && page.layout) Theme.applyLayout(document.querySelector("main"), { hero: hero, lanes: data, page: page || {} }, { site: site, layoutIn: "page" });
    })
    .catch(() => { setText("hero-headline", "Content couldn't load — try refreshing."); });
})();
