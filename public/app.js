const POSTER_BASE = "https://image.tmdb.org/t/p/w342";
const PROVIDER_LOGO_BASE = "https://image.tmdb.org/t/p/w92";

const THEMES = [
  { id: "default", name: "Default", bg: "#f7f7f5", accent: "#e63946" },
  { id: "theater", name: "Theater", bg: "#1b0f12", accent: "#d4a017" },
  { id: "midnight", name: "Midnight", bg: "#0d1b2a", accent: "#4cc9f0" },
  { id: "spooky", name: "Spooky", bg: "#0b0b0d", accent: "#ff7518" },
  { id: "pastel", name: "Pastel", bg: "#fdf3f8", accent: "#ff8fab" },
];

const DEFAULT_SORT = "added_desc";

const SORT_KEYS = [
  {
    label: "Date Added",
    up: { id: "added_desc", detail: "Newest First" },
    down: { id: "added_asc", detail: "Oldest First" },
  },
  {
    label: "Release Date",
    up: { id: "release_desc", detail: "Newest First" },
    down: { id: "release_asc", detail: "Oldest First" },
  },
  {
    label: "Title",
    up: { id: "title_asc", detail: "A–Z" },
    down: { id: "title_desc", detail: "Z–A" },
  },
];

const state = {
  movies: [],
  allTags: [],
  activeTags: new Set(),
  activePicks: new Set(),
  activeTab: "towatch",
  sortBy: DEFAULT_SORT,
  newMovieIds: new Set(),
  locallyAddedIds: new Set(),
  selectedSearchResult: null,
  selectedTags: new Set(),
  choice: { jc: false, cc: false },
  detail: null,
};

const el = {
  grid: document.getElementById("movie-grid"),
  emptyState: document.getElementById("empty-state"),
  tagFilters: document.getElementById("tag-filters"),
  tabBtns: document.querySelectorAll(".tab-btn"),

  addMovieBtn: document.getElementById("add-movie-btn"),
  backBtn: document.getElementById("back-btn"),
  closeModalBtn: document.getElementById("close-modal-btn"),
  sheetTitle: document.getElementById("sheet-title"),
  modal: document.getElementById("add-modal"),
  stepSearch: document.getElementById("step-search"),
  stepDetails: document.getElementById("step-details"),
  searchInput: document.getElementById("search-input"),
  searchResults: document.getElementById("search-results"),
  selectedPoster: document.getElementById("selected-poster"),
  selectedTitle: document.getElementById("selected-title"),
  selectedYear: document.getElementById("selected-year"),
  tagPicker: document.getElementById("tag-picker"),
  newTagInput: document.getElementById("new-tag-input"),
  addTagBtn: document.getElementById("add-tag-btn"),
  confirmAddBtn: document.getElementById("confirm-add-btn"),

  detailModal: document.getElementById("detail-modal"),
  detailCloseBtn: document.getElementById("detail-close-btn"),
  detailPoster: document.getElementById("detail-poster"),
  detailTitle: document.getElementById("detail-title"),
  detailYear: document.getElementById("detail-year"),
  detailMeta: document.getElementById("detail-meta"),
  detailOverview: document.getElementById("detail-overview"),
  detailDirector: document.getElementById("detail-director"),
  detailCast: document.getElementById("detail-cast"),
  detailProviders: document.getElementById("detail-providers"),
  detailProvidersLink: document.getElementById("detail-providers-link"),
  detailTagPicker: document.getElementById("detail-tag-picker"),
  detailNewTagInput: document.getElementById("detail-new-tag-input"),
  detailAddTagBtn: document.getElementById("detail-add-tag-btn"),
  detailSaveBtn: document.getElementById("detail-save-btn"),

  menuBtn: document.getElementById("menu-btn"),
  menuOverlay: document.getElementById("menu-overlay"),
  menuCloseBtn: document.getElementById("menu-close-btn"),
  themeOptions: document.getElementById("theme-options"),
  menuVersion: document.getElementById("menu-version"),
  themeColorMeta: document.getElementById("meta-theme-color"),

  scrollTopBtn: document.getElementById("scroll-top-btn"),

  pullRefresh: document.getElementById("pull-refresh"),

  sortBtn: document.getElementById("sort-btn"),
  sortModal: document.getElementById("sort-modal"),
  sortCloseBtn: document.getElementById("sort-close-btn"),
  sortOptions: document.getElementById("sort-options"),

  newToast: document.getElementById("new-toast"),
  newToastText: document.getElementById("new-toast-text"),
};

