import { json } from "@sveltejs/kit";
async function POST({ params, locals }) {
  const user = locals.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const db = locals.db;
  if (!db) return json({ error: "No database" }, { status: 503 });
  const { id } = params;
  const profile = await db.prepare(`SELECT * FROM profiles WHERE id = ? AND user_id = ?`).bind(id, user.id).first();
  if (!profile) return json({ error: "Profile not found" }, { status: 404 });
  await db.prepare(`UPDATE profiles SET is_active = 0 WHERE user_id = ?`).bind(user.id).run();
  await db.prepare(`UPDATE profiles SET is_active = 1 WHERE id = ?`).bind(id).run();
  return json({ ok: true, activeProfile: { id: profile.id, display_name: profile.display_name, locale: profile.locale } });
}
export {
  POST
};
