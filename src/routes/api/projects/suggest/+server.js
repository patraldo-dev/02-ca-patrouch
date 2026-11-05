// POST /api/projects/suggest — the AI gatherer. Reads the member's own
// published AND draft pieces (titles + excerpts), asks Workers AI to find
// thematic threads, and returns suggested collections. Read-only: creating
// is a separate, explicit POST /api/projects the user confirms from the UI.
import { json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

function gate(user) {
    if (!user) return 401;
    if (!['member', 'admin'].includes(user.role || '')) return 403;
    return 0;
}

export async function POST({ locals }) {
    const denied = gate(locals?.user);
    if (denied) return json({ error: 'Unauthorized' }, { status: denied });

    const { results: writings } = await locals.db
        .prepare(
            `SELECT id, title, content, status FROM writings
             WHERE user_id = ? AND status IN ('published', 'draft')
             ORDER BY updated_at DESC LIMIT 40`
        )
        .bind(locals.user.id)
        .all();

    const pieces = (writings || []).map((w) => ({
        id: w.id,
        title: w.title,
        excerpt: String(w.content || '').replace(/\\s+/g, ' ').slice(0, 220)
    }));
    if (pieces.length < 4) {
        return json({ error: 'Not enough pieces yet — write a few more first.', code: 'too_few' }, { status: 400 });
    }

    const ai = env?.AI;
    if (!ai) return json({ error: 'AI unavailable' }, { status: 503 });

    const system = `You are a literary editor. A writer gives you their pieces. Find 1-4 thematic collections: recurring subjects, imagery, settings, emotional threads. Only propose a collection if 2+ pieces genuinely share the thread. Titles: short and evocative, in the language of the pieces. Respond with STRICT JSON only, no markdown: [{"title":"...","description":"one sentence","pieces":["id1","id2"]}]. Every pieces[] id must come from the input.`;
    const user = JSON.stringify(pieces);

    let suggestions = [];
    try {
        const res = await ai.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ],
            max_tokens: 800,
            temperature: 0.4
        });
        // the model sometimes returns response as a non-string (chunk list /
        // object depending on gateway path) — coerce before matching
        const raw = res?.response;
        const text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
        // extract the first JSON array, defensively
        const m = text.match(/\[[\s\S]*\]/);
        if (m) {
            const parsed = JSON.parse(m[0]);
            const valid = new Set(pieces.map((p) => p.id));
            suggestions = (Array.isArray(parsed) ? parsed : [])
                .filter((s) => s?.title && Array.isArray(s.pieces))
                .map((s) => ({
                    title: String(s.title).slice(0, 120),
                    description: String(s.description || '').slice(0, 300),
                    pieces: s.pieces.filter((id) => valid.has(id))
                }))
                .filter((s) => s.pieces.length >= 2)
                .slice(0, 4);
        }
    } catch (e) {
        console.error('[projects/suggest] AI failed:', e.message);
        return json({ error: 'Suggestion failed', code: 'ai_failed' }, { status: 502 });
    }

    return json({ suggestions, titles: Object.fromEntries(pieces.map((p) => [p.id, p.title])) });
}
