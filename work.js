/* work.js: Analytics Work hub renderer.
   Reads data/site.json, hero.json, lanes.json, page.json. Every new field is optional,
   so old JSON still renders. Needs site.js first (loadJSON, applyOrgChrome, renderOrgPage,
   mountSectionMedia, embedNode, esc). No server, no build step. */
(function () {
  const $ = (id) => document.getElementById(id);
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const fmt = (n, d) => Number(n).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function stat(p) {
    if (p.stat && p.stat.num != null) return { big: (p.stat.prefix || "") + fmt(p.stat.num, p.stat.decimals) + (p.stat.suffix || ""), label: p.stat.label || "" };
    const m = String(p.metric || "").match(/^\s*([−\-+$]?[\d.,]+\s?[A-Za-z%x]*)\s*(.*)$/);
    return m ? { big: m[1], label: m[2].replace(/^[·\s]+/, "") } : { big: "", label: p.metric || "" };
  }

  /* ---------- lightbox ---------- */
  function lightbox(src, alt) {
    const lb = mk("div", "lightbox");
    const img = document.createElement("img"); img.src = src; img.alt = alt || "";
    lb.appendChild(img);
    const close = () => { lb.remove(); document.removeEventListener("keydown", esc1); };
    const esc1 = (e) => { if (e.key === "Escape") close(); };
    lb.addEventListener("click", close); document.addEventListener("keydown", esc1);
    document.body.appendChild(lb);
  }

  /* ---------- charts (optional `chart` on a project) ---------- */
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

  /* ---------- one card ---------- */
  function cardNode(p, onOpen) {
    const s = stat(p);
    const card = mk("article", "w-card"); card.id = "card-" + p.id;
    const face = mk("div", "w-face");
    const meta = mk("div", "w-meta");
    meta.appendChild(mk("span", "", [p.year, p.group === "work" ? "On the job" : p.group === "mba" ? "MBA" : ""].filter(Boolean).join(" · ")));
    const badge = mk("span", "w-badge", p.badge || (p.status === "live" ? "Live" : p.status === "draft" ? "Draft" : "Building"));
    if (p.status === "draft" && !p.badge) badge.classList.add("draft");
    meta.appendChild(badge);
    face.appendChild(meta);
    if (s.big) { const b = mk("div", "w-stat"); b.appendChild(mk("span", "w-big", s.big)); if (s.label) b.appendChild(mk("span", "w-big-l", s.label)); face.appendChild(b); }
    face.appendChild(mk("h3", "w-title", p.title));
    if (p.tools && p.tools.length) { const t = mk("div", "w-chips"); p.tools.forEach((x) => t.appendChild(mk("span", "w-chip", x))); face.appendChild(t); }
    const foot = mk("div", "w-foot");
    const hintClosed = p.hint || "That's the 10-second version.";
    const hint = mk("span", "w-hint", hintClosed);
    const btnLabel = p.btnLabel || "Deep dive";
    const btn = mk("button", "w-btn"); btn.type = "button"; btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = "<span></span><i>+</i>";
    btn.querySelector("span").textContent = btnLabel;
    foot.appendChild(hint); foot.appendChild(btn); face.appendChild(foot);
    card.appendChild(face);

    const detail = mk("div", "w-detail"); let built = false; const grow = [];
    function build() {
      if (built) return; built = true;
      const lead = p.outcome || p.hook; if (lead) detail.appendChild(mk("p", "w-lead", lead));
      const b = p.body || {};
      const blocks = [["Context", p.context], ["Problem", b.problem], ["Solution", b.approach], ["Result", b.result]].filter((x) => x[1]);
      if (blocks.length) {
        const g = mk("div", "w-blocks");
        blocks.forEach(([k, v], i) => { const d = mk("div", "w-block"); const h = mk("span", "w-mono"); h.innerHTML = "<em>" + (i + 1) + "</em>" + esc(k); d.appendChild(h); d.appendChild(mk("p", "", v)); g.appendChild(d); });
        detail.appendChild(g);
      }
      if (p.csr && p.csr.length) {
        const cg = mk("div", "w-csr");
        p.csr.forEach((tile, i) => {
          const d = mk("div", "w-csr-t"); const h = mk("span", "w-mono");
          h.innerHTML = "<em>" + esc(String(tile.n != null ? tile.n : i + 1)) + "</em>" + esc(tile.k || "");
          d.appendChild(h); d.appendChild(mk("p", "", tile.v || "")); cg.appendChild(d);
        });
        detail.appendChild(cg);
      }
      const rn = p.reviewNotes;
      if (rn && ((rn.notes || []).length || (rn.missing || []).length)) {
        const rb = mk("div", "w-review");
        rb.appendChild(mk("span", "w-mono", "Review notes · hidden when published"));
        (rn.notes || []).forEach((n) => rb.appendChild(mk("p", "", n)));
        (rn.missing || []).forEach((m) => rb.appendChild(mk("p", "w-missing", "Missing: " + m)));
        detail.appendChild(rb);
      }
      const row = mk("div", "w-row");
      const ch = chartNode(p.chart, grow); if (ch) row.appendChild(ch);
      const calls = (p.calls && p.calls.length) ? p.calls : (b.hers ? [b.hers] : []);
      if (calls.length) {
        const c = mk("div", "w-calls"); c.appendChild(mk("p", "w-chart-title", p.calls && p.calls.length ? "Thinking process" : "My call"));
        calls.forEach((x) => c.appendChild(mk("p", "w-call", x))); row.appendChild(c);
      }
      if (row.children.length) detail.appendChild(row);
      if (b.lesson) detail.appendChild(mk("p", "w-lesson", b.lesson));
      const imgs = (p.images && p.images.length)
        ? p.images.filter((im) => im && im.src).map((im) => [im.src, im.alt])
        : [[p.visual, p.visualAlt], [p.diagram, p.diagramAlt]].filter((x) => x[0]);
      if (imgs.length) {
        const r = mk("div", "w-thumbs");
        imgs.forEach(([src, alt]) => { const t = mk("button", "w-thumb"); t.type = "button"; t.setAttribute("aria-label", alt || "Open image"); const im = document.createElement("img"); im.src = src; im.alt = alt || ""; im.loading = "lazy"; t.appendChild(im); t.addEventListener("click", () => lightbox(src, alt)); r.appendChild(t); });
        detail.appendChild(r);
      }
      const ev = mk("div", "w-evidence");
      const left = mk("div", "w-chips"); left.appendChild(mk("span", "w-mono", "Evidence"));
      (p.links || []).forEach((l) => { const a = mk("a", "w-pill", (l.label || "Link") + " ↗"); a.href = l.url; a.target = "_blank"; a.rel = "noopener"; left.appendChild(a); });
      (p.files || []).filter((f) => f.public && f.src).forEach((f) => { const a = mk("a", "w-pill", f.title + " ↗"); a.href = f.src; a.target = "_blank"; a.rel = "noopener"; left.appendChild(a); });
      ev.appendChild(left);
      const right = mk("div", "w-where");
      if (p.setting) right.appendChild(mk("span", "", p.setting));
      if (p.course && p.course.code) right.appendChild(mk("span", "w-mono", [p.course.code, p.course.name, p.course.term].filter(Boolean).join(" · ")));
      ev.appendChild(right);
      detail.appendChild(ev);
    }
    card.appendChild(detail);

    function set(open) {
      card.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.querySelector("span").textContent = open ? "Close" : btnLabel;
      hint.textContent = open ? "Esc or Close to tuck it back" : hintClosed;
      if (open) { build(); requestAnimationFrame(() => setTimeout(() => grow.forEach((f) => f()), reduce ? 0 : 250)); }
    }
    card._set = set;
    btn.addEventListener("click", () => onOpen(card.classList.contains("open") ? null : card));
    return card;
  }

  /* ---------- page ---------- */
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

      // hero totals: live / drafted / queued + segmented bar (design: live ink, draft accent)
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

      // lanes
      const mount = $("lanes"); let openCard = null;
      const onOpen = (card) => { if (openCard && openCard !== card) openCard._set(false); if (card) card._set(true); else if (openCard) openCard._set(false); openCard = card; };
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openCard && !document.querySelector(".lightbox")) onOpen(null); });
      const sections = [];
      lanes.forEach((lane, i) => {
        const sec = mk("section", i % 2 ? "band w-lane" : "section w-lane"); sec.id = lane.id;
        const wrap = mk("div", "wrap");
        wrap.innerHTML = '<div class="section-head"><div class="sh-main"><span class="eyebrow"></span><h2></h2></div><p class="sh-side"></p></div>';
        wrap.querySelector(".eyebrow").textContent = ((page && page.laneEyebrow) || "Lane") + " " + (i + 1);
        wrap.querySelector("h2").textContent = lane.name;
        wrap.querySelector(".sh-side").textContent = lane.blurb || "";
        const emb = embedNode(lane.embed); if (emb) wrap.querySelector(".section-head").appendChild(emb);
        const shown = visibleOf(lane);
        if (shown.length) { const g = mk("div", "w-grid"); shown.forEach((p) => g.appendChild(cardNode(p, onOpen))); wrap.appendChild(g); }
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

      // filter chips in the nav row (design: second nav row, role=tablist)
      const sub = $("nav-chips");
      if (sub) {
        sub.innerHTML = "";
        const chips = [];
        const pick = (id) => {
          chips.forEach((c) => c.classList.toggle("on", c.dataset.id === id));
          sections.forEach((s) => { s.hidden = id !== "all" && s.id !== id; });
          const t = $(id === "all" ? "top" : id); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 100, behavior: reduce ? "auto" : "smooth" });
        };
        [["all", (page && page.subnavTop) || "All", shipped + drafted + queued]].concat(lanes.map((l) => [l.id, l.name, visibleOf(l).length + (l.pipeline || []).length])).forEach(([id, label, n]) => {
          const b = mk("button", "w-chip-btn" + (id === "all" ? " on" : "")); b.type = "button"; b.dataset.id = id;
          b.appendChild(document.createTextNode(label)); b.appendChild(mk("i", "", String(n)));
          b.addEventListener("click", () => pick(id)); sub.appendChild(b); chips.push(b);
        });
      }
    })
    .catch(() => { setText("hero-headline", "Content couldn't load — try refreshing."); });
})();