el.choiceBtns = el.modal.querySelectorAll(".choice-btn");
el.detailChoiceBtns = el.detailModal.querySelectorAll(".choice-btn");

// --- Cookies & theme ---

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value, days) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${days * 86400}; path=/; SameSite=Lax`;
}

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || "default";
}

function applyTheme(themeId) {
  if (themeId === "default") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", themeId);
  }
  updateThemeColorMeta();
}

function updateThemeColorMeta() {
  requestAnimationFrame(() => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    if (bg) el.themeColorMeta.setAttribute("content", bg);
  });
}

function renderThemeOptions() {
  const current = currentTheme();

  el.themeOptions.innerHTML = THEMES.map(
    (t) => `
    <button type="button" class="theme-option ${current === t.id ? "active" : ""}" data-theme="${t.id}">
      <span class="theme-swatch" style="background:${t.bg}">
        <span class="theme-swatch-dot" style="background:${t.accent}"></span>
      </span>
      <span class="theme-name">${t.name}</span>
      ${current === t.id ? '<span class="theme-check">✓</span>' : ""}
    </button>`
  ).join("");

  el.themeOptions.querySelectorAll(".theme-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.theme;
      applyTheme(id);
      setCookie("theme", id, 365);
      renderThemeOptions();
    });
  });
}

let cachedVersionId = null;

async function loadVersionId() {
  if (cachedVersionId) return cachedVersionId;
  const res = await fetch("/api/version");
  const data = await res.json();
  cachedVersionId = data.id;
  return cachedVersionId;
}

el.menuBtn.addEventListener("click", async () => {
  renderThemeOptions();
  el.menuOverlay.hidden = false;
  el.menuVersion.textContent = `Build ${(await loadVersionId()).slice(0, 8)}`;
});

el.menuCloseBtn.addEventListener("click", () => {
  el.menuOverlay.hidden = true;
});

el.menuOverlay.addEventListener("click", (e) => {
  if (e.target === el.menuOverlay) el.menuOverlay.hidden = true;
});

// --- Sort ---

function renderSortOptions() {
  el.sortOptions.innerHTML = SORT_KEYS.map((key) => {
    const activeDir =
      state.sortBy === key.up.id ? key.up : state.sortBy === key.down.id ? key.down : null;

    return `
      <div class="sort-row">
        <span class="sort-row-label">
          ${escapeHtml(key.label)}
          ${activeDir ? `<span class="sort-row-detail">(${escapeHtml(activeDir.detail)})</span>` : ""}
        </span>
        <div class="sort-arrows">
          <button type="button" class="sort-arrow-btn ${state.sortBy === key.up.id ? "active" : ""}" data-sort="${key.up.id}" aria-label="${escapeHtml(key.label)} ${escapeHtml(key.up.detail)}">↑</button>
          <button type="button" class="sort-arrow-btn ${state.sortBy === key.down.id ? "active" : ""}" data-sort="${key.down.id}" aria-label="${escapeHtml(key.label)} ${escapeHtml(key.down.detail)}">↓</button>
        </div>
      </div>`;
  }).join("");

  el.sortOptions.querySelectorAll(".sort-arrow-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.sortBy = btn.dataset.sort;
      renderSortOptions();
      render();
    });
  });
}

el.sortBtn.addEventListener("click", () => {
  renderSortOptions();
  el.sortModal.hidden = false;
});

el.sortCloseBtn.addEventListener("click", () => {
  el.sortModal.hidden = true;
});

el.sortModal.addEventListener("click", (e) => {
  if (e.target === el.sortModal) el.sortModal.hidden = true;
});

updateThemeColorMeta();

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (currentTheme() === "default") updateThemeColorMeta();
});

async function loadMovies() {
  const res = await fetch("/api/movies");
  state.movies = await res.json();
  render();
}

async function loadTags() {
  const res = await fetch("/api/tags");
  state.allTags = await res.json();
  renderTagFilters();
}

function renderTagFilters() {
  const pickChips = ["jc", "cc"]
    .map(
      (pick) => `
      <button class="chip pick-chip ${state.activePicks.has(pick) ? "active" : ""}" data-pick="${pick}">
        ${pick.toUpperCase()}
      </button>`
    )
    .join("");

  const tagChips = state.allTags
    .map(
      (tag) => `
      <button class="chip ${state.activeTags.has(tag) ? "active" : ""}" data-tag="${escapeHtml(tag)}">
        ${escapeHtml(tag)}
      </button>`
    )
    .join("");

  el.tagFilters.innerHTML = pickChips + tagChips;

  el.tagFilters.querySelectorAll(".chip[data-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pick = btn.dataset.pick;
      if (state.activePicks.has(pick)) {
        state.activePicks.delete(pick);
      } else {
        state.activePicks.add(pick);
      }
      render();
    });
  });

  el.tagFilters.querySelectorAll(".chip[data-tag]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tag = btn.dataset.tag;
      if (state.activeTags.has(tag)) {
        state.activeTags.delete(tag);
      } else {
        state.activeTags.add(tag);
      }
      render();
    });
  });
}

function matchesFilters(movie) {
  const tagOk =
    state.activeTags.size === 0 || movie.tags.some((t) => state.activeTags.has(t));

  const pickOk =
    state.activePicks.size === 0 ||
    Array.from(state.activePicks).some((p) => movie[`${p}_choice`]);

  return tagOk && pickOk;
}

function sortMovies(movies) {
  const sorted = [...movies];

  switch (state.sortBy) {
    case "added_asc":
      sorted.sort((a, b) => a.added_at.localeCompare(b.added_at));
      break;
    case "release_desc":
      sorted.sort((a, b) => (b.release_year ?? 0) - (a.release_year ?? 0));
      break;
    case "release_asc":
      sorted.sort((a, b) => (a.release_year ?? 0) - (b.release_year ?? 0));
      break;
    case "title_asc":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "title_desc":
      sorted.sort((a, b) => b.title.localeCompare(a.title));
      break;
    default:
      sorted.sort((a, b) => b.added_at.localeCompare(a.added_at));
  }

  return sorted;
}

function render() {
  renderTagFilters();
  el.sortBtn.classList.toggle("active", state.sortBy !== DEFAULT_SORT);

  const wantWatched = state.activeTab === "watched";
  const filtered = sortMovies(
    state.movies.filter((m) => m.watched === wantWatched && matchesFilters(m))
  );

  el.grid.innerHTML = filtered.map(movieCardHtml).join("");
  const cardNodes = el.grid.querySelectorAll(".movie-card");
  filtered.forEach((movie, i) => bindCardEvents(cardNodes[i], movie));

  el.emptyState.hidden = filtered.length !== 0;
  el.emptyState.textContent = wantWatched
    ? "Nothing watched yet."
    : "No movies yet — add one to get started.";
}

function movieCardHtml(movie) {
  const poster = movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : "";

  const badges = [
    movie.jc_choice ? `<span class="badge">JC</span>` : "",
    movie.cc_choice ? `<span class="badge">CC</span>` : "",
  ].join("");

  return `
    <div class="movie-card ${movie.watched ? "watched" : ""}" data-id="${movie.id}" data-watched="${movie.watched}">
      <div class="poster-wrap">
        ${poster ? `<img class="movie-poster" src="${poster}" alt="${escapeHtml(movie.title)} poster" />` : `<div class="movie-poster"></div>`}
        <div class="watch-flash"><div class="stamp">✓</div></div>
        ${state.newMovieIds.has(movie.id) ? `<div class="new-badge">NEW</div>` : ""}
      </div>
      <div class="movie-card-body">
        <div class="movie-title">${escapeHtml(movie.title)}</div>
        <div class="movie-year">${movie.release_year ?? ""}</div>
        ${badges ? `<div class="choice-badges">${badges}</div>` : ""}
        <div class="movie-tags">
          ${movie.tags.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join("")}
        </div>
        <div class="movie-card-actions">
          <button class="icon-btn watch-btn ${movie.watched ? "watched" : ""}" aria-label="Toggle watched">
            ${movie.watched ? "✓" : "○"}
          </button>
          <button class="icon-btn delete-btn" aria-label="Delete">🗑</button>
        </div>
      </div>
    </div>
  `;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bindCardEvents(card, movie) {
  const id = card.dataset.id;
  const currentlyWatched = card.dataset.watched === "true";

  card.addEventListener("click", (e) => {
    if (e.target.closest(".icon-btn")) return;
    openDetail(movie);
  });

  card.querySelector(".watch-btn").addEventListener("click", async (e) => {
    e.stopPropagation();
    const goingWatched = !currentlyWatched;
    e.currentTarget.disabled = true;

    if (goingWatched) {
      card.querySelector(".watch-flash").classList.add("show");
      await wait(650);
    }

    card.classList.add("card-exit");
    await wait(350);

    await fetch(`/api/movies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watched: goingWatched }),
    });
    await loadMovies();
  });

  card.querySelector(".delete-btn").addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm("Remove this movie from the list?")) return;
    await fetch(`/api/movies/${id}`, { method: "DELETE" });
    await loadMovies();
    await loadTags();
  });
}

