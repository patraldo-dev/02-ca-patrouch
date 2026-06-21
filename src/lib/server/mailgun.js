// src/lib/server/mailgun.js
export async function sendMailgunEmail(to, subject, html, text, env) {
    const apiKey = env.MAILGUN_API_KEY;
    const domain = env.MAILGUN_DOMAIN;

    if (!apiKey || !domain) {
        throw new Error('Mailgun not configured');
    }

    const from = env.MAILGUN_FROM_EMAIL || `noreply@${domain}`;
    const formData = new FormData();
    formData.append('from', `Patrouch <${from}>`);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', html);
    formData.append('text', text);
    formData.append('o:tracking-clicks', 'no');
    formData.append('o:tracking-opens', 'no');

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`api:${apiKey}`)}` },
        body: formData
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Mailgun ${response.status}: ${err}`);
    }

    return response.json();
}

export async function sendVerificationEmail(to, verifyUrl, env) {
    const html = `
        <h2>Welcome to Patrouch!</h2>
        <p>Click below to verify your email:</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#c9a87c;color:#09090b;text-decoration:none;border-radius:8px;font-weight:600;">Verify Email</a>
        <p style="color:#888;font-size:0.85rem;margin-top:1rem;">Or paste: <code>${verifyUrl}</code></p>
    `;
    return sendMailgunEmail(to, 'Verify your email — Patrouch', html, `Verify your email: ${verifyUrl}`, env);
}

export async function sendSundaySparkEmail(to, dualPrompt, locale, env) {
    const content = {
        en: {
            subject: '☀️🌙 Your Sunday Spark',
            preheader: 'Two doors for this week. You choose.',
            tagline: 'A Playful Space for Serious Writing',
            intro: 'Two doors this week. Neither is right. Neither is wrong. You choose.',
            sun_label: 'Sun',
            moon_label: 'Moon',
            cta: 'Start Writing',
            footer: 'You subscribed to receive weekly sparks from patrouch.ca. No spam, just sparks.'
        },
        es: {
            subject: '☀️🌙 Tu Chispa Dominical',
            preheader: 'Dos puertas para esta semana. Tú eliges.',
            tagline: 'Un Espacio Lúdico para Escritura Seria',
            intro: 'Dos puertas esta semana. Ninguna es la correcta. Ninguna es la equivocada. Tú eliges.',
            sun_label: 'Sol',
            moon_label: 'Luna',
            cta: 'Empezar a Escribir',
            footer: 'Te suscribiste para recibir chispas semanales de patrouch.ca. Sin spam, solo chispas.'
        },
        fr: {
            subject: '☀️🌙 Ton Étincelle du Dimanche',
            preheader: 'Deux portes pour cette semaine. À toi de choisir.',
            tagline: 'Un Espace Ludique pour l\'Écriture Sérieuse',
            intro: 'Deux portes cette semaine. Aucune n\'est la bonne. Aucune n\'est la mauvaise. À toi de choisir.',
            sun_label: 'Soleil',
            moon_label: 'Lune',
            cta: 'Commencer à Écrire',
            footer: 'Tu t\'es abonné pour recevoir des étincelles hebdomadaires de patrouch.ca. Pas de spam, juste des étincelles.'
        }
    };

    const c = content[locale] || content.en;

    const sunAct = dualPrompt?.sun?.act || '';
    const sunSpark = dualPrompt?.sun?.spark || '';
    const moonAct = dualPrompt?.moon?.act || '';
    const moonSpark = dualPrompt?.moon?.spark || '';

    const sunUrl = `https://patrouch.ca/write?spark=${encodeURIComponent(sunSpark)}`;
    const moonUrl = `https://patrouch.ca/write?spark=${encodeURIComponent(moonSpark)}`;

    const html = `
        <div style="max-width:480px;margin:0 auto;font-family:Georgia,serif;color:#1a1a1a;background:#faf9f7;padding:2rem;border-radius:12px;">
            <div style="text-align:center;margin-bottom:0.25rem;">
                <h1 style="font-size:1.5rem;font-weight:400;color:#9a7b4f;margin:0;letter-spacing:0.02em;">patrouch.ca</h1>
                <p style="font-size:0.75rem;color:#999;margin:0.25rem 0 0;font-style:italic;">${c.tagline}</p>
            </div>
            <hr style="border:none;border-top:1px solid #e5e5e5;margin:1.5rem 0;">
            <p style="color:#666;font-size:0.95rem;line-height:1.6;text-align:center;">${c.intro}</p>

            <!-- Sun Door -->
            <div style="background:#fff8f0;border:1px solid #e8d5b8;border-radius:10px;padding:1.25rem;margin:1.25rem 0;">
                <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;color:#c9a87c;margin-bottom:0.5rem;">☀️ ${c.sun_label}</div>
                <p style="font-size:1rem;color:#333;margin:0 0 0.75rem;line-height:1.6;">${sunAct}</p>
                <p style="font-style:italic;color:#777;font-size:0.9rem;margin:0 0 1rem;line-height:1.5;">${sunSpark}</p>
                <a href="${sunUrl}" style="display:inline-block;padding:8px 24px;background:#c9a87c;color:#09090b;text-decoration:none;border-radius:6px;font-weight:600;font-size:0.9rem;">${c.cta} →</a>
            </div>

            <!-- Moon Door -->
            <div style="background:#f0f0f8;border:1px solid #d5d5e8;border-radius:10px;padding:1.25rem;margin:1.25rem 0;">
                <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;color:#6b6b9a;margin-bottom:0.5rem;">🌙 ${c.moon_label}</div>
                <p style="font-size:1rem;color:#333;margin:0 0 0.75rem;line-height:1.6;">${moonAct}</p>
                <p style="font-style:italic;color:#777;font-size:0.9rem;margin:0 0 1rem;line-height:1.5;">${moonSpark}</p>
                <a href="${moonUrl}" style="display:inline-block;padding:8px 24px;background:#6b6b9a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:0.9rem;">${c.cta} →</a>
            </div>

            <p style="color:#999;font-size:0.75rem;text-align:center;margin-top:2rem;border-top:1px solid #e5e5e5;padding-top:1rem;">${c.footer}</p>
        </div>
    `;

    const text = `patrouch.ca — ${c.tagline}\n\n${c.intro}\n\n☀️ ${c.sun_label}\n${sunAct}\n${sunSpark}\n${c.cta}: ${sunUrl}\n\n🌙 ${c.moon_label}\n${moonAct}\n${moonSpark}\n${c.cta}: ${moonUrl}\n\n${c.footer}`;

    return sendMailgunEmail(to, c.subject, html, text, env);
}
