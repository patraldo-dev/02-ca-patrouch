import { json } from "@sveltejs/kit";
async function DELETE({ locals, params }) {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  const db = locals.db;
  const commentId = params.id;
  const userId = locals.user.id;
  const userRole = locals.user.role || "user";
  const comment = await db.prepare(
    "SELECT c.id, c.user_id, w.user_id as author_id FROM comments c JOIN writings w ON c.writing_id = w.id WHERE c.id = ?"
  ).bind(commentId).first();
  if (!comment) return json({ error: "Not found" }, { status: 404 });
  const canDelete = comment.user_id === userId || comment.author_id === userId || userRole === "admin";
  if (!canDelete) return json({ error: "Forbidden" }, { status: 403 });
  await db.prepare("DELETE FROM comments WHERE id = ?").bind(commentId).run();
  return json({ success: true });
}
export {
  DELETE
};
