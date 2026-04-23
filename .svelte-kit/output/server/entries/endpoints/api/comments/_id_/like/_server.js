import { json } from "@sveltejs/kit";
async function POST({ locals, params }) {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  const db = locals.db;
  const { id } = params;
  const comment = await db.prepare("SELECT id FROM comments WHERE id = ?").bind(id).first();
  if (!comment) return json({ error: "Not found" }, { status: 404 });
  const existing = await db.prepare("SELECT 1 FROM comment_likes WHERE user_id = ? AND comment_id = ?").bind(locals.user.id, id).first();
  if (existing) {
    await db.prepare("DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?").bind(locals.user.id, id).run();
    await db.prepare("UPDATE comments SET likes_count = MAX(0, likes_count - 1) WHERE id = ?").bind(id).run();
    return json({ liked: false });
  }
  await db.prepare("INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)").bind(locals.user.id, id).run();
  await db.prepare("UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?").bind(id).run();
  return json({ liked: true });
}
export {
  POST
};
