import { json } from "@sveltejs/kit";
async function sendMailgunEmail({ to, subject, text, html }, env) {
  const apiKey = env.MAILGUN_API_KEY;
  const domain = env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) {
    throw new Error("Mailgun API key or domain not configured");
  }
  const formData = new FormData();
  formData.append("from", `noreply@${domain}`);
  formData.append("to", to);
  formData.append("subject", subject);
  if (text) formData.append("text", text);
  if (html) formData.append("html", html);
  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`api:${apiKey}`)}`
    },
    body: formData
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mailgun error: ${response.status} ${errorText}`);
  }
  return true;
}
function getConfirmationEmailContent(type, confirmationUrl) {
  return {
    subject: `Confirm your ${type} subscription`,
    text: `Click the link to confirm: ${confirmationUrl}`,
    html: `
            <h2>Confirm your ${type} subscription</h2>
            <p>Click the button below to confirm:</p>
            <a href="${confirmationUrl}" style="display: inline-block; padding: 10px 20px; background: var(--primary-color); color: white; text-decoration: none; border-radius: 5px;">Confirm Subscription</a>
            <p>Or copy and paste this link: <br><code>${confirmationUrl}</code></p>
        `
  };
}
async function POST({ request, platform, url }) {
  try {
    if (!platform?.env) {
      return json({
        success: false,
        message: "Service temporarily unavailable"
      }, { status: 500 });
    }
    const { email, type = "newsletter" } = await request.json();
    if (!email) {
      return json({
        success: false,
        message: "Email is required"
      }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({
        success: false,
        message: "Invalid email format"
      }, { status: 400 });
    }
    if (!["newsletter", "book-updates"].includes(type)) {
      return json({
        success: false,
        message: "Invalid subscription type"
      }, { status: 400 });
    }
    console.log("DB binding:", platform.env.DB_book ? "PRESENT" : "MISSING");
    const existingSubscriber = await platform.env.DB_book.prepare("SELECT id, confirmed FROM subscribers WHERE email = ? AND type = ?").bind(email, type).first();
    if (existingSubscriber?.confirmed) {
      return json({
        success: false,
        message: `Email already subscribed to ${type}`
      }, { status: 409 });
    }
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const confirmationToken = Array.from(tokenArray, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    if (existingSubscriber) {
      await platform.env.DB_book.prepare("UPDATE subscribers SET confirmation_token = ?, token_expires_at = ? WHERE id = ?").bind(confirmationToken, expiresAt.toISOString(), existingSubscriber.id).run();
    } else {
      await platform.env.DB_book.prepare(`
                    INSERT INTO subscribers (email, type, confirmation_token, token_expires_at, confirmed, created_at) 
                    VALUES (?, ?, ?, ?, 0, ?)
                `).bind(email, type, confirmationToken, expiresAt.toISOString(), (/* @__PURE__ */ new Date()).toISOString()).run();
    }
    const confirmationUrl = `${url.origin}/api/confirm?token=${confirmationToken}`;
    const emailContent = getConfirmationEmailContent(type, confirmationUrl);
    const emailSent = await sendMailgunEmail({
      to: email,
      ...emailContent
    }, platform.env);
    if (!emailSent) {
      console.error("Failed to send confirmation email to:", email);
      return json({
        success: false,
        message: "Failed to send confirmation email"
      }, { status: 500 });
    }
    return json({
      success: true,
      message: "Please check your email to confirm your subscription!"
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return json({
      success: false,
      message: "Failed to process subscription"
    }, { status: 500 });
  }
}
export {
  POST
};
