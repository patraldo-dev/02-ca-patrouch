async function sendMailgunEmail(to, subject, html, text, env) {
  const apiKey = env.MAILGUN_API_KEY;
  const domain = env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) {
    throw new Error("Mailgun not configured");
  }
  const from = env.MAILGUN_FROM_EMAIL || `noreply@${domain}`;
  const formData = new FormData();
  formData.append("from", `Patrouch <${from}>`);
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("html", html);
  formData.append("text", text);
  formData.append("o:tracking-clicks", "no");
  formData.append("o:tracking-opens", "no");
  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`api:${apiKey}`)}` },
    body: formData
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mailgun ${response.status}: ${err}`);
  }
  return response.json();
}
async function sendDailyPromptEmail(to, prompt, locale, env) {
  const content = {
    en: {
      subject: "✨ Your Sunday Spark",
      preheader: "A gentle nudge to write this week.",
      greeting: "Hello, writer.",
      body: `Here's your spark for this Sunday. No pressure — just a thought to carry with you:`,
      cta: "Start Writing",
      footer: "You subscribed to receive weekly prompts from Patrouch. No spam, just sparks."
    },
    es: {
      subject: "✨ Tu Chispa Dominical",
      preheader: "Un impulso suave para escribir esta semana.",
      greeting: "Hola, escritor.",
      body: "Aquí tienes tu chispa para este domingo. Sin presión — solo un pensamiento para llevar contigo:",
      cta: "Empezar a Escribir",
      footer: "Te suscribiste para recibir estímulos semanales de Patrouch. Sin spam, solo chispas."
    },
    fr: {
      subject: "✨ Ton Étincelle du Dimanche",
      preheader: "Un doux encouragement pour écrire cette semaine.",
      greeting: "Bonjour, écrivain.",
      body: "Voici ton étincelle pour ce dimanche. Sans pression — juste une pensée à emporter avec toi :",
      cta: "Commencer à Écrire",
      footer: "Tu t'es abonné pour recevoir des stimuli hebdomadaires de Patrouch. Pas de spam, juste des étincelles."
    }
  };
  const c = content[locale] || content.en;
  const promptUrl = "https://patrouch.ca/write";
  const html = `
        <div style="max-width:480px;margin:0 auto;font-family:Georgia,serif;color:#1a1a1a;background:#faf9f7;padding:2rem;border-radius:12px;">
            <div style="text-align:center;margin-bottom:2rem;">
                <h1 style="font-size:1.5rem;font-weight:400;color:#9a7b4f;margin:0;">Patrouch</h1>
            </div>
            <h2 style="font-size:1.3rem;font-weight:400;color:#1a1a1a;margin-bottom:0.5rem;">${c.greeting}</h2>
            <p style="color:#666;font-size:0.95rem;line-height:1.6;">${c.body}</p>
            <blockquote style="border-left:3px solid #c9a87c;padding:1rem 1.25rem;margin:1.5rem 0;background:#f0eeeb;border-radius:0 8px 8px 0;font-style:italic;color:#333;font-size:1.05rem;line-height:1.7;">
                ${prompt}
            </blockquote>
            <div style="text-align:center;margin:2rem 0;">
                <a href="${promptUrl}" style="display:inline-block;padding:12px 32px;background:#c9a87c;color:#09090b;text-decoration:none;border-radius:8px;font-weight:600;font-size:1rem;">${c.cta}</a>
            </div>
            <p style="color:#999;font-size:0.75rem;text-align:center;margin-top:2rem;border-top:1px solid #e5e5e5;padding-top:1rem;">${c.footer}</p>
        </div>
    `;
  const text = `${c.greeting}

${c.body}

"${prompt}"

${c.cta}: ${promptUrl}

${c.footer}`;
  return sendMailgunEmail(to, c.subject, html, text, env);
}
export {
  sendMailgunEmail as a,
  sendDailyPromptEmail as s
};
