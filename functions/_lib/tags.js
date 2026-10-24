export async function syncMovieTags(db, movieId, tagNames) {
  await db.prepare(`DELETE FROM movie_tags WHERE movie_id = ?`).bind(movieId).run();

  for (const raw of tagNames) {
    const name = raw.trim();
    if (!name) continue;

    await db
      .prepare(`INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING`)
      .bind(name)
      .run();

    const tag = await db.prepare(`SELECT id FROM tags WHERE name = ?`).bind(name).first();

    await db
      .prepare(
        `INSERT INTO movie_tags (movie_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING`
      )
      .bind(movieId, tag.id)
      .run();
  }
}
