import { syncMovieTags } from "../../_lib/tags.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
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

export async function onRequestPost({ request, env }) {
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
