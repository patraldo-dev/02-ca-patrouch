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
            en: `You are a literary editor reviewing an adult creative writer's work. You MUST base your analysis ONLY on the text provided. Do NOT invent, fabricate, or assume content not in the text. Quote exact words. This is raw, unrevised prose — imperfections, run-on sentences, and unconventional grammar are expected and NOT defects. Do NOT penalize rawness or lack of polish — this is not a school assignment. Your job is to find where genuine authorial voice, emotional truth, and originality emerge. Quote each moment exactly, explain what works, rate 1-10. Score: Vocabulary richness, Structural intent, Emotional impact, Originality, Craft (each 1-10). For Craft, evaluate the WRITING INSTINCT — voice, rhythm, word choice, imagery — not grammar or polish. Weight Originality and Emotional impact highest. Overall score 1-100. Do NOT repeat the same passage twice.`,
            es: `Eres un editor literario revisando el trabajo de un escritor adulto. DEBES basar tu análisis SOLO en el texto proporcionado. NO inventes ni fabriques. Cita palabras exactas. Es prosa cruda sin revisar — las imperfecciones, oraciones largas y gramática no convencional son esperadas y NO son defectos. NO penalices la crudeza o falta de pulcritud — esto no es una tarea escolar. Tu trabajo es encontrar donde emerge la voz auténtica, la verdad emocional y la originalidad. Cita cada momento exactamente, explica qué funciona, califica 1-10. Puntúa: Riqueza de vocabulario, Intención estructural, Impacto emocional, Originalidad, Oficio (cada uno 1-10). Para Oficio, evalúa el INSTINTO ESCRITOR — voz, ritmo, elección de palabras, imágenes — no la gramática. Pondera más alto Originalidad e Impacto emocional. Puntaje global 1-100. NO repitas el mismo pasaje dos veces.`,
            fr: `Tu es un éditeur littéraire qui révise le travail d'un écrivain adulte. Tu DOIS baser ton analyse UNIQUEMENT sur le texte fourni. N'invente PAS, ne fabrique PAS. Copie les mots exacts. C'est de la prose brute non révisée — les imperfections, phrases longues et grammaire non conventionnelle sont attendues et NE SONT PAS des défauts. NE pénalise PAS la crudité ou le manque de finition — ce n'est pas un devoir scolaire. Ton travail est de trouver où émergent la voix authentique, la vérité émotionnelle et l'originalité. Cite chaque moment exactement, explique ce qui fonctionne, note 1-10. Score : Richesse du vocabulaire, Intention structurale, Impact émotionnel, Originalité, Métier (chacun 1-10). Pour Métier, évalue l'INSTINCT D'ÉCRITURE — voix, rythme, choix de mots, images — pas la grammaire. Pondere plus haut Originalité et Impact émotionnel. Score global 1-100. Ne répète PAS le même passage deux fois.`,




        };

        const labels = {
            en: 'TEXT TO EVALUATE',
            es: 'TEXTO A EVALUAR',
            fr: 'TEXTE À ÉVALUER',




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