el.tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.activeTab = btn.dataset.tab;
    el.tabBtns.forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});

// --- Shared tag-picker helpers (used by both add flow and detail view) ---

function renderTagChips(container, selectedSet) {
  container.innerHTML = state.allTags
    .map(
      (tag) => `
      <button type="button" class="chip ${selectedSet.has(tag) ? "active" : ""}" data-tag="${escapeHtml(tag)}">
        ${escapeHtml(tag)}
      </button>`
    )
    .join("");

  container.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tag = btn.dataset.tag;
      if (selectedSet.has(tag)) {
        selectedSet.delete(tag);
      } else {
        selectedSet.add(tag);
      }
      renderTagChips(container, selectedSet);
    });
  });
}

function addNewTagTo(inputEl, container, selectedSet) {
  const name = inputEl.value.trim();
  if (!name) return;

  if (!state.allTags.includes(name)) {
    state.allTags.push(name);
    state.allTags.sort((a, b) => a.localeCompare(b));
  }
  selectedSet.add(name);
  inputEl.value = "";
  renderTagChips(container, selectedSet);
}

// --- Add movie modal: step 1 (search) / step 2 (tags + choice) ---

function showStep(step) {
  el.stepSearch.hidden = step !== "search";
  el.stepDetails.hidden = step !== "details";
  el.backBtn.hidden = step !== "details";
  el.sheetTitle.textContent = step === "details" ? "Add Details" : "Add a Movie";
}

