// POST /api/projects/suggest-title — one evocative title for a collection
// of the member's pieces written against one prompt. Read-only, cheap:
// prompt text + piece titles only. Falls back to a date-based title if
// the AI is unavailable so the gather flow never blocks.
import { json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

function gate(user) {
    if (!user) return 401;
    if (!['member', 'admin'].includes(user.role || '')) return 403;
    return 0;
}

export async function POST({ locals, request }) {
    const denied = gate(locals?.user);
    if (denied) return json({ error: 'Unauthorized' }, { status: denied });

    let body;
    try { body = await request.json(); } catch { body = {}; }
    const promptId = String(body.prompt_id || '');
    if (!promptId) return json({ error: 'prompt_id required' }, { status: 400 });

    const prompt = await locals.db.prepare(
        'SELECT id, prompt_text, prompt_date, locale FROM writing_prompts WHERE id = ?'
    ).bind(promptId).first();
    if (!prompt) return json({ error: 'Prompt not found' }, { status: 404 });

    const { results } = await locals.db.prepare(
        `SELECT title FROM writings
         WHERE prompt_id = ? AND user_id = ? AND status IN ('published', 'draft')
         ORDER BY created_at ASC LIMIT 20`
    ).bind(promptId, locals.user.id).all();
    const titles = (results || []).map((w) => w.title);

    const fallback = `Estímulo · ${prompt.prompt_date}`;
    const ai = env?.AI;
    if (!ai || titles.length === 0) return json({ title: fallback, fallback: true });

    try {
        const res = await ai.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
            messages: [
                {
                    role: 'system',
                    content: `You title collections of short writings. Given the prompt that inspired them and the piece titles, propose ONE collection title: short (max 6 words), evocative. You MUST answer in the SAME LANGUAGE as the piece titles (they are in ${prompt.locale === 'en' ? 'English' : prompt.locale === 'fr' ? 'French' : 'Spanish'}) — never translate. Respond with STRICT JSON only: {"title":"..."}`
                },
                { role: 'user', content: JSON.stringify({ prompt: prompt.prompt_text, titles }) }
            ],
            max_tokens: 120,
            temperature: 0.5
        });
        // the gateway sometimes returns response as a non-string — coerce
        const raw = res?.response;
        const text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
            const parsed = JSON.parse(m[0]);
            if (parsed?.title && typeof parsed.title === 'string') {
                return json({ title: parsed.title.trim().slice(0, 90) });
            }
        }
    } catch (e) {
        console.error('[projects/suggest-title] AI failed:', e.message);
    }
    return json({ title: fallback, fallback: true });
}
