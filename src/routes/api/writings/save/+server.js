// src/routes/api/writings/save/+server.js
import { json } from '@sveltejs/kit';
import { saveDraft } from '$lib/server/writing-stats.js';

export async function POST({ request, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    const db = locals.db;
    if (!db) return json({ error: 'No database' }, { status: 503 });

    const { title, content, promptId, aiAssisted, visibility = 'private' } = await request.json();

    if (!title?.trim() || !content?.trim()) {
        return json({ error: 'Title and content required' }, { status: 400 });
    }

    try {
        const status = visibility === 'public' ? 'published' : 'draft';
        const result = await saveDraft(db, user.id, {
            title: title.trim(),
            content: content.trim(),
            promptId,
            aiAssisted: aiAssisted || false
        });

        // If publishing, update status and visibility
        if (status === 'published') {
            await db.prepare(
                "UPDATE writings SET status = 'published', visibility = 'public', updated_at = datetime('now') WHERE id = ?"
            ).bind(result.id).run();

            // Auto-index into Vectorize
            try {
                const ai = platform?.env?.AI;
                const vectorize = platform?.env?.VECTORIZE;
                if (ai && vectorize) {
                    const writing = await db.prepare('SELECT id, title, content FROM writings WHERE id = ?').bind(result.id).first();
                    if (writing) {
                        const emb = await ai.run('@cf/baai/bge-m3', { text: [`${writing.title}\n${writing.content || ''}`] });
                        const vec = emb?.data?.[0];
                        if (vec) {
                            await vectorize.upsert([{ id: writing.id, values: vec, metadata: { title: writing.title } }]);
                        }
                    }
                }
            } catch (idxErr) {
                console.error('Auto-index error:', idxErr);
            }
        }

        return json({ id: result.id, wordCount: result.wordCount, status });
    } catch (err) {
        console.error('Save writing error:', err);
        return json({ error: err.message }, { status: 500 });
    }
}
