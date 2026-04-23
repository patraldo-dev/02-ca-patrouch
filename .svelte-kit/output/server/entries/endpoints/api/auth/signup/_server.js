import { json } from "@sveltejs/kit";
import { h as hashPassword } from "../../../../../chunks/auth-helpers.js";
import { g as getConfirmationEmailContent, s as sendMailgunEmail } from "../../../../../chunks/email.js";
async function POST({ request, platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: "DB unavailable" }, { status: 500 });
  const { username, email, password } = await request.json();
  if (!username || !email || !password) {
    return json({ error: "All fields required" }, { status: 400 });
  }
  if (/albot/i.test(username)) {
    return json({ error: "This name is reserved" }, { status: 400 });
  }
  const existing = await db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").bind(username, email).first();
  if (existing) {
    return json({ error: "Username or email already taken" }, { status: 409 });
  }
  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  const newUser = await db.prepare("INSERT INTO users (id, username, email, hashed_password, role) VALUES (?, ?, ?, ?, ?) RETURNING id, username, email").bind(userId, username, email, passwordHash, "user").first();
  if (!newUser) {
    return json({ error: "Signup failed" }, { status: 500 });
  }
  const emailVerificationToken = crypto.randomUUID();
  await db.prepare("UPDATE users SET email_verification_token = ? WHERE id = ?").bind(emailVerificationToken, newUser.id).run();
  try {
    const confirmUrl = `https://patrouch.ca/confirm?token=${encodeURIComponent(emailVerificationToken)}`;
    const emailContent = getConfirmationEmailContent("account", confirmUrl);
    await sendMailgunEmail({
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    }, {
      MAILGUN_API_KEY: platform.env.MAILGUN_API_KEY,
      MAILGUN_DOMAIN: platform.env.MAILGUN_DOMAIN
    });
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }
  return json({ success: true });
}
export {
  POST
};
