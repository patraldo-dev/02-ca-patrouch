import { json } from '@sveltejs/kit';

export async function POST({ request, platform, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'member' && user.role !== 'admin') {
        return json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!platform?.env?.AI) {
        return json({ error: 'AI not available' }, { status: 503 });
    }

    const db = platform.env.DB_book;

    try {
        const { text, locale = 'en' } = await request.json();

        if (!text || text.trim().length < 50) {
            return json({ error: 'Text must be at least 50 characters' }, { status: 400 });
        }

        const system = 'You are a skilled literary editor. Refine and improve the following text while preserving the author\'s voice, style, and intent. Focus on: rhythm, word choice, imagery, emotional impact. Do NOT change the meaning or tone. Output only the refined text, no explanations.';

        const response = await platform.env.AI.run(
            '@cf/mistralai/mistral-small-3.1-24b-instruct',
            {
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: text }
                ],
                max_tokens: 4000
            }
        );

        const id = crypto.randomUUID();
        const textPreview = text.slice(0, 200) + (text.length > 200 ? '...' : '');
        const refinedText = response.response.trim();

        await db.prepare(
            "INSERT INTO refinements (id, user_id, text_preview, refined_text, locale) VALUES (?, ?, ?, ?, ?)"
        ).bind(id, user.id, textPreview, refinedText, locale).run();

        return json({
            id,
            refinedText,
            textPreview,
            locale,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('Refine error:', err);
        return json({ error: 'Refinement failed' }, { status: 500 });
    }
}

export async function GET({ platform, locals, url }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = platform.env.DB_book;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

    const refinements = await db.prepare(
        'SELECT id, text_preview, refined_text, locale, created_at FROM refinements WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(user.id, limit).all();

    return json({ refinements: refinements.results });
}

export async function DELETE({ platform, locals, request }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = platform.env.DB_book;
    const { id } = await request.json();

    if (!id) return json({ error: 'Missing id' }, { status: 400 });

    const result = await db.prepare('DELETE FROM refinements WHERE id = ? AND user_id = ?').bind(id, user.id).run();

    if (result.meta.changes === 0) {
        return json({ error: 'Not found' }, { status: 404 });
    }

    return json({ success: true });
}
