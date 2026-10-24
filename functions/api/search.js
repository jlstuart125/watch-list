export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
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
