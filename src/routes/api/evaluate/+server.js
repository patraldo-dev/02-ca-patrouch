// src/routes/api/evaluate/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, platform, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    if (!platform?.env?.AI) {
        return json({ error: 'AI not available' }, { status: 503 });
    }

    const db = platform.env.DB_book;

    try {
        const { text, locale = 'en' } = await request.json();

        if (!text || text.trim().length < 50) {
            return json({ error: 'Text must be at least 50 characters' }, { status: 400 });
        }

        const systems = {
            en: `You are a literary editor. You MUST base your analysis ONLY on the text provided below. Do NOT invent, fabricate, or assume content that is not explicitly in the text. When quoting, copy the exact words from the text. This is raw, unrevised stream-of-consciousness prose — expect imperfections. Find the moments where a genuine authorial voice emerges. Quote each moment exactly, explain what works, rate 1-10. Then score: Vocabulary richness, Structural intent, Emotional impact, Originality, Craft (each 1-10). Give a weighted overall score 1-100. Be honest but generous — this platform values risk-taking over polish.`,
            es: `Eres un editor literario. DEBES basar tu análisis SOLO en el texto proporcionado abajo. NO inventes, fabriques o asumas contenido que no esté explícitamente en el texto. Al citar, copia las palabras exactas del texto. Es prosa cruda de flujo de conciencia — espera imperfecciones. Encuentra los momentos donde emerge una voz auténtica. Cita cada momento exactamente, explica qué funciona, califica 1-10. Luego puntúa: Riqueza de vocabulario, Intención estructural, Impacto emocional, Originalidad, Oficio (cada uno 1-10). Da un puntaje global ponderado 1-100. Sé honesto pero generoso — esta plataforma valora el riesgo sobre la perfección.`,
            fr: `Tu es un éditeur littéraire. Tu DOIS baser ton analyse UNIQUEMENT sur le texte fourni ci-dessous. N'invente PAS, ne fabrique PAS et n'assume PAS de contenu qui n'est pas explicitement dans le texte. En citant, copie les mots exacts du texte. C'est de la prose brute en flux de conscience — attends des imperfections. Trouve les moments où une véritable voix émerge. Cite chaque moment exactement, explique ce qui fonctionne, note 1-10. Puis score : Richesse du vocabulaire, Intention structurale, Impact émotionnel, Originalité, Métier (chacun 1-10). Donne un score global pondéré 1-100. Sois honnête mais généreux — cette plateforme valorise la prise de risque plutôt que la perfection.`,
            'en-es': `You are a bilingual literary editor fluent in English and Spanish. The text below contains BOTH English and Spanish — code-switching, Spanglish, or mixed-language prose. You MUST base your analysis ONLY on the text provided. Do NOT invent or fabricate. Quote exact words. This is raw, unrevised stream-of-consciousness prose. Find where a genuine authorial voice emerges across both languages. Quote each moment exactly (preserving the original language), explain what works, rate 1-10. Score: Vocabulary richness (both languages), Structural intent, Emotional impact, Originality, Craft (each 1-10). Overall score 1-100. Respond in the language(s) most present in the text.`,
            'en-fr': `You are a bilingual literary editor fluent in English and French. The text below contains BOTH English and French — code-switching or mixed-language prose. You MUST base your analysis ONLY on the text provided. Do NOT invent or fabricate. Quote exact words. This is raw, unrevised stream-of-consciousness prose. Find where a genuine authorial voice emerges across both languages. Quote each moment exactly (preserving the original language), explain what works, rate 1-10. Score: Vocabulary richness (both languages), Structural intent, Emotional impact, Originality, Craft (each 1-10). Overall score 1-100. Respond in the language(s) most present in the text.`,
            'es-fr': `Eres un editor literario bilingüe fluido en español y francés. El texto abajo contiene AMBOS idiomas — cambio de código o prosa multilingüe. DEBES basar tu análisis SOLO en el texto proporcionado. NO inventes ni fabriques. Cita palabras exactas. Es prosa cruda de flujo de conciencia. Encuentra los momentos donde emerge una voz auténtica en ambos idiomas. Cita cada momento exactamente (preservando el idioma original), explica qué funciona, califica 1-10. Puntúa: Riqueza de vocabulario (ambos idiomas), Intención estructural, Impacto emocional, Originalidad, Oficio (cada uno 1-10). Puntaje global 1-100. Responde en el/los idioma(s) más presente(s) en el texto.`
        };

        const labels = {
            en: 'TEXT TO EVALUATE',
            es: 'TEXTO A EVALUAR',
            fr: 'TEXTE À ÉVALUER',
            'en-es': 'TEXT TO EVALUATE (English/Spanish)',
            'en-fr': 'TEXT TO EVALUATE (English/French)',
            'es-fr': 'TEXTO A EVALUAR (Español/Français)'
        };

        const system = systems[locale] || systems.en;
        const label = labels[locale] || labels.en;
        const prompt = `${label}:\n---\n${text}`;

        const response = await platform.env.AI.run(
            '@cf/mistralai/mistral-small-3.1-24b-instruct',
            {
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 3000
            }
        );

        const id = crypto.randomUUID();
        const textPreview = text.slice(0, 200) + (text.length > 200 ? '...' : '');

        await db.prepare(
            "INSERT INTO evaluations (id, user_id, text_preview, evaluation, locale, model) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(id, user.id, textPreview, response.response, locale, 'mistral-small-3.1-24b').run();

        return json({
            id,
            evaluation: response.response,
            model: 'mistral-small-3.1-24b',
            locale,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('Evaluation error:', err);
        return json({ error: 'Evaluation failed' }, { status: 500 });
    }
}

export async function GET({ platform, locals, url }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = platform.env.DB_book;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

    const evaluations = await db.prepare(
        'SELECT id, text_preview, evaluation, locale, model, created_at FROM evaluations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(user.id, limit).all();

    return json({ evaluations: evaluations.results });
}

export async function DELETE({ platform, locals, request }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = platform.env.DB_book;
    const { id } = await request.json();

    if (!id) return json({ error: 'Missing id' }, { status: 400 });

    const result = await db.prepare('DELETE FROM evaluations WHERE id = ? AND user_id = ?').bind(id, user.id).run();

    if (result.meta.changes === 0) {
        return json({ error: 'Not found' }, { status: 404 });
    }

    return json({ success: true });
}
