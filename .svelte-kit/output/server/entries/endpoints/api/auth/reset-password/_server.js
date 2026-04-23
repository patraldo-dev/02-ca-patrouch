import { json } from "@sveltejs/kit";
import { h as hashPassword } from "../../../../../chunks/auth-helpers.js";
async function POST({ request, platform }) {
  const db = platform?.env?.DB_book;
  if (!db) {
    return json({ error: "DB unavailable" }, { status: 500 });
  }
  const { token, password } = await request.json();
  if (!token || !password) {
    return json({ error: "Token and password required" }, { status: 400 });
  }
  const now = Math.floor(Date.now() / 1e3);
  const user = await db.prepare("SELECT id FROM users WHERE email_verification_token = ? AND email_verified_at > ?").bind(token, now).first();
  if (!user) {
    return json({ error: "Invalid or expired token" }, { status: 400 });
  }
  const passwordHash = await hashPassword(password);
  await db.prepare("UPDATE users SET hashed_password = ?, email_verification_token = NULL, email_verified_at = NULL WHERE id = ?").bind(passwordHash, user.id).run();
  return json({ success: true });
}
export {
  POST
};
