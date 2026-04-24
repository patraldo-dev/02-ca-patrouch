import { json } from "@sveltejs/kit";
async function GET({ locals }) {
  const user = locals?.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  return json({
    profile: {
      username: user.username,
      email: user.email,
      role: user.role,
      bio: user.bio || null,
      avatar_url: user.avatar_url || null,
      display_name: user.display_name || null,
      created_at: user.created_at
    }
  });
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
  if (display_name !== void 0) {
    updates.push("name = ?");
    values.push(display_name);
  }
  if (avatar_url !== void 0) {
    updates.push("image = ?");
    values.push(avatar_url);
  }
  if (updates.length > 0) {
    values.push(user.id);
    await db.prepare(`UPDATE "user" SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
  }
  if (bio !== void 0) {
    const activeProfile = await db.prepare(
      "SELECT id FROM profiles WHERE user_id = ? AND is_active = 1"
    ).bind(user.id).first();
    if (activeProfile) {
      await db.prepare("UPDATE profiles SET bio = ? WHERE id = ?").bind(bio, activeProfile.id).run();
    }
  }
  return json({ ok: true });
}
export {
  GET,
  PUT
};
