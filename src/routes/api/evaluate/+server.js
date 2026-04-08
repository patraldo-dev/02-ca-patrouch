// src/routes/api/evaluate/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, platform, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    if (!platform?.env?.AI) {
        return json({ error: 'AI not available' }, { status: 503 });
    }

    try {
        const { text, locale = 'en' } = await request.json();

        if (!text || text.trim().length < 50) {
            return json({ error: 'Text must be at least 50 characters' }, { status: 400 });
        }

        const prompts = {
            en: `You are a literary editor reviewing a first draft written in stream-of-consciousness style. This is raw, unrevised prose — expect imperfections, run-on sentences, and apparent incoherence. Your job is NOT to judge the polish, but to find the moments where a genuine authorial voice emerges.

For each moment you identify:
1. Quote it exactly
2. Explain what makes it work
3. Rate its strength 1-10

Then give:
- Overall assessment: does the raw material justify revision?
- What specific passages should the author prioritize?
- A score for each dimension (1-10): Vocabulary richness, Structural intent, Emotional impact, Originality, Craft
- Weighted overall score (1-100)

Be honest but generous. This platform values risk-taking and originality over polish.

TEXT TO EVALUATE:
---
{text}`,

            es: `Eres un editor literario revisando un primer borrador escrito en estilo de flujo de conciencia. Es prosa cruda, sin revisar — espera imperfecciones, oraciones largas e incoherencia aparente. Tu trabajo NO es juzgar la pulcritud, sino encontrar los momentos donde emerge una voz auténtica.

Por cada momento que identifiques:
1. Cítalo exactamente
2. Explica qué lo hace funcionar
3. Califícalo 1-10

Luego da:
- Evaluación general: ¿justifica el material en bruto una revisión?
- ¿Qué pasajes específicos debería priorizar el autor?
- Puntaje en cada dimensión (1-10): Riqueza de vocabulario, Intención estructural, Impacto emocional, Originalidad, Oficio
- Puntaje global ponderado (1-100)

Sé honesto pero generoso. Esta plataforma valora el riesgo y la originalidad sobre la perfección.

TEXTO A EVALUAR:
---
{text}`,

            fr: `Tu es un éditeur littéraire qui révise un premier brouillon écrit en style de flux de conscience. C'est de la prose brute, non révisée — attends des imperfections, des phrases interminables et une incohérence apparente. Ton travail n'est PAS de juger la finesse, mais de trouver les moments où une véritable voix d'auteur émerge.

Pour chaque moment que tu identifies :
1. Cite-le exactement
2. Explique ce qui fait qu'il fonctionne
3. Note-le 1-10

Puis donne :
- Évaluation générale : le matériel brut justifie-t-il une révision ?
- Quels passages spécifiques l'auteur devrait-il prioriser ?
- Score pour chaque dimension (1-10) : Richesse du vocabulaire, Intention structurale, Impact émotionnel, Originalité, Métier
- Score global pondéré (1-100)

Sois honnête mais généreux. Cette plateforme valorise la prise de risque et l'originalité plutôt que la perfection.

TEXTE À ÉVALUER :
---
{text}`
        };

        const prompt = prompts[locale] || prompts.en;

        const response = await platform.env.AI.run(
            '@cf/mistralai/mistral-small-3.1-24b-instruct',
            {
                prompt,
                max_tokens: 2000
            }
        );

        return json({
            evaluation: response.response,
            model: 'mistral-small-3.1-24b',
            locale
        });
    } catch (err) {
        console.error('Evaluation error:', err);
        return json({ error: 'Evaluation failed' }, { status: 500 });
    }
}
