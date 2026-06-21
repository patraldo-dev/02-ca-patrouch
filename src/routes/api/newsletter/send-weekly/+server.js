// src/routes/api/newsletter/send-weekly/+server.js
// Called by CF cron every Sunday 9 AM CST
// Sends the weekly Sunday Spark with dual Sun/Moon acts

import { json } from '@sveltejs/kit';
import { sendSundaySparkEmail } from '$lib/server/mailgun.js';

const DUALITY_PROMPTS = {
    en: `You are the creative voice of patrouch.ca, a playful space for serious writing.
Generate two complementary weekly acts as JSON. They are NOT writing prompts — they are simple, doable actions anyone can perform regardless of location or income.

{
  "sun": {
    "act": "one short sentence — an outward action, connecting with others or the world",
    "spark": "a one-sentence writing spark that grows from doing the sun act"
  },
  "moon": {
    "act": "one short sentence — an inward action, reflection or self-care",
    "spark": "a one-sentence writing spark that grows from doing the moon act"
  }
}

Respond with ONLY the JSON. No markdown fences. No explanation.`,
    es: `Eres la voz creativa de patrouch.ca, un espacio lúdico para escritura seria.
Genera dos actos semanales complementarios como JSON. NO son estímulos de escritura — son acciones simples y realizables por cualquier persona sin importar su lugar o ingresos.

{
  "sun": {
    "act": "una frase corta — una acción hacia afuera, conectar con otros o con el mundo",
    "spark": "un estímulo de escritura de una frase que brota de hacer el acto sol"
  },
  "moon": {
    "act": "una frase corta — una acción hacia adentro, reflexión o cuidado personal",
    "spark": "un estímulo de escritura de una frase que brota de hacer el acto luna"
  }
}

Responde SOLO con el JSON. Sin markdown. Sin explicación.`,
    fr: `Tu es la voix créative de patrouch.ca, un espace ludique pour l'écriture sérieuse.
Génère deux actes hebdomadaires complémentaires en JSON. Ce ne sont PAS des prompts d'écriture — ce sont des actions simples et réalisables par tous, peu importe le lieu ou le revenu.

{
  "sun": {
    "act": "une phrase courte — une action vers l'extérieur, connecter avec les autres ou le monde",
    "spark": "une phrase d'étincelle d'écriture qui naît de l'acte soleil"
  },
  "moon": {
    "act": "une phrase courte — une action vers l'intérieur, réflexion ou soin de soi",
    "spark": "une phrase d'étincelle d'écriture qui naît de l'acte lune"
  }
}

Réponds UNIQUEMENT avec le JSON. Pas de markdown. Pas d'explication.`
};

export async function POST({ request, platform }) {
    const cronSecret = (await platform?.env?.CRON_SECRET?.get?.()) ?? null;
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = platform?.env?.DB_book;
    const ai = platform?.env?.AI;

    if (!db) return json({ error: 'DB unavailable' }, { status: 503 });

    const { results: subscribers } = await db.prepare(
        "SELECT email, locale FROM subscribers WHERE type = 'daily-prompt' AND confirmed = 1"
    ).all();

    if (!subscribers.length) {
        return json({ sent: 0, message: 'No subscribers' });
    }

    // Group by locale
    const byLocale = {};
    for (const sub of subscribers) {
        const loc = sub.locale || 'en';
        if (!byLocale[loc]) byLocale[loc] = [];
        byLocale[loc].push(sub.email);
    }

    let sent = 0;
    let errors = [];

    for (const [locale, emails] of Object.entries(byLocale)) {
        let dualPrompt;

        if (ai) {
            try {
                const result = await ai.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
                    messages: [{ role: 'user', content: DUALITY_PROMPTS[locale] || DUALITY_PROMPTS.en }],
                    max_tokens: 300,
                    temperature: 0.9
                });
                let raw = result?.response?.trim() || '';
                raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
                dualPrompt = JSON.parse(raw);
            } catch (e) {
                errors.push(`AI failed for ${locale}: ${e.message}`);
                continue;
            }
        } else {
            errors.push(`No AI for ${locale}`);
            continue;
        }

        // Send to all subscribers of this locale
        for (const email of emails) {
            try {
                await sendSundaySparkEmail(email, dualPrompt, locale, platform.env);
                sent++;
            } catch (e) {
                errors.push(`${email}: ${e.message}`);
            }
        }

        // Small delay between locales
        await new Promise(r => setTimeout(r, 500));
    }

    return json({ sent, total: subscribers.length, errors: errors.length > 0 ? errors : undefined });
}
