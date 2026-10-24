const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

const state = {
  movies: [],
  allTags: [],
  activeTags: new Set(),
  showWatched: false,
  selectedSearchResult: null,
};

const el = {
  grid: document.getElementById("movie-grid"),
  watchedSection: document.getElementById("watched-section"),
  watchedGrid: document.getElementById("watched-grid"),
  emptyState: document.getElementById("empty-state"),
  tagFilters: document.getElementById("tag-filters"),
  showWatchedToggle: document.getElementById("show-watched-toggle"),
  addMovieBtn: document.getElementById("add-movie-btn"),
  closeModalBtn: document.getElementById("close-modal-btn"),
  modal: document.getElementById("add-modal"),
  searchInput: document.getElementById("search-input"),
  searchResults: document.getElementById("search-results"),
  selectedMovie: document.getElementById("selected-movie"),
  selectedPoster: document.getElementById("selected-poster"),
  selectedTitle: document.getElementById("selected-title"),
  selectedYear: document.getElementById("selected-year"),
  tagsInput: document.getElementById("tags-input"),
  existingTagsList: document.getElementById("existing-tags"),
  confirmAddBtn: document.getElementById("confirm-add-btn"),
};

async function loadMovies() {
  const res = await fetch("/api/movies");
  state.movies = await res.json();
  render();
}

async function loadTags() {
  const res = await fetch("/api/tags");
  state.allTags = await res.json();
  renderTagFilters();
  el.existingTagsList.innerHTML = state.allTags
    .map((t) => `<option value="${escapeHtml(t)}"></option>`)
    .join("");
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

  const filtered = state.movies.filter(matchesFilters);
  const unwatched = filtered.filter((m) => !m.watched);
  const watched = filtered.filter((m) => m.watched);

  el.grid.innerHTML = unwatched.map(movieCardHtml).join("");
  el.emptyState.hidden = unwatched.length !== 0;

  el.watchedSection.hidden = !state.showWatched;
  el.watchedGrid.innerHTML = watched.map(movieCardHtml).join("");

  el.grid.querySelectorAll(".movie-card").forEach(bindCardEvents);
  el.watchedGrid.querySelectorAll(".movie-card").forEach(bindCardEvents);
}

function movieCardHtml(movie) {
  const poster = movie.poster_path
    ? `${POSTER_BASE}${movie.poster_path}`
    : "";

  return `
    <div class="movie-card ${movie.watched ? "watched" : ""}" data-id="${movie.id}">
      ${poster ? `<img class="movie-poster" src="${poster}" alt="${escapeHtml(movie.title)} poster" />` : `<div class="movie-poster"></div>`}
      <div class="movie-card-body">
        <div class="movie-title">${escapeHtml(movie.title)}</div>
        <div class="movie-year">${movie.release_year ?? ""}</div>
        <div class="movie-tags">
          ${movie.tags.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join("")}
        </div>
        <div class="movie-card-actions">
          <label class="watch-toggle">
            <input type="checkbox" class="watched-checkbox" ${movie.watched ? "checked" : ""} />
            Watched
          </label>
          <button class="delete-btn">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function bindCardEvents(card) {
  const id = card.dataset.id;

  card.querySelector(".watched-checkbox").addEventListener("change", async (e) => {
    await fetch(`/api/movies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watched: e.target.checked }),
    });
    await loadMovies();
  });

  card.querySelector(".delete-btn").addEventListener("click", async () => {
    if (!confirm("Remove this movie from the list?")) return;
    await fetch(`/api/movies/${id}`, { method: "DELETE" });
    await loadMovies();
    await loadTags();
  });
}

el.showWatchedToggle.addEventListener("change", (e) => {
  state.showWatched = e.target.checked;
  render();
});

// --- Add movie modal ---

function openModal() {
  el.modal.hidden = false;
  el.searchInput.value = "";
  el.searchResults.innerHTML = "";
  el.selectedMovie.hidden = true;
  el.tagsInput.value = "";
  state.selectedSearchResult = null;
  el.searchInput.focus();
}

function closeModal() {
  el.modal.hidden = true;
}

el.addMovieBtn.addEventListener("click", openModal);
el.closeModalBtn.addEventListener("click", closeModal);
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
  el.selectedMovie.hidden = false;
  el.selectedPoster.src = result.poster_path ? `${POSTER_BASE}${result.poster_path}` : "";
  el.selectedTitle.textContent = result.title;
  el.selectedYear.textContent = result.release_year ?? "";
}

el.confirmAddBtn.addEventListener("click", async () => {
  if (!state.selectedSearchResult) return;

  const tags = el.tagsInput.value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  await fetch("/api/movies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...state.selectedSearchResult, tags }),
  });

  closeModal();
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
