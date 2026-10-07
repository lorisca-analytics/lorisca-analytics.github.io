/* site.js — renders content.js into the pages. No copy lives here. */

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/* Mounts an editor-added picture + links for a section.
   Renders nothing when both are empty. Safe to call on re-render. */
function mountSectionMedia(sectionId, sec) {
  const section = document.getElementById(sectionId);
  if (!section || !sec) return;
  section.querySelectorAll(".sec-media, .sec-links").forEach((e) => e.remove());
  const image = (sec.image || "").trim();
  const links = (sec.links || []).filter((l) => l && (l.label || l.href));
  if (!image && !links.length) return;
  const frag = document.createDocumentFragment();
  if (image) {
    const fig = document.createElement("figure");
    fig.className = "sec-media";
    const img = document.createElement("img");
    img.src = image;
    img.alt = sec.imageAlt || "";
    img.loading = "lazy";
    fig.appendChild(img);
    if (sec.imageCaption) {
      const cap = document.createElement("figcaption");
      cap.textContent = sec.imageCaption;
      fig.appendChild(cap);
    }
    frag.appendChild(fig);
  }
  if (links.length) {
    const row = document.createElement("div");
    row.className = "sec-links";
    links.forEach((l) => {
      const a = document.createElement("a");
      a.className = "text-link";
      a.href = l.href || "#";
      a.textContent = (l.label || l.href || "Link") + " \u2192";
      if (l.newTab || /^https?:/.test(a.href)) { a.target = "_blank"; a.rel = "noopener"; }
      row.appendChild(a);
    });
    frag.appendChild(row);
  }
  const head = section.querySelector(".section-head");
  if (head) head.after(frag);
  else {
    const wrap = section.querySelector(".wrap");
    if (wrap) wrap.prepend(frag);
    else section.prepend(frag);
  }
}


/* ---------- data-driven page furniture (data/page.json) ---------- */
function setText(id, v) {
  const e = document.getElementById(id);
  if (e && v != null) e.textContent = v;
}
function setMeta(meta) {
  if (!meta) return;
  if (meta.title) document.title = meta.title;
  const md = document.querySelector('meta[name="description"]');
  if (md && meta.description) md.setAttribute("content", meta.description);
}
/* Renders the editable furniture: back-to-main link, hero buttons,
   and the "what lives here" card. Static HTML stays as the no-JS fallback. */
function renderOrgPage(site, page) {
  if (!page) return;
  setMeta(page.meta);
  if (page.backLink) {
    document.querySelectorAll('[data-nav="main"]').forEach((a) => {
      if (page.backLink.label) a.textContent = page.backLink.label;
      if (page.backLink.href) a.href = page.backLink.href;
    });
  }
  const ctas = document.getElementById("hero-ctas");
  if (ctas && page.heroCtas && page.heroCtas.length) {
    ctas.innerHTML = "";
    page.heroCtas.forEach((c, i) => {
      const a = document.createElement("a");
      a.className = "btn" + (i === 0 ? " primary" : " ghost");
      a.textContent = c.label || "";
      a.href = (c.orgGithub && site && site.githubOrg) ? site.githubOrg : (c.href || "#");
      if (c.orgGithub || c.newTab) { a.target = "_blank"; a.rel = "noopener"; }
      ctas.appendChild(a);
    });
  }
  const nc = page.nowCard;
  const ncTitle = document.getElementById("nc-title");
  const ncRows = document.getElementById("nc-rows");
  if (nc && ncTitle && ncRows) {
    ncTitle.textContent = nc.title || "";
    ncRows.innerHTML = "";
    (nc.rows || []).forEach((r) => {
      const d = document.createElement("div");
      d.className = "nc-row";
      const k = document.createElement("span"); k.className = "k"; k.textContent = r.k || "";
      const v = document.createElement("span"); v.className = "v"; v.textContent = r.v || "";
      d.appendChild(k); d.appendChild(v);
      ncRows.appendChild(d);
    });
  }
}


function linkRow(links) {
  const row = el("div", "card-links");
  links.forEach((l) => {
    const a = el("a", "", esc(l.label));
    a.href = l.url;
    a.target = "_blank";
    a.rel = "noopener";
    row.appendChild(a);
  });
  return row;
}

function cardNode(p) {
  const card = el("article", "card");
  card.id = "card-" + p.id;

  const vis = el("div", "card-visual");
  const img = document.createElement("img");
  img.src = p.visual;
  img.alt = p.visualAlt || p.title;
  img.loading = "lazy";
  vis.appendChild(img);
  card.appendChild(vis);

  const body = el("div", "card-body");
  body.appendChild(el("span", "badge", p.status === "live" ? "Live" : "Building"));
  body.appendChild(el("h3", "card-h", esc(p.title)));
  body.appendChild(el("p", "card-hook", esc(p.hook)));
  body.appendChild(el("p", "card-metric", esc(p.metric)));
  body.appendChild(linkRow(p.links));
  card.appendChild(body);

  const toggle = el("button", "card-toggle", "Showcase ＋");
  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", () => {
    const open = card.classList.toggle("open");
    toggle.textContent = open ? "Showcase －" : "Showcase ＋";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  card.appendChild(toggle);

  const detail = el("div", "card-detail");
  if (p.diagram) {
    const d = document.createElement("img");
    d.className = "diagram";
    d.src = p.diagram;
    d.alt = p.diagramAlt || (p.title + " diagram");
    d.loading = "lazy";
    detail.appendChild(d);
  }
  const rows = [
    ["Problem", p.body.problem],
    ["Approach", p.body.approach],
    ["Hers", p.body.hers],
    ["Result", p.body.result],
    ["Lesson", p.body.lesson],
  ];
  rows.forEach(([k, v]) => {
    const r = el("div", "detail-row");
    r.appendChild(el("span", "k", k));
    r.appendChild(el("span", "v", esc(v)));
    detail.appendChild(r);
  });
  detail.appendChild(linkRow(p.links));
  card.appendChild(detail);

  return card;
}

