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
      "Real titles from the working inventory — no mock cards, no visuals until the work ships. Each one graduates to a full case study above."
    );
    idx.appendChild(head); idx.appendChild(note);
    pipe.forEach((t) => {
      const row = el("div", "pipe-row");
      row.appendChild(el("span", "pipe-title", esc(t.title)));
      row.appendChild(el("span", "pipe-status", esc(t.status || "In the pipeline")));
      idx.appendChild(row);
    });
    mount.appendChild(idx);
  }
}
