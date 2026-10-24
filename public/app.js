const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

const state = {
  movies: [],
  allTags: [],
  activeTags: new Set(),
  activeTab: "towatch",
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
  detailTagPicker: document.getElementById("detail-tag-picker"),
  detailNewTagInput: document.getElementById("detail-new-tag-input"),
  detailAddTagBtn: document.getElementById("detail-add-tag-btn"),
  detailSaveBtn: document.getElementById("detail-save-btn"),
};

el.choiceBtns = el.modal.querySelectorAll(".choice-btn");
el.detailChoiceBtns = el.detailModal.querySelectorAll(".choice-btn");

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
  el.tagFilters.innerHTML = state.allTags
    .map(
      (tag) => `
      <button class="chip ${state.activeTags.has(tag) ? "active" : ""}" data-tag="${escapeHtml(tag)}">
        ${escapeHtml(tag)}
      </button>`
    )
    .join("");

  el.tagFilters.querySelectorAll(".chip").forEach((btn) => {
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
  if (state.activeTags.size === 0) return true;
  return movie.tags.some((t) => state.activeTags.has(t));
}

function render() {
  renderTagFilters();

  const wantWatched = state.activeTab === "watched";
  const filtered = state.movies.filter(
    (m) => m.watched === wantWatched && matchesFilters(m)
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
  const results = data.results || [];

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

  await fetch("/api/movies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...state.selectedSearchResult,
      tags: Array.from(state.selectedTags),
      jc_choice: state.choice.jc,
      cc_choice: state.choice.cc,
    }),
  });

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
  } catch {
    el.detailDirector.textContent = "Unavailable";
    el.detailDirector.classList.remove("loading");
    el.detailCast.textContent = "Unavailable";
    el.detailCast.classList.remove("loading");
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

loadMovies();
loadTags();
