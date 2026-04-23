import { json } from "@sveltejs/kit";
async function POST({ locals }) {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  await locals.db.prepare(
    "UPDATE users SET onboarding_completed = 1 WHERE id = ?"
  ).bind(locals.user.id).run();
  return json({ success: true });
}
async function GET({ locals }) {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  const result = await locals.db.prepare(
    "SELECT onboarding_completed FROM users WHERE id = ?"
  ).bind(locals.user.id).first();
  return json({ onboarding_completed: result?.onboarding_completed === 1 });
}
export {
  GET,
  POST
};
