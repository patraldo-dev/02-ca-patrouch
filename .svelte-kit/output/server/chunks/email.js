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
export {
  getConfirmationEmailContent as g,
  sendMailgunEmail as s
};
