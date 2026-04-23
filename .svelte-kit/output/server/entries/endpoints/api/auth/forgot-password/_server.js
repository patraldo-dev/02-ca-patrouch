import { json } from "@sveltejs/kit";
import { s as sendMailgunEmail } from "../../../../../chunks/email.js";
import { g as generateSessionToken } from "../../../../../chunks/utils3.js";
async function POST({ request, platform }) {
  const db = platform?.env?.DB_book;
  if (!db) {
    return json({ error: "DB unavailable" }, { status: 500 });
  }
  const { email } = await request.json();
  if (!email) {
    return json({ error: "Email required" }, { status: 400 });
  }
  const user = await db.prepare("SELECT id, username FROM users WHERE email = ?").bind(email).first();
  if (!user) {
    return json({ success: true });
  }
  const resetToken = generateSessionToken();
  const expiresAt = Math.floor(Date.now() / 1e3) + 3600;
  await db.prepare("UPDATE users SET email_verification_token = ?, email_verified_at = ? WHERE id = ?").bind(resetToken, expiresAt, user.id).run();
  const resetUrl = `https://patrouch.ca/reset-password?token=${encodeURIComponent(resetToken)}`;
  try {
    await sendMailgunEmail({
      to: email,
      subject: "Reset Your Password",
      text: `Click to reset: ${resetUrl}`,
      html: `
                <h2>Reset Your Password</h2>
                <p>Click the button below to reset your password:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>Or copy and paste this link: <br><code>${resetUrl}</code></p>
                <p>This link expires in 1 hour.</p>
            `
    }, {
      MAILGUN_API_KEY: void 0,
      MAILGUN_DOMAIN: void 0
    });
  } catch (err) {
    console.error("Failed to send reset email:", err);
  }
  return json({ success: true });
}
export {
  POST
};
