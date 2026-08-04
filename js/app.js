const state = {
  works: [],
  order: [],
  active: "全部",
};

const $ = (sel) => document.querySelector(sel);
const overlay = $("#playerOverlay");
const playerFrame = $("#playerFrame");

const PLAY_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function categories() {
  const seen = [];
  for (const work of state.works) {
    if (!seen.includes(work.category)) {
      seen.push(work.category);
    }
  }
  return seen;
}

function cardHTML(work) {
  return `
    <article class="work-card">
      <button class="work-open" type="button" data-id="${esc(work.id)}" aria-label="打开作品 ${esc(work.title)}">
        <div class="work-cover">
          <img src="${esc(work.cover)}" alt="${esc(work.title)}" loading="lazy">
          <span class="play-badge">${PLAY_ICON}</span>
        </div>
        <div class="work-meta">
          <h3 class="work-title">${esc(work.title)}</h3>
          <span class="work-cat">${esc(work.category)}</span>
        </div>
      </button>
    </article>
  `;
}

function filteredWorks() {
  if (state.active === "全部") {
    return state.works;
  }
  return state.works.filter((work) => work.category === state.active);
}

function renderFilters() {
  const bar = $("#filterBar");
  const chips = ["全部", ...categories()].map((cat) => {
    const count =
      cat === "全部"
        ? state.works.length
        : state.works.filter((work) => work.category === cat).length;
    const active = cat === state.active ? " active" : "";
    return `
      <button class="filter-chip${active}" type="button" data-cat="${esc(cat)}">
        ${esc(cat)}<span>${count}</span>
      </button>
    `;
  });
  bar.innerHTML = chips.join("");
}

function renderGrid() {
  const grid = $("#workGrid");
  const works = filteredWorks();
  state.order = works.map((work) => work.id);
  $("#worksCount").textContent = `共 ${works.length} 部作品`;
  grid.innerHTML = works.map(cardHTML).join("");
}

function renderFeatured() {
  const track = $("#featuredTrack");
  track.innerHTML = state.works
    .filter((work) => work.featured)
    .map(cardHTML)
    .join("");
}

function playerHTML(work) {
  const source = work.source;
  if (source.type === "bilibili") {
    return `
      <iframe
        src="https://player.bilibili.com/player.html?bvid=${esc(source.bvid)}&page=1&high_quality=1&danmaku=0"
        allowfullscreen
        scrolling="no"
        title="${esc(work.title)}"
      ></iframe>
    `;
  }
  return `
    <video controls playsinline preload="metadata"
      poster="${esc(work.cover)}"
      src="${esc(source.path)}"
    ></video>
  `;
}

function renderDetails(work) {
  const rows = [];
  if (work.year) {
    rows.push(`<div><dt>年份</dt><dd>${esc(work.year)}</dd></div>`);
  }
  if (work.role) {
    rows.push(`<div><dt>角色</dt><dd>${esc(work.role)}</dd></div>`);
  }
  if (work.source.type === "bilibili") {
    rows.push(`<div><dt>平台</dt><dd>哔哩哔哩</dd></div>`);
  }
  $("#playerDetails").innerHTML = rows.join("");
}

function openWork(id) {
  const index = state.order.indexOf(id);
  if (index < 0) {
    return;
  }
  const work = state.works.find((item) => item.id === id);
  $("#playerCategory").textContent = work.category;
  $("#playerTitle").textContent = work.title;
  $("#playerNote").textContent = work.note || "";
  playerFrame.innerHTML = playerHTML(work);
  renderDetails(work);
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  if (!location.hash.includes("work/")) {
    location.hash = `work/${encodeURIComponent(work.id)}`;
  }
}

function closeWork() {
  overlay.hidden = true;
  playerFrame.innerHTML = "";
  document.body.style.overflow = "";
  history.replaceState(null, "", location.pathname + location.search);
}

function currentIdFromHash() {
  const match = location.hash.match(/^#work\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function bindCards() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".work-open");
    if (button) {
      openWork(button.dataset.id);
    }
  });
}

function bindControls() {
  $("#filterBar").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-cat]");
    if (!chip) {
      return;
    }
    state.active = chip.dataset.cat;
    renderFilters();
    renderGrid();
  });

  $("#closePlayer").addEventListener("click", closeWork);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeWork();
    }
  });

  $("#prevWork").addEventListener("click", () => {
    const current = state.order.indexOf(currentIdFromHash());
    const prev = current >= 0 ? (current - 1 + state.order.length) % state.order.length : 0;
    openWork(state.order[prev]);
  });

  $("#nextWork").addEventListener("click", () => {
    const current = state.order.indexOf(currentIdFromHash());
    const next = current >= 0 ? (current + 1) % state.order.length : 0;
    openWork(state.order[next]);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
      closeWork();
    }
  });
}

function bindNav() {
  const toggle = $(".nav-toggle");
  const nav = $(".site-nav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", (event) => {
    if (event.target.tagName === "A") {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function bindCopy() {
  document.addEventListener("click", async (event) => {
    const cell = event.target.closest("[data-copy]");
    if (!cell) {
      return;
    }
    try {
      await navigator.clipboard.writeText(cell.dataset.copy);
      const strong = cell.querySelector("strong");
      const original = strong.textContent;
      strong.textContent = "已复制";
      setTimeout(() => {
        strong.textContent = original;
      }, 1200);
    } catch {
      window.prompt("复制微信账号", cell.dataset.copy);
    }
  });
}

function handleHash() {
  const match = location.hash.match(/^#work\/(.+)$/);
  if (match && overlay.hidden) {
    openWork(decodeURIComponent(match[1]));
  }
}

async function init() {
  bindNav();
  bindCards();
  bindControls();
  bindCopy();
  try {
    if (window.WORKS_DATA && Array.isArray(window.WORKS_DATA.works)) {
      state.works = window.WORKS_DATA.works;
    } else {
      const response = await fetch("data/works.json");
      const data = await response.json();
      state.works = data.works;
    }
  } catch {
    $("#workGrid").innerHTML = "<p>作品数据加载失败</p>";
    return;
  }
  renderFilters();
  renderGrid();
  renderFeatured();
  window.addEventListener("hashchange", handleHash);
  handleHash();
}

init();
