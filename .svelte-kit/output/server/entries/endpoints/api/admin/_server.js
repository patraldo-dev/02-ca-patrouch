import "marked";
async function POST({ request, locals }) {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  try {
    const { title, slug, content, published } = await request.json();
    const db = locals.db;
    if (!title || !slug || !content) {
      return new Response(JSON.stringify({ error: "Title, slug, and content required" }), { status: 400 });
    }
    const existing = await db.prepare(`
            SELECT id FROM blog_posts WHERE slug = ?
        `).bind(slug).first();
    if (existing) {
      return new Response(JSON.stringify({ error: "Slug already exists" }), { status: 400 });
    }
    const postId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1e3);
    await db.prepare(`
            INSERT INTO blog_posts (id, title, slug, content, published_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
      postId,
      title,
      slug,
      content,
      published ? now : null,
      now,
      now
    ).run();
    return new Response(JSON.stringify({ success: true, postId }), { status: 200 });
  } catch (error) {
    console.error("Save blog post error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
export {
  POST
};
