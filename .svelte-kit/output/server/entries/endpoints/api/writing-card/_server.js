import { json } from "@sveltejs/kit";
async function GET({ url, platform }) {
  try {
    const db = platform?.env?.DB_book;
    if (!db) {
      return json({ error: "Database unavailable" }, { status: 503 });
    }
    const writingId = url.searchParams.get("id");
    if (!writingId) {
      return json({ error: "Writing ID required" }, { status: 400 });
    }
    const writing = await db.prepare(`
            SELECT w.id, w.title, w.content, w.word_count, w.created_at, w.ai_assisted,
                   u.username, u.id as user_id
            FROM writings w
            JOIN users u ON w.user_id = u.id
            WHERE w.id = ? AND w.visibility = 'public'
        `).bind(writingId).first();
    if (!writing) {
      return json({ error: "Writing not found or not public" }, { status: 404 });
    }
    const excerpt = writing.content.length > 280 ? writing.content.slice(0, 280).trim() + "…" : writing.content;
    return json({
      id: writing.id,
      title: writing.title,
      excerpt,
      wordCount: writing.word_count,
      author: writing.username,
      createdAt: writing.created_at,
      aiAssisted: !!writing.ai_assisted
    });
  } catch (error) {
    console.error("Writing card API error:", error);
    return json({ error: "Failed to fetch writing data" }, { status: 500 });
  }
}
export {
  GET
};