function openModal() {
  el.modal.hidden = false;
  el.searchInput.value = "";
  el.searchResults.innerHTML = "";
  state.selectedSearchResult = null;
  state.selectedTags = new Set();
  state.choice = { jc: false, cc: false };
  el.choiceBtns.forEach((b) => b.classList.remove("active"));
  el.newTagInput.value = "";
  showStep("search");
  el.searchInput.focus();
}

function closeModal() {
  el.modal.hidden = true;
}

el.addMovieBtn.addEventListener("click", openModal);
el.closeModalBtn.addEventListener("click", closeModal);
el.backBtn.addEventListener("click", () => showStep("search"));
el.modal.addEventListener("click", (e) => {
  if (e.target === el.modal) closeModal();
});

let searchDebounce;
el.searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  const query = el.searchInput.value.trim();
  if (!query) {
    el.searchResults.innerHTML = "";
    return;
  }
  searchDebounce = setTimeout(() => runSearch(query), 350);
});

async function runSearch(query) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  const alreadyAdded = new Set(state.movies.map((m) => m.tmdb_id));
  const results = (data.results || []).filter((r) => !alreadyAdded.has(r.tmdb_id));

  el.searchResults.innerHTML = results
    .map(
      (r, i) => `
      <div class="search-result" data-index="${i}">
        ${r.poster_path ? `<img src="${POSTER_BASE}${r.poster_path}" alt="" />` : `<img alt="" />`}
        <div class="search-result-info">
          <div>${escapeHtml(r.title)}</div>
          <div class="year">${r.release_year ?? ""}</div>
        </div>
      </div>`
    )
    .join("");

  el.searchResults.querySelectorAll(".search-result").forEach((node) => {
    node.addEventListener("click", () => {
      const result = results[Number(node.dataset.index)];
      selectSearchResult(result);
    });
  });
}

