import { syncMovieTags } from "./tags.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const { method } = request;

    try {
      if (pathname === "/api/search" && method === "GET") {
        return searchMovies(url, env);
      }

      if (pathname === "/api/tags" && method === "GET") {
        return listTags(env);
      }

      if (pathname === "/api/movies" && method === "GET") {
        return listMovies(url, env);
      }

      if (pathname === "/api/movies" && method === "POST") {
        return createMovie(request, env);
      }

      const movieMatch = pathname.match(/^\/api\/movies\/(\d+)$/);
      if (movieMatch) {
        const id = movieMatch[1];
        if (method === "PATCH") return updateMovie(request, env, id);
        if (method === "DELETE") return deleteMovie(env, id);
      }

      if (pathname.startsWith("/api/")) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }

    return env.ASSETS.fetch(request);
  },
};

async function searchMovies(url, env) {
  const q = url.searchParams.get("q");
  if (!q || !q.trim()) {
    return Response.json({ results: [] });
  }

  const tmdbUrl = new URL("https://api.themoviedb.org/3/search/movie");
  tmdbUrl.searchParams.set("query", q);
  tmdbUrl.searchParams.set("include_adult", "false");
  tmdbUrl.searchParams.set("api_key", env.TMDB_API_KEY);

  const res = await fetch(tmdbUrl);
  if (!res.ok) {
    return Response.json({ error: "TMDB request failed" }, { status: 502 });
  }

  const data = await res.json();
  const results = (data.results || []).map((m) => ({
    tmdb_id: m.id,
    title: m.title,
    poster_path: m.poster_path,
    release_year: m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : null,
  }));

  return Response.json({ results });
}

async function listTags(env) {
  const { results } = await env.DB.prepare(`SELECT name FROM tags ORDER BY name`).all();
  return Response.json(results.map((r) => r.name));
}

async function listMovies(url, env) {
  const tag = url.searchParams.get("tag");
  const watched = url.searchParams.get("watched");

  let query = `
    SELECT m.*, GROUP_CONCAT(t.name) AS tags
    FROM movies m
    LEFT JOIN movie_tags mt ON mt.movie_id = m.id
    LEFT JOIN tags t ON t.id = mt.tag_id
  `;
  const conditions = [];
  const params = [];

  if (watched === "true" || watched === "false") {
    conditions.push("m.watched = ?");
    params.push(watched === "true" ? 1 : 0);
  }

  if (tag) {
    conditions.push(`m.id IN (
      SELECT mt2.movie_id FROM movie_tags mt2
      JOIN tags t2 ON t2.id = mt2.tag_id
      WHERE t2.name = ?
    )`);
    params.push(tag);
  }

  if (conditions.length) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " GROUP BY m.id ORDER BY m.added_at DESC";

  const { results } = await env.DB.prepare(query).bind(...params).all();

  const movies = results.map((r) => ({
    ...r,
    watched: !!r.watched,
    tags: r.tags ? r.tags.split(",") : [],
  }));

  return Response.json(movies);
}

async function createMovie(request, env) {
  const body = await request.json();
  const { tmdb_id, title, poster_path, release_year, tags = [] } = body;

  if (!title) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  const insert = await env.DB.prepare(
    `INSERT INTO movies (tmdb_id, title, poster_path, release_year) VALUES (?, ?, ?, ?)`
  )
    .bind(tmdb_id ?? null, title, poster_path ?? null, release_year ?? null)
    .run();

  const movieId = insert.meta.last_row_id;
  await syncMovieTags(env.DB, movieId, tags);

  return Response.json({ id: movieId }, { status: 201 });
}

async function updateMovie(request, env, id) {
  const body = await request.json();

  if (typeof body.watched === "boolean") {
    await env.DB.prepare(`UPDATE movies SET watched = ?, watched_at = ? WHERE id = ?`)
      .bind(body.watched ? 1 : 0, body.watched ? new Date().toISOString() : null, id)
      .run();
  }

  if (Array.isArray(body.tags)) {
    await syncMovieTags(env.DB, id, body.tags);
  }

  return Response.json({ ok: true });
}

async function deleteMovie(env, id) {
  await env.DB.prepare(`DELETE FROM movie_tags WHERE movie_id = ?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM movies WHERE id = ?`).bind(id).run();
  return Response.json({ ok: true });
}