function renderCards(containerId, projects, cols) {
  const c = document.getElementById(containerId);
  if (!c) return;
  const live = projects.filter((p) => p.status === "live");
  if (!live.length) {
    c.innerHTML = "";
    return;
  }
  c.classList.add("card-grid", cols || "cols-2");
  live.forEach((p) => c.appendChild(cardNode(p)));
}

function renderRoute(containerId) {
  const c = document.getElementById(containerId);
  if (!c || typeof ABOUT === "undefined") return;
  const wrap = el("div", "route");
  ABOUT.route.forEach((s) => {
    const stop = el("div", "stop" + (s.now ? " now" : ""));
    const btn = document.createElement("button");
    btn.innerHTML =
      '<span class="when">' + esc(s.when) + "</span>" +
      '<div class="where">' + esc(s.where) + "</div>" +
      '<div class="role">' + esc(s.role) + "</div>";
    const det = el("div", "detail");
    const ul = document.createElement("ul");
    s.detail.forEach((d) => ul.appendChild(el("li", "", esc(d))));
    det.appendChild(ul);
    btn.appendChild(det);
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const open = stop.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    stop.appendChild(btn);
    wrap.appendChild(stop);
  });
  c.appendChild(wrap);
}

/* Nav active state */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  document.querySelectorAll(".nav-links a").forEach((a) => {
    if (a.dataset.nav === page) a.classList.add("active");
  });
  // footer year
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});

/* Lane renderer: shipped cards + honest pipeline index */
function renderLane(mountId, lane) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  const grid = document.createElement("div");
  const live = (lane.projects || []).filter((p) => p.status === "live");
  if (live.length) {
    grid.className = "card-grid " + (live.length > 1 ? "cols-2" : "cols-1");
    live.forEach((p) => grid.appendChild(cardNode(p)));
    mount.appendChild(grid);
  }
  const pipe = lane.pipeline || [];
  if (pipe.length) {
    const idx = document.createElement("div");
    idx.className = "pipeline-index";
    const head = el("p", "pipe-head", "In the pipeline");
    const note = el(
      "p", "pipe-note",
      "Works in progress. Each graduates to a full case study when it ships."
    );
    idx.appendChild(head); idx.appendChild(note);
    pipe.forEach((t) => {
      const row = el("div", "pipe-row");
      const title = el("span", "pipe-title");
      if (t.link) {
        const a = el("a", "", esc(t.title));
        a.href = t.link; a.target = "_blank"; a.rel = "noopener";
        title.appendChild(a);
      } else {
        title.innerHTML = esc(t.title);
      }
      row.appendChild(title);
      row.appendChild(el("span", "pipe-status", esc(t.status || "In the pipeline")));
      idx.appendChild(row);
    });
    mount.appendChild(idx);
  }
}

/* ---------- data-driven pages: shared helpers ---------- */

async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error("missing " + path);
  return r.json();
}

function applyOrgChrome(site) {
  if (!site) return;
  document.querySelectorAll(".wm-name").forEach((e) => { e.textContent = site.orgLabel || site.owner; });
  document.querySelectorAll(".wm-role").forEach((e) => { e.textContent = site.org || ""; });
  const fl = document.querySelector(".foot-links");
  if (fl) {
    fl.innerHTML = "";
    [
      [site.owner, site.mainSite, false],
      ["Analytics Work", "https://lorisca-analytics.github.io", false],
      ["Builds", "https://lorisca-builds.github.io", false],
      ["About", site.mainSite + "/about.html", false],
      ["Email", "mailto:" + site.email, false],
      ["LinkedIn", "https://www.linkedin.com/in/lorisca", true],
      ["GitHub", site.githubOrg, true],
    ].forEach(([label, href, ext]) => {
      const a = el("a", "", esc(label));
      a.href = href;
      if (ext) { a.target = "_blank"; a.rel = "noopener"; }
      fl.appendChild(a);
    });
  }
  const fine = document.querySelector(".site-footer .fine");
  if (fine) fine.innerHTML = "&copy; " + new Date().getFullYear() + " " + esc(site.owner || "");
  document.querySelectorAll('[data-org-github]').forEach((a) => { a.href = site.githubOrg; });
}

/* Embed block: YouTube plays inline, anything else becomes a link card. */
function embedNode(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) {
    const wrap = el("div", "embed-video");
    const fr = document.createElement("iframe");
    fr.src = "https://www.youtube.com/embed/" + m[1];
    fr.loading = "lazy";
    fr.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    fr.allowFullscreen = true;
    wrap.appendChild(fr);
    return wrap;
  }
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) {}
  const a = el("a", "embed-card");
  a.href = url; a.target = "_blank"; a.rel = "noopener";
  a.appendChild(el("span", "", "&#128279;"));
  a.appendChild(el("span", "", esc(host)));
  return a;
}