function selectSearchResult(result) {
  state.selectedSearchResult = result;
  state.selectedTags = new Set();

  el.selectedPoster.src = result.poster_path ? `${POSTER_BASE}${result.poster_path}` : "";
  el.selectedTitle.textContent = result.title;
  el.selectedYear.textContent = result.release_year ?? "";

  renderTagChips(el.tagPicker, state.selectedTags);
  showStep("details");
}

el.addTagBtn.addEventListener("click", () => {
  addNewTagTo(el.newTagInput, el.tagPicker, state.selectedTags);
});

el.choiceBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const choice = btn.dataset.choice;
    state.choice[choice] = !state.choice[choice];
    btn.classList.toggle("active", state.choice[choice]);
  });
});

el.confirmAddBtn.addEventListener("click", async () => {
  if (!state.selectedSearchResult) return;

  const res = await fetch("/api/movies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...state.selectedSearchResult,
      tags: Array.from(state.selectedTags),
      jc_choice: state.choice.jc,
      cc_choice: state.choice.cc,
    }),
  });
  const { id } = await res.json();
  state.locallyAddedIds.add(id);

  closeModal();
  await loadMovies();
  await loadTags();
});

// --- Movie detail view ---

function openDetail(movie) {
  state.detail = {
    id: movie.id,
    selectedTags: new Set(movie.tags),
    choice: { jc: movie.jc_choice, cc: movie.cc_choice },
  };

  el.detailPoster.src = movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : "";
  el.detailTitle.textContent = movie.title;
  el.detailYear.textContent = movie.release_year ?? "";
  el.detailMeta.textContent = "";
  el.detailOverview.textContent = "";

  el.detailDirector.textContent = "Loading…";
  el.detailDirector.classList.add("loading");
  el.detailCast.textContent = "Loading…";
  el.detailCast.classList.add("loading");
  el.detailProviders.innerHTML = `<p class="detail-value loading">Loading…</p>`;
  el.detailProvidersLink.hidden = true;

  renderTagChips(el.detailTagPicker, state.detail.selectedTags);

  el.detailChoiceBtns.forEach((btn) => {
    btn.classList.toggle("active", state.detail.choice[btn.dataset.choice]);
  });

  el.detailModal.hidden = false;

  if (movie.tmdb_id) {
    fetchTmdbDetails(movie.tmdb_id);
  } else {
    el.detailDirector.textContent = "Unknown";
    el.detailDirector.classList.remove("loading");
    el.detailCast.textContent = "Unknown";
    el.detailCast.classList.remove("loading");
    el.detailProviders.innerHTML = `<p class="detail-value">Unknown</p>`;
  }
}

