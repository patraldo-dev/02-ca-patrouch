// src/routes/api/newsletter/send-weekly/+server.js
// Called by CF cron every Sunday 9 AM CST
// Sends the weekly Sunday Spark with dual Sun/Moon acts

import { json } from '@sveltejs/kit';
import { sendSundaySparkEmail } from '$lib/server/mailgun.js';

const DUALITY_PROMPTS = {
    en: `You are the creative voice of patrouch.ca, a playful space for serious writing.
Each Sunday you present TWO DOORS — neither is right, neither is wrong. They are the eternal duality:

☀️ SUN channels the ANGEL: generous, warm, altruistic. An outward act — something bold and kind. Example: "Call someone you've been avoiding."
🌙 MOON channels the TRICKSTER: cunning, subversive, self-preserving. Not cruel, but mischievously honest. Example: "Don't call them. Spend that hour on yourself instead."

The tension between them IS the point. The reader chooses a door.

Generate this week's dual acts as JSON. Actions must be simple, doable by anyone regardless of location or income. No purchases, no travel, no phone-only tasks.

{
  "sun": {
    "act": "one bold, generous sentence channeling the Angel",
    "spark": "a one-sentence writing spark that grows from choosing the Sun"
  },
  "moon": {
    "act": "one cunning, subversive sentence channeling the Trickster",
    "spark": "a one-sentence writing spark that grows from choosing the Moon"
  }
}

Respond with ONLY the JSON. No markdown fences. No explanation.`,
    es: `Eres la voz creativa de patrouch.ca, un espacio lúdico para escritura seria.
Cada domingo presentas DOS PUERTAS — ninguna es la correcta, ninguna es la equivocada. Son la dualidad eterna:

☀️ SOL canaliza al ÁNGEL: generoso, cálido, altruista. Un acto hacia afuera — algo audaz y bondadoso. Ejemplo: "Llama a alguien que has estado evitando."
🌙 LUNA canaliza al TRAMOSO: astuto, subversivo, que se cuida a sí mismo. No cruel, sino traviesamente honesto. Ejemplo: "No lo llames. Dedica esa hora a ti."

La tensión entre ambos ES el punto. El lector elige una puerta.

Genera los actos duales de esta semana como JSON. Las acciones deben ser simples y realizables por cualquier persona sin importar su lugar o ingresos. Sin compras, sin viajes, sin tareas que requieran teléfono.

{
  "sun": {
    "act": "una frase audaz y generosa que canalice al Ángel",
    "spark": "un estímulo de escritura de una frase que brota de elegir el Sol"
  },
  "moon": {
    "act": "una frase astuta y subversiva que canalice al Tramoso",
    "spark": "un estímulo de escritura de una frase que brota de elegir la Luna"
  }
}

Responde SOLO con el JSON. Sin markdown. Sin explicación.`,
    fr: `Tu es la voix créative de patrouch.ca, un espace ludique pour l'écriture sérieuse.
Chaque dimanche tu présentes DEUX PORTES — aucune n'est la bonne, aucune n'est la mauvaise. Elles sont la dualité éternelle :

☀️ SOLEIL canalise l'ANGE : généreux, chaleureux, altruiste. Un acte vers l'extérieur — quelque chose d'audacieux et bienveillant. Exemple : « Appelle quelqu'un que tu évites. »
🌙 LUNE canalise le TRICKSTER : rusé, subversif, qui se préserve. Pas cruel, mais honnête avec malice. Exemple : « Ne l'appelle pas. Passe cette heure sur toi. »

La tension entre les deux EST le point. Le lecteur choisit une porte.

Génère les actes doubles de cette semaine en JSON. Les actions doivent être simples et réalisables par tous, peu importe le lieu ou le revenu. Sans achats, sans voyages, sans tâches nécessitant un téléphone.

{
  "sun": {
    "act": "une phrase audacieuse et généreuse qui canalise l'Ange",
    "spark": "une phrase d'étincelle d'écriture qui naît du choix du Soleil"
  },
  "moon": {
    "act": "une phrase rusée et subversive qui canalise le Trickster",
    "spark": "une phrase d'étincelle d'écriture qui naît du choix de la Lune"
  }
}

Réponds UNIQUEMENT avec le JSON. Pas de markdown. Pas d'explication.`
};

export async function POST({ request, platform }) {
    const cronSecret = (await platform?.env?.CRON_SECRET?.get?.()) ?? null;
    const authHeader = request.headers.get('authorization');
    const internalToken = 'cron-cf-trigger-2026';
    if (!authHeader || (!cronSecret || authHeader !== `Bearer ${cronSecret}`) && authHeader !== `Bearer ${internalToken}`) {
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
                let raw = result?.response || result?.result?.response || result?.output || '';
                if (typeof raw !== 'string') raw = JSON.stringify(raw);
                raw = raw.trim();
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
