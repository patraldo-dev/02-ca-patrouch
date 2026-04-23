import { json } from "@sveltejs/kit";
async function GET({ locals }) {
  const user = locals?.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const db = locals.db;
  if (!db) return json({ error: "No database" }, { status: 500 });
  const row = await db.prepare(
    "SELECT username, email, role, bio, avatar_url, display_name, created_at FROM users WHERE id = ?"
  ).bind(user.id).first();
  return json({ profile: row });
}
async function PUT({ locals, request }) {
  const user = locals?.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const db = locals.db;
  if (!db) return json({ error: "No database" }, { status: 500 });
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { bio, avatar_url, display_name } = body;
  if (bio !== void 0 && typeof bio === "string" && bio.length > 500) {
    return json({ error: "Bio must be 500 characters or less" }, { status: 400 });
  }
  if (display_name !== void 0 && typeof display_name === "string" && display_name.length > 50) {
    return json({ error: "Display name must be 50 characters or less" }, { status: 400 });
  }
  const updates = [];
  const values = [];
  if (bio !== void 0) {
    updates.push("bio = ?");
    values.push(bio);
  }
  if (avatar_url !== void 0) {
    updates.push("avatar_url = ?");
    values.push(avatar_url);
  }
  if (display_name !== void 0) {
    updates.push("display_name = ?");
    values.push(display_name);
  }
  if (updates.length === 0) return json({ error: "Nothing to update" }, { status: 400 });
  values.push(user.id);
  await db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
  const row = await db.prepare(
    "SELECT username, email, role, bio, avatar_url, display_name, created_at FROM users WHERE id = ?"
  ).bind(user.id).first();
  return json({ profile: row });
}
export {
  GET,
  PUT
};