function providerBadgeHtml(p) {
  const logo = p.logo_path ? `${PROVIDER_LOGO_BASE}${p.logo_path}` : "";
  return `
    <div class="provider-badge">
      ${logo ? `<img src="${logo}" alt="" />` : `<div class="provider-badge-noimg"></div>`}
      <span>${escapeHtml(p.name)}</span>
    </div>`;
}

function renderProviders(watchProviders) {
  if (!watchProviders) {
    el.detailProviders.innerHTML = `<p class="detail-value">Unavailable</p>`;
    el.detailProvidersLink.hidden = true;
    return;
  }

  const sections = [
    { label: "Stream", list: watchProviders.streaming },
    { label: "Rent", list: watchProviders.rent },
    { label: "Buy", list: watchProviders.buy },
  ].filter((s) => s.list && s.list.length);

  if (sections.length === 0) {
    el.detailProviders.innerHTML = `<p class="detail-value">Not currently available to stream.</p>`;
    el.detailProvidersLink.hidden = true;
    return;
  }

  el.detailProviders.innerHTML = sections
    .map(
      (s) =>
        `<div class="provider-kind-label">${s.label}</div>` +
        s.list.map(providerBadgeHtml).join("")
    )
    .join("");

  if (watchProviders.link) {
    el.detailProvidersLink.href = watchProviders.link;
    el.detailProvidersLink.hidden = false;
  } else {
    el.detailProvidersLink.hidden = true;
  }
}

async function fetchTmdbDetails(tmdbId) {
  try {
    const res = await fetch(`/api/tmdb/${tmdbId}`);
    const data = await res.json();

    el.detailOverview.textContent = data.overview || "";

    const metaParts = [];
    if (data.runtime) metaParts.push(`${data.runtime} min`);
    if (data.genres && data.genres.length) metaParts.push(data.genres.join(", "));
    el.detailMeta.textContent = metaParts.join(" · ");

    el.detailDirector.textContent = data.director || "Unknown";
    el.detailDirector.classList.remove("loading");

    el.detailCast.textContent = data.cast && data.cast.length ? data.cast.join(", ") : "Unknown";
    el.detailCast.classList.remove("loading");

    renderProviders(data.watchProviders);
  } catch {
    el.detailDirector.textContent = "Unavailable";
    el.detailDirector.classList.remove("loading");
    el.detailCast.textContent = "Unavailable";
    el.detailCast.classList.remove("loading");
    el.detailProviders.innerHTML = `<p class="detail-value">Unavailable</p>`;
    el.detailProvidersLink.hidden = true;
  }
}

function closeDetail() {
  el.detailModal.hidden = true;
  state.detail = null;
}

el.detailCloseBtn.addEventListener("click", closeDetail);
el.detailModal.addEventListener("click", (e) => {
  if (e.target === el.detailModal) closeDetail();
});

el.detailAddTagBtn.addEventListener("click", () => {
  if (!state.detail) return;
  addNewTagTo(el.detailNewTagInput, el.detailTagPicker, state.detail.selectedTags);
});

el.detailChoiceBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!state.detail) return;
    const choice = btn.dataset.choice;
    state.detail.choice[choice] = !state.detail.choice[choice];
    btn.classList.toggle("active", state.detail.choice[choice]);
  });
});

