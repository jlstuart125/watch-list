export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT name FROM tags ORDER BY name`
  ).all();

  return Response.json(results.map((r) => r.name));
}
