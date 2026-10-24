import { syncMovieTags } from "../../_lib/tags.js";

export async function onRequestPatch({ request, env, params }) {
  const id = params.id;
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

export async function onRequestDelete({ env, params }) {
  const id = params.id;
  await env.DB.prepare(`DELETE FROM movie_tags WHERE movie_id = ?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM movies WHERE id = ?`).bind(id).run();
  return Response.json({ ok: true });
}
