import { json } from "@sveltejs/kit";
async function PUT({ locals, params }) {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  const db = locals.db;
  const writingId = params.id;
  const userRole = locals.user.role || "user";
  const writing = await db.prepare(
    "SELECT id, user_id, allow_comments FROM writings WHERE id = ?"
  ).bind(writingId).first();
  if (!writing) return json({ error: "Not found" }, { status: 404 });
  const canToggle = writing.user_id === locals.user.id || userRole === "admin";
  if (!canToggle) return json({ error: "Forbidden" }, { status: 403 });
  const newValue = writing.allow_comments ? 0 : 1;
  await db.prepare(
    "UPDATE writings SET allow_comments = ? WHERE id = ?"
  ).bind(newValue, writingId).run();
  return json({ allow_comments: newValue });
}
export {
  PUT
};
