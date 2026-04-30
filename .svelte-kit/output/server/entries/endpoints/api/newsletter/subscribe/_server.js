import { json } from "@sveltejs/kit";
import { sendMailgunEmail } from "../../../../../chunks/mailgun.js";
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function POST({ request, platform }) {
  try {
    const { email, type = "daily-prompt", locale = "en" } = await request.json();
    if (!email) {
      return json({ error: "Email is required" }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: "Invalid email format" }, { status: 400 });
    }
    if (!platform?.env?.DB_book) {
      return json({ error: "Database not available" }, { status: 500 });
    }
    const db = platform.env.DB_book;
    const existing = await db.prepare(
      "SELECT id, confirmed FROM subscribers WHERE email = ? AND type = ?"
    ).bind(email, type).first();
    if (existing) {
      if (existing.confirmed) {
        return json({ error: "Already subscribed" }, { status: 400 });
      } else {
        const token2 = generateToken();
        const expiresAt2 = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
        await db.prepare(
          "UPDATE subscribers SET confirmation_token = ?, token_expires_at = ? WHERE id = ?"
        ).bind(token2, expiresAt2, existing.id).run();
        try {
          const origin = request.headers.get("origin") || "https://patrouch.ca";
          const confirmUrl = `${origin}/newsletter/confirm?token=${token2}`;
          const msgs = {
            en: { subject: "Confirm your subscription", body: `Click here to confirm your Daily Spark subscription:
${confirmUrl}` },
            es: { subject: "Confirma tu suscripción", body: `Haz clic aquí para confirmar tu Chispa Dominical:
${confirmUrl}` },
            fr: { subject: "Confirme ton abonnement", body: `Clique ici pour confirmer ton Étincelle du Dimanche:
${confirmUrl}` }
          };
          const m = msgs[locale] || msgs.en;
          await sendMailgunEmail(email, m.subject, `<a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#c9a87c;color:#09090b;text-decoration:none;border-radius:8px;font-weight:600;">${m.subject}</a>`, m.body, platform.env);
        } catch (e) {
          console.error("Confirmation email error:", e);
        }
        return json({
          success: true,
          message: "Confirmation resent. Check your email.",
          requiresConfirmation: true
        });
      }
    }
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
    await db.prepare(
      "INSERT INTO subscribers (email, type, confirmation_token, token_expires_at, confirmed, created_at, locale) VALUES (?, ?, ?, ?, 0, ?, ?)"
    ).bind(email, type, token, expiresAt, (/* @__PURE__ */ new Date()).toISOString(), locale).run();
    try {
      const origin = request.headers.get("origin") || "https://patrouch.ca";
      const confirmUrl = `${origin}/newsletter/confirm?token=${token}`;
      const msgs = {
        en: { subject: "Confirm your subscription", body: `Click here to confirm your Daily Spark subscription:
${confirmUrl}` },
        es: { subject: "Confirma tu suscripción", body: `Haz clic aquí para confirmar tu Chispa Dominical:
${confirmUrl}` },
        fr: { subject: "Confirme ton abonnement", body: `Clique ici pour confirmer ton Étincelle du Dimanche:
${confirmUrl}` }
      };
      const m = msgs[locale] || msgs.en;
      await sendMailgunEmail(email, m.subject, `<a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#c9a87c;color:#09090b;text-decoration:none;border-radius:8px;font-weight:600;">${m.subject}</a>`, m.body, platform.env);
    } catch (e) {
      console.error("Confirmation email error:", e);
    }
    return json({
      success: true,
      message: "Subscription initiated. Check your email to confirm.",
      requiresConfirmation: true
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
export {
  POST
};