el.detailSaveBtn.addEventListener("click", async () => {
  if (!state.detail) return;

  await fetch(`/api/movies/${state.detail.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tags: Array.from(state.detail.selectedTags),
      jc_choice: state.detail.choice.jc,
      cc_choice: state.detail.choice.cc,
    }),
  });

  closeDetail();
  await loadMovies();
  await loadTags();
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

// --- Scroll to top ---

let scrollTicking = false;
window.addEventListener(
  "scroll",
  () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      el.scrollTopBtn.classList.toggle("visible", window.scrollY > 400);
      scrollTicking = false;
    });
  },
  { passive: true }
);

el.scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// --- Pull to refresh (iOS home-screen apps get no native gesture for this) ---

const PULL_THRESHOLD = 70;
const PULL_MAX = 110;

function safeAreaTop() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--safe-top");
  return parseFloat(value) || 0;
}

let pullStartY = null;
let pulling = false;
let refreshing = false;

function anyModalOpen() {
  return (
    !el.modal.hidden ||
    !el.detailModal.hidden ||
    !el.menuOverlay.hidden ||
    !el.sortModal.hidden
  );
}

document.addEventListener(
  "touchstart",
  (e) => {
    if (refreshing || anyModalOpen() || window.scrollY > 0) return;
    pullStartY = e.touches[0].clientY;
    pulling = true;
    el.pullRefresh.style.transition = "none";
  },
  { passive: true }
);

document.addEventListener(
  "touchmove",
  (e) => {
    if (!pulling || pullStartY === null) return;
    const deltaY = e.touches[0].clientY - pullStartY;

    if (deltaY <= 0) {
      el.pullRefresh.style.height = "0px";
      el.pullRefresh.classList.remove("pulling", "ready");
      return;
    }

    e.preventDefault();
    const pull = Math.min(deltaY * 0.5, PULL_MAX);
    el.pullRefresh.style.height = `${safeAreaTop() + pull}px`;
    el.pullRefresh.classList.add("pulling");
    el.pullRefresh.classList.toggle("ready", pull >= PULL_THRESHOLD);
  },
  { passive: false }
);

document.addEventListener("touchend", async () => {
  if (!pulling) return;
  pulling = false;
  pullStartY = null;

  const pulledEnough = el.pullRefresh.classList.contains("ready");
  el.pullRefresh.style.transition = "height 0.2s ease";

  if (pulledEnough && !refreshing) {
    refreshing = true;
    el.pullRefresh.style.height = `${safeAreaTop() + PULL_THRESHOLD}px`;
    el.pullRefresh.classList.remove("ready");
    el.pullRefresh.classList.add("refreshing");

    state.newMovieIds.clear();
    await Promise.all([loadMovies(), loadTags()]);
    checkForNewMovies();
    await wait(400);

    el.pullRefresh.classList.remove("refreshing", "pulling");
    el.pullRefresh.style.height = "0px";
    refreshing = false;
  } else {
    el.pullRefresh.classList.remove("pulling", "ready");
    el.pullRefresh.style.height = "0px";
  }
});

// --- New-since-last-visit detection ---

function parseSqliteTimestamp(ts) {
  return new Date(ts.replace(" ", "T") + "Z");
}

function showNewToast(count) {
  el.newToastText.textContent = `${count} new movie${count === 1 ? "" : "s"} added`;
  el.newToast.classList.add("visible");
  setTimeout(() => el.newToast.classList.remove("visible"), 3500);
}

function checkForNewMovies() {
  const lastVisitRaw = getCookie("lastVisit");

  if (lastVisitRaw) {
    const lastVisit = new Date(lastVisitRaw);

    if (!isNaN(lastVisit.getTime())) {
      const newOnes = state.movies.filter(
        (m) =>
          parseSqliteTimestamp(m.added_at).getTime() > lastVisit.getTime() &&
          !state.locallyAddedIds.has(m.id)
      );

      if (newOnes.length > 0) {
        newOnes.forEach((m) => state.newMovieIds.add(m.id));
        showNewToast(newOnes.length);
        render();
      }
    }
  }

  setCookie("lastVisit", new Date().toISOString(), 365);
}

loadMovies().then(checkForNewMovies);
loadTags();
