import { json } from "@sveltejs/kit";
async function GET({ url, platform }) {
  const query = url.searchParams.get("q")?.trim();
  const locale = url.searchParams.get("locale") || null;
  const author = url.searchParams.get("author") || null;
  if (!query || query.length < 2) {
    return json({ results: [], message: "Query too short" });
  }
  const ai = platform?.env?.AI;
  const vectorize = platform?.env?.VECTORIZE;
  const db = platform?.env?.DB_book;
  if (!ai || !vectorize || !db) {
    return json({ error: "Missing bindings" }, { status: 503 });
  }
  try {
    const embedding = await ai.run("@cf/baai/bge-m3", {
      text: [query]
    });
    const vector = embedding?.data?.[0];
    if (!vector) {
      return json({ error: "Failed to generate embedding" }, { status: 500 });
    }
    const results = await vectorize.query(vector, {
      topK: 20,
      returnMetadata: true
    });
    if (!results?.matches?.length) {
      return json({ results: [] });
    }
    const writingIds = results.matches.map((m) => m.id);
    const placeholders = writingIds.map(() => "?").join(",");
    const writings = await db.prepare(`
            SELECT w.id, w.title, w.content, w.word_count, w.category, w.ai_assisted,
                   w.created_at, w.locale, u.username, u.role
            FROM writings w
            JOIN users u ON w.user_id = u.id
            WHERE w.id IN (${placeholders})
              AND w.visibility = 'public' AND w.status = 'published'
        `).bind(...writingIds).all();
    const scoreMap = {};
    for (const m of results.matches) {
      scoreMap[m.id] = m.score;
    }
    let filtered = writings.results || [];
    if (locale && ["en", "es", "fr"].includes(locale)) {
      filtered = filtered.filter((w) => w.locale === locale);
    }
    if (author === "agents") {
      filtered = filtered.filter((w) => w.role === "agent");
    } else if (author === "humans") {
      filtered = filtered.filter((w) => w.role !== "agent");
    }
    filtered.sort((a, b) => (scoreMap[b.id] || 0) - (scoreMap[a.id] || 0));
    const searchResults = filtered.map((w) => ({
      id: w.id,
      title: w.title,
      excerpt: w.content?.slice(0, 200) + (w.content?.length > 200 ? "..." : ""),
      word_count: w.word_count,
      category: w.category,
      ai_assisted: w.ai_assisted,
      created_at: w.created_at,
      locale: w.locale,
      username: w.username,
      role: w.role,
      score: scoreMap[w.id] || 0
    }));
    return json({ results: searchResults, query, total: searchResults.length });
  } catch (error) {
    console.error("Search error:", error);
    return json({ error: error.message }, { status: 500 });
  }
}
export {
  GET
};
