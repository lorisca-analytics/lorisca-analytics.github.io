/* rows.js: Work hub renderer (redesign thread 3, Oct 2026).
   One wide card per row, the shared card from main shared.css (wc-, ds-).
   Each card: label, title, hook, the problem > move > result line (`trace`),
   a picture drawn from the color tokens (`cardVisual`), and a Deep dive that
   opens a step-by-step walkthrough inside the card.
   Public page shows live cards only. A group with no live card is hidden.
   Pipeline titles show only when page.json `showPipeline` is true.
   Every field is optional, so old JSON still renders. Needs site.js first
   (loadJSON, applyOrgChrome, renderOrgPage, mountSectionMedia, embedNode, setText).
   Plain JS, no build step. Page classes start with wk- (rows.css). */
(function () {
  const $ = (id) => document.getElementById(id);
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const has = (v) => v != null && String(v).trim() !== "";
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
  const fmt = (n) => Number(n).toLocaleString("en-US");
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSvg = (s) => /\.svg(\?|#|$)/i.test(s || "");

  /* ---------- lightbox ---------- */
  function lightbox(src, alt) {
    const lb = mk("div", "wk-lightbox");
    lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", alt || "Image");
    const img = document.createElement("img"); img.src = src; img.alt = alt || "";
    lb.appendChild(img);
    if (alt) lb.appendChild(mk("p", "wk-lb-cap", alt));
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
  function btn(label, href, dark, ext) {
    const a = mk("a", "ds-btn " + (dark ? "ds-btn-dark" : "ds-btn-line"), label);
    a.href = href; if (ext) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }

  /* ---------- card picture, drawn from tokens (same rules as Home's visual()) ---------- */
  function barRow(label, text, bar) {
    const row = mk("div", "wc-bar-row"), lab = mk("span", "ds-label");
    lab.appendChild(mk("span", "", label || "")); lab.appendChild(mk("span", "", text || ""));
    row.appendChild(lab); row.appendChild(bar);
    return row;
  }
  function picture(p) {
    const box = mk("div", "wc-visual");
    const v = p.cardVisual || {};
    const kind = v.kind || "";
    const a = num(v.aValue), b = num(v.bValue);
    if (kind) {
      box.setAttribute("aria-hidden", "true");
      if (has(v.label)) box.appendChild(mk("span", "ds-label", v.label));
      if (kind === "swing" && a != null && b != null && a < 0 && b > 0) {
        const total = Math.abs(a) + b, zero = (Math.abs(a) / total * 100).toFixed(1) + "%";
        const wrap = mk("div", "wc-bars"), t1 = mk("div", "wc-track"), t2 = mk("div", "wc-track");
        t1.style.setProperty("--zero", zero); t2.style.setProperty("--zero", zero);
        const neg = mk("div", "wc-bar"); neg.style.left = "0"; neg.style.width = zero; t1.appendChild(neg);
        const pos = mk("div", "wc-bar after"); pos.style.left = zero; pos.style.width = (b / total * 100).toFixed(1) + "%"; t2.appendChild(pos);
        wrap.appendChild(barRow(v.aLabel, v.aText || fmt(a), t1));
        wrap.appendChild(barRow(v.bLabel, v.bText || fmt(b), t2));
        const z = mk("div", "wc-zero ds-label"); z.style.setProperty("--zero", zero); z.appendChild(mk("span", "", "$0")); wrap.appendChild(z);
        box.appendChild(wrap);
      } else if ((kind === "bars" || kind === "swing") && a != null && b != null) {
        const max = Math.max(Math.abs(a), Math.abs(b)) || 1, bars = mk("div", "wc-bars");
        const b1 = mk("div", "wc-bar"); b1.style.width = (Math.abs(a) / max * 100).toFixed(1) + "%";
        const b2 = mk("div", "wc-bar after"); b2.style.width = (Math.abs(b) / max * 100).toFixed(1) + "%";
        bars.appendChild(barRow(v.aLabel, v.aText || fmt(a), b1));
        bars.appendChild(barRow(v.bLabel, v.bText || fmt(b), b2));
        box.appendChild(bars);
      }
      if (has(v.big)) box.appendChild(mk("span", "wc-big" + (String(v.big).length > 9 ? " sm" : ""), v.big));
      return box;
    }
    /* no drawn picture yet (a newly synced card): show the cover picture, else the metric line */
    const src = p.visual || (p.images && p.images[0] && p.images[0].src) || p.diagram;
    if (src) {
      const alt = p.visual ? p.visualAlt : (p.images && p.images[0] && p.images[0].src) ? p.images[0].alt : p.diagramAlt;
      const th = mk("button", "wk-cover"); th.type = "button";
      th.setAttribute("aria-label", "Enlarge: " + (alt || p.title || "picture"));
      th.appendChild(imgNode(src, alt || p.title));
      th.addEventListener("click", () => lightbox(src, alt || p.title));
      box.classList.add("has-cover"); box.appendChild(th);
      return box;
    }
    box.setAttribute("aria-hidden", "true");
    if (has(p.metric)) box.appendChild(mk("span", "wc-big sm", p.metric));
    return box;
  }

  /* ---------- deep dive charts (optional `chart` on a project) ---------- */
  function chartNode(c) {
    if (!c || !c.type) return null;
    const box = mk("div", "wk-chart");
    if (c.title) box.appendChild(mk("p", "wk-chart-title", c.title));
    if (c.type === "bars" && c.items && c.items.length) {
      const max = Math.max(...c.items.map((i) => Math.abs(i.value || 0))) || 1, bars = mk("div", "wc-bars");
      c.items.forEach((it) => {
        const bar = mk("div", "wc-bar" + (it.highlight ? " after" : ""));
        bar.style.width = ((Math.abs(it.value || 0) / max) * 100).toFixed(1) + "%";
        bars.appendChild(barRow(it.label, it.display || fmt(it.value), bar));
      });
      box.appendChild(bars);
    } else if (c.type === "compare" && c.left && c.right) {
      const g = mk("div", "wk-compare");
      [c.left, c.right].forEach((sd) => { const s = mk("div"); s.appendChild(mk("span", "ds-label", sd.label || "")); (sd.points || []).forEach((pt) => s.appendChild(mk("p", "", pt))); g.appendChild(s); });
      box.appendChild(g);
    } else if (c.type === "steps" && c.items) {
      const ol = mk("ol", "wk-steps"); c.items.forEach((st) => { const li = mk("li"); li.appendChild(mk("b", "", st.label || "")); if (st.note) li.appendChild(mk("span", "", st.note)); ol.appendChild(li); });
      box.appendChild(ol);
    } else if (c.type === "hub") {
      box.appendChild(mk("p", "", [(c.inputs || []).join(", "), c.hub, (c.outputs || []).join(", ")].filter(Boolean).join(" → ")));
    }
    if (c.caption) box.appendChild(mk("p", "wk-chart-cap", c.caption));
    return box;
  }

  /* ---------- walkthrough steps, same order as before ---------- */
  function stepsOf(p) {
    const b = p.body || {}, out = [];
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

  /* ---------- one card ---------- */
  function cardNode(p, ctl) {
    const steps = stepsOf(p);
    const card = mk("article", "wc wk-card"); card.id = "card-" + p.id;
    const body = mk("div", "wc-body");
    if (has(p.metric)) body.appendChild(mk("span", "ds-label", p.metric));
    body.appendChild(mk("h3", "wc-title", p.title || ""));
    if (has(p.hook)) body.appendChild(mk("p", "wc-sum", p.hook));
    const t = p.trace || {};
    if (has(t.problem) || has(t.move) || has(t.result)) {
      const ol = mk("ol", "wc-trace"); ol.setAttribute("aria-label", "Problem, move and result");
      [["Problem", t.problem], ["Move", t.move], ["Result", t.result]].forEach((x) => {
        const li = mk("li"); li.appendChild(mk("span", "ds-label", x[0])); li.appendChild(mk("span", "", x[1] || "")); ol.appendChild(li);
      });
      body.appendChild(ol);
    }
    const foot = mk("div", "wc-foot");
    const label = p.btnLabel || "Deep dive";
    let dd = null;
    if (steps.length) {
      dd = mk("button", "ds-btn ds-btn-dark wk-dd"); dd.type = "button";
      dd.setAttribute("aria-expanded", "false"); dd.setAttribute("aria-controls", "walk-" + p.id);
      dd.appendChild(mk("span", "", label)); dd.appendChild(mk("i", "", "+"));
      if (p.hint) dd.title = p.hint;
      dd.addEventListener("click", () => ctl.toggle(card));
      foot.appendChild(dd);
    }
    const links = (p.links || []).filter((l) => l && l.url);
    const repo = links.filter((l) => l.kind === "github")[0];
    if (repo) foot.appendChild(btn(repo.label || "Repo", repo.url, false, true));
    const more = links.length - (repo ? 1 : 0);
    if (more > 0 && steps.length) foot.appendChild(mk("span", "wc-note", more === 1 ? "1 more link in the deep dive" : more + " more links in the deep dive"));
    else if (p.tools && p.tools.length) foot.appendChild(mk("span", "wc-note", p.tools.join(", ")));
    if (!steps.length) links.filter((l) => l !== repo).forEach((l) => foot.appendChild(btn(l.label || "Link", l.url, false, true)));
    if (foot.children.length) body.appendChild(foot);
    card.appendChild(body);
    card.appendChild(picture(p));
    if (!steps.length) return card;

    /* walkthrough: built on first open */
    const walk = mk("div", "wk-walk"); walk.id = "walk-" + p.id; walk.hidden = true;
    const vis = p.visual ? [p.visual, p.visualAlt] : (p.images && p.images[0] && p.images[0].src) ? [p.images[0].src, p.images[0].alt] : null;
    const dia = p.diagram ? [p.diagram, p.diagramAlt] : null;
    let built = false, step = 0, media, chartBox, cap, counter, h, text, endBox, dots, back, next, curImg = null;

    function build() {
      if (built) return; built = true;
      const fig = mk("div", "wk-fig");
      media = mk("button", "wk-media"); media.type = "button";
      media.appendChild(mk("span", "wk-zoom", "Enlarge"));
      media.addEventListener("click", () => { if (curImg) lightbox(curImg[0], curImg[1]); });
      fig.appendChild(media);
      chartBox = chartNode(p.chart);
      if (chartBox) fig.appendChild(chartBox);
      cap = mk("p", "wk-cap"); fig.appendChild(cap);
      if (vis || dia || chartBox) walk.appendChild(fig); else walk.classList.add("no-fig");

      const panel = mk("div", "wk-panel"); panel.setAttribute("aria-live", "polite");
      const top = mk("div", "wk-ptop");
      counter = mk("span", "ds-label"); top.appendChild(counter);
      const x = mk("button", "wk-x"); x.type = "button"; x.setAttribute("aria-label", "Close deep dive");
      x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
      x.addEventListener("click", () => ctl.toggle(card)); top.appendChild(x);
      panel.appendChild(top);
      h = mk("h4", "wk-step-h"); text = mk("div", "wk-step-t");
      panel.appendChild(h); panel.appendChild(text);

      /* last step: evidence (links, public files, setting). Course and group labels stay off the public page. */
      endBox = mk("div", "wk-end");
      const ev = mk("div", "wk-links");
      links.forEach((l) => { const demo = l.kind === "demo" || l.kind === "video"; ev.appendChild(btn((l.label || "Link") + (l.kind === "github" ? " →" : " ↗"), l.url, demo, true)); });
      (p.files || []).filter((f) => f.public && f.src).forEach((f) => ev.appendChild(btn((f.title || "File") + " ↗", f.src, false, true)));
      if (ev.children.length) { endBox.appendChild(mk("span", "ds-label", "Evidence")); endBox.appendChild(ev); }
      if (p.setting) endBox.appendChild(mk("p", "wk-setting", p.setting));
      panel.appendChild(endBox);

      const nav = mk("div", "wk-nav");
      back = mk("button", "wk-back", "← Back"); back.type = "button"; back.addEventListener("click", () => go(step - 1));
      dots = mk("div", "wk-dots");
      steps.forEach((s, j) => { const d = mk("button", "wk-dot"); d.type = "button"; d.setAttribute("aria-label", s.k); d.addEventListener("click", () => go(j)); dots.appendChild(d); });
      next = mk("button", "ds-btn ds-btn-dark wk-next"); next.type = "button";
      next.addEventListener("click", () => (step === steps.length - 1 ? ctl.toggle(card) : go(step + 1)));
      nav.appendChild(back); nav.appendChild(dots); nav.appendChild(next);
      panel.appendChild(nav);
      walk.appendChild(panel);
    }

    function showMedia(s, idx) {
      // Solution step shows the chart when there is one. From Solution on, the diagram replaces the cover.
      const solIdx = steps.findIndex((q) => q.kind === "solution");
      const after = solIdx >= 0 ? idx >= solIdx : idx >= 1;
      const useChart = chartBox && s.kind === "solution";
      const img = useChart ? null : (after && dia) ? dia : (vis || dia);
      const showChart = useChart || (!img && chartBox);
      if (chartBox) chartBox.hidden = !showChart;
      media.hidden = showChart || !img;
      if (!showChart && img && (!curImg || curImg[0] !== img[0])) {
        const old = media.querySelector("img"); if (old) old.remove();
        media.insertBefore(imgNode(img[0], img[1] || p.title, "wk-img"), media.firstChild);
      }
      curImg = showChart ? null : img;
      cap.textContent = showChart ? "" : (img && img[1]) || "";
      cap.hidden = !cap.textContent;
    }

    function go(n2) {
      step = Math.max(0, Math.min(steps.length - 1, n2));
      const s = steps[step], last = step === steps.length - 1;
      counter.textContent = "Step " + (step + 1) + " of " + steps.length;
      h.textContent = s.k;
      text.innerHTML = "";
      if (s.kind === "list") s.v.forEach((v) => text.appendChild(mk("p", "wk-call", v)));
      else text.appendChild(mk("p", "", s.v));
      endBox.hidden = !last || !endBox.children.length;
      back.disabled = step === 0;
      next.textContent = last ? "Done" : "Next →";
      [...dots.children].forEach((d, j) => { if (j === step) d.setAttribute("aria-current", "step"); else d.removeAttribute("aria-current"); });
      if (walk.querySelector(".wk-fig")) showMedia(s, step);
      text.classList.remove("wk-in"); void text.offsetWidth; if (!reduce) text.classList.add("wk-in");
    }
    card.appendChild(walk);

    card._set = (open) => {
      card.classList.toggle("open", open);
      walk.hidden = !open;
      dd.setAttribute("aria-expanded", open ? "true" : "false");
      dd.querySelector("span").textContent = open ? "Close" : label;
      if (open) { build(); go(0); }
    };
    card._step = (d) => go(step + d);
    return card;
  }

  /* ---------- page ---------- */
  Promise.all([loadJSON("data/site.json"), loadJSON("data/hero.json"), loadJSON("data/lanes.json"), loadJSON("data/page.json").catch(() => null)])
    .then(([site, hero, data, page]) => {
      applyOrgChrome(site);
      renderOrgPage(site, page);
      document.querySelectorAll("#hero-ctas a").forEach((a, i) => { a.className = "ds-btn " + (i === 0 ? "ds-btn-dark" : "ds-btn-line"); });
      mountSectionMedia("top", hero);
      setText("hero-eyebrow", hero.eyebrow); setText("hero-headline", hero.headline); setText("hero-lede", hero.lede);

      const lanes = data.lanes || [];
      const liveOf = (l) => (l.projects || []).filter((p) => p.status === "live");
      const showPipe = !!(page && page.showPipeline);

      // one open card at a time, Esc closes, arrow keys step
      let openCard = null;
      const ctl = {
        toggle(card) {
          if (openCard && openCard !== card) openCard._set(false);
          const willOpen = openCard !== card;
          card._set(willOpen); openCard = willOpen ? card : null;
          if (willOpen) {
            const top = card.getBoundingClientRect().top;
            if (top < 80 || top > window.innerHeight * 0.6) window.scrollTo({ top: top + window.scrollY - 130, behavior: reduce ? "auto" : "smooth" });
          }
        },
      };
      document.addEventListener("keydown", (e) => {
        if (!openCard || document.querySelector(".wk-lightbox")) return;
        if (e.target.closest && e.target.closest("input, textarea, select, [role=dialog]")) return;
        if (e.key === "Escape") ctl.toggle(openCard);
        else if (e.key === "ArrowRight") { e.preventDefault(); openCard._step(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); openCard._step(-1); }
      });

      const mount = $("lanes"); mount.innerHTML = "";
      const sections = []; let total = 0;
      lanes.forEach((lane) => {
        const live = liveOf(lane);
        if (!live.length) return;                       // a group shows only when it has a live case
        total += live.length;
        const sec = mk("section", "wk-lane"); sec.id = lane.id; sec.setAttribute("aria-labelledby", lane.id + "-h");
        const wrap = mk("div", "wrap");
        const head = mk("div", "wk-lane-head"), left = mk("div");
        left.appendChild(mk("span", "ds-label", live.length === 1 ? "1 case" : live.length + " cases"));
        const h2 = mk("h2", "", lane.name || ""); h2.id = lane.id + "-h"; left.appendChild(h2);
        head.appendChild(left);
        if (has(lane.blurb)) head.appendChild(mk("p", "", lane.blurb));
        const emb = embedNode(lane.embed); if (emb) head.appendChild(emb);
        wrap.appendChild(head);
        const list = mk("div", "wc-list");
        live.forEach((p) => list.appendChild(cardNode(p, ctl)));
        wrap.appendChild(list);
        const pipe = lane.pipeline || [];
        if (showPipe && pipe.length) {
          const d = mk("details", "wk-pipe"); d.appendChild(mk("summary", "", "Coming next"));
          const ul = mk("ul");
          pipe.forEach((t) => { const li = mk("li"); if (t.link) { const a = mk("a", "", t.title); a.href = t.link; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a); } else li.textContent = t.title; ul.appendChild(li); });
          d.appendChild(ul); wrap.appendChild(d);
        }
        sec.appendChild(wrap); mount.appendChild(sec); mountSectionMedia(lane.id, lane); sections.push(sec);
      });

      // filter buttons in the header's second row: live groups only
      const sub = $("nav-chips");
      if (sub) {
        sub.innerHTML = "";
        const chips = [];
        const pick = (id) => {
          chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.id === id)));
          sections.forEach((s) => { s.hidden = id !== "all" && s.id !== id; });
          const t = $(id === "all" ? "top" : id); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 120, behavior: reduce ? "auto" : "smooth" });
        };
        [["all", (page && page.subnavTop) || "All", total]].concat(sections.map((s) => { const l = lanes.find((x) => x.id === s.id); return [l.id, l.name, liveOf(l).length]; })).forEach(([id, name, cnt]) => {
          const b = mk("button", "wk-chip"); b.type = "button"; b.dataset.id = id;
          b.setAttribute("aria-pressed", String(id === "all"));
          b.appendChild(document.createTextNode(name)); b.appendChild(mk("i", "", String(cnt)));
          b.addEventListener("click", () => pick(id)); sub.appendChild(b); chips.push(b);
        });
      }

      // a link to #card-… (Home's Deep dive buttons) scrolls to that card
      if (/^#card-/.test(location.hash)) { const c = document.querySelector(location.hash); if (c) setTimeout(() => c.scrollIntoView({ block: "center" }), 60); }

      // one fade-in per card, only below the first screen
      if ("IntersectionObserver" in window && !reduce) {
        const cards = document.querySelectorAll(".wk-card");
        const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
        cards.forEach((c) => { if (c.getBoundingClientRect().top > window.innerHeight) { c.classList.add("wk-rv"); io.observe(c); } });
        setTimeout(() => cards.forEach((c) => c.classList.add("in")), 2500);
      }

      // section order, hidden sections, looks and builder-added sections (admin page builder)
      if (window.Theme && Theme.applyLayout && page && page.layout) Theme.applyLayout(document.querySelector("main"), { hero: hero, lanes: data, page: page || {} }, { site: site, layoutIn: "page" });
    })
    .catch(() => { setText("hero-headline", "Content couldn't load. Try refreshing."); });
})();
