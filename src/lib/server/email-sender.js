// src/lib/server/email-sender.js
// One place that sends transactional mail. Mailgun is the default, as it has
// always been. When a site sets EMAIL_BACKEND to "cloudflare" and its Worker
// carries an EMAIL binding, the message goes through Cloudflare's Email
// Sending instead: no API key, the binding is the credential.
import { sendMailgunEmail } from "./mailgun.js";

export class EmailError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = "EmailError";
    this.code = code;
  }
}

/**
 * Which service sends for this site: "cloudflare" or "mailgun".
 * @param {Record<string, any>} env
 */
export function emailBackend(env) {
  return env?.EMAIL_BACKEND === "cloudflare" ? "cloudflare" : "mailgun";
}

/**
 * Whether anything is set up to send at all. A site with neither (staging
 * before Cloudflare was configured) must skip the send rather than fail.
 *
 * @param {Record<string, any>} env
 */
export function emailConfigured(env) {
  if (emailBackend(env) === "cloudflare") {
    return Boolean(env?.EMAIL && env?.EMAIL_FROM);
  }
  return Boolean(env?.MAILGUN_API_KEY && env?.MAILGUN_DOMAIN);
}

/**
 * The sender as the binding takes it: a bare address goes as it is, and
 * `Name <address>` (the form Mailgun is given) becomes { email, name }, which
 * is what the binding wants for a sender with a display name.
 * @param {string} value
 */
function sender(value) {
    const match = /^(.*)<([^<>]+)>\s*$/.exec(String(value));
    if (!match) return String(value).trim();
    const email = match[2].trim();
    const name = match[1].trim().replace(/^"(.*)"$/, "$1");
    return { email, name: name || email };
}

/**
 * Send one message.
 *
 * Throws an EmailError when this site cannot send at all (code
 * "not_configured", "no_binding" or "no_sender"). A refusal from the service
 * itself is passed on as it came, with its own code, so callers can tell a
 * refused recipient (E_RECIPIENT_NOT_ALLOWED) from anything else.
 *
 * @template {Record<string, any>} E
 * @param {E} env the Worker's bindings and variables
 * @param {{ to: string, subject: string, html: string, text: string, replyTo?: string }} message
 * @returns {Promise<"cloudflare" | "mailgun">} which service took the message
 */
export async function sendEmail(env, { to, subject, html, text, replyTo }) {
  if (emailBackend(env) === "cloudflare") {
    if (!env.EMAIL) {
      throw new EmailError(
        "no_binding",
        "EMAIL_BACKEND is cloudflare but this Worker has no EMAIL binding",
      );
    }
    if (!env.EMAIL_FROM) {
      throw new EmailError(
        "no_sender",
        "EMAIL_BACKEND is cloudflare but EMAIL_FROM is not set",
      );
    }
    await env.EMAIL.send({
      to,
      from: sender(env.EMAIL_FROM),
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });
    return "cloudflare";
  }
  if (!emailConfigured(env)) {
    throw new EmailError("not_configured", "No email service is configured");
  }
  await sendMailgunEmail(to, subject, html, text, env);
  return "mailgun";
}

/**
 * The mail that verifies a new member's address. `verifyUrl` is the link the
 * member clicks; the message is the same whichever service sends it.
 *
 * @param {string} verifyUrl
 */
export function verificationMessage(verifyUrl) {
  const html = `
        <h2>Welcome to Patrouch!</h2>
        <p>Click below to verify your email:</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#a8bdb3;color:#101915;text-decoration:none;border-radius:8px;font-weight:600;">Verify Email</a>
        <p style="color:#888;font-size:0.85rem;margin-top:1rem;">Or paste: <code>${verifyUrl}</code></p>
    `;
  return {
    subject: "Verify your email — Patrouch",
    html,
    text: `Verify your email: ${verifyUrl}`,
  };
}
