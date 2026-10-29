import { json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

// Canonical state pairs — status and visibility are always written together
// so they can never disagree: published↔public, draft↔private.
function resolvePair(status, visibility) {
    if (status && visibility) {
        const ok = (status === 'published' && visibility === 'public') ||
                   (status === 'draft' && visibility === 'private');
        if (!ok) return { error: 'status and visibility must be a coherent pair: published/public or draft/private' };
        return { status, visibility };
    }
    if (status) {
        return { status, visibility: status === 'published' ? 'public' : 'private' };
    }
    if (visibility) {
        return { status: visibility === 'public' ? 'published' : 'draft', visibility };
    }
    return {};
}

export async function PUT({ request, locals, params }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, content, visibility, status, manuscript_url } = body;

    // If only updating status/visibility (publish/unpublish), skip title/content validation
    const isStatusUpdate = !title && !content;

    if (!isStatusUpdate && (!title?.trim() || !content?.trim())) {
        return json({ error: 'Title and content are required' }, { status: 400 });
    }

    if (isStatusUpdate) {
        // Publish/unpublish: derive the full pair; one UPDATE sets both.
        const pair = resolvePair(status, visibility);
        if (pair.error) return json({ error: pair.error }, { status: 400 });
        if (!pair.status) {
            return json({ error: 'Nothing to update' }, { status: 400 });
        }

        await locals.db.prepare(
            "UPDATE writings SET status = ?, visibility = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
        ).bind(pair.status, pair.visibility, params.id, locals.user.id).run();

        return json({ success: true, status: pair.status, visibility: pair.visibility });
    }

    // Full save: when neither field is sent, preserve the current pair rather
    // than assuming defaults (the old `|| 'public'` fallback produced drift).
    let pair = resolvePair(status, visibility);
    if (pair.error) return json({ error: pair.error }, { status: 400 });
    if (!pair.status) {
        const current = await locals.db
            .prepare('SELECT status, visibility FROM writings WHERE id = ? AND user_id = ?')
            .bind(params.id, locals.user.id)
            .first();
        pair = { status: current?.status || 'draft', visibility: current?.visibility || 'private' };
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    if (manuscript_url) {
        await locals.db.prepare('UPDATE writings SET manuscript_url = ? WHERE id = ? AND user_id = ?')
            .bind(manuscript_url, params.id, locals.user.id).run().catch(() => {});
    }

    await locals.db.prepare(
        "UPDATE writings SET title = ?, content = ?, word_count = ?, visibility = ?, status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
    ).bind(title.trim(), content.trim(), wordCount, pair.visibility, pair.status, params.id, locals.user.id).run();

    return json({ success: true, wordCount, status: pair.status, visibility: pair.visibility });
}

export async function DELETE({ request, locals, params, platform }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    await locals.db.prepare('DELETE FROM writings WHERE id = ? AND user_id = ?')
        .bind(params.id, locals.user.id).run();

    // Remove from Vectorize
    try {
        const vectorize = env?.VECTORIZE;
        if (vectorize) await vectorize.deleteByIds([params.id]);
    } catch (e) {
        console.error('Vectorize delete error:', e);
    }

    return json({ success: true });
}
