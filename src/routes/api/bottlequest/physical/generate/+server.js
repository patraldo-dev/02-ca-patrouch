import { json } from '@sveltejs/kit';

export async function POST({ platform, request }) {
    const ai = platform?.env?.AI;
    if (!ai) return json({ error: 'AI not available' }, { status: 500 });

    const { mode = 'fiesta', theme = 'cumpleaños' } = await request.json();

    const prompts = {
        fiesta: `Genera un mensaje corto y emotivo para una fiesta de cumpleaños. Debe ser cálido, original, no más de 3 líneas. Responde SOLO en JSON: {"title": "emoji + título creativo (máx 50 chars)", "content": "el mensaje"}`,
        pirate: `Genera un mensaje misterioso para una botella al mar. Estilo pirata, aventurero, no más de 3 líneas. Responde SOLO en JSON: {"title": "emoji + título misterioso (máx 50 chars)", "content": "el mensaje"}`
    };

    const prompt = prompts[mode] || prompts.pirate;

    try {
        const response = await ai.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200
        });

        const text = response.choices?.[0]?.message?.content || '';
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return json({ title: parsed.title, content: parsed.content, challenge: parsed.challenge || "" });
        }
        // Fallback: use raw text as content
        return json({ title: theme === 'cumpleaños' ? '🎂 Mensaje Especial' : '🏴‍☠️ Mensaje Misterioso', content: text.trim() });
    } catch (e) {
        return json({ error: 'AI generation failed: ' + e.message }, { status: 500 });
    }
}
