import { json } from '@sveltejs/kit';

export async function PUT({ request, locals, params }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, content, visibility, status } = body;

    // If only updating status/visibility (publish/unpublish), skip title/content validation
    const isStatusUpdate = !title && !content;

    if (!isStatusUpdate && (!title?.trim() || !content?.trim())) {
        return json({ error: 'Title and content are required' }, { status: 400 });
    }

    if (isStatusUpdate) {
        // Just update status and/or visibility
        const sets = [];
        const values = [];
        if (status) { sets.push('status = ?'); values.push(status); }
        if (visibility) { sets.push('visibility = ?'); values.push(visibility); }
        sets.push("updated_at = datetime('now')");
        values.push(params.id, locals.user.id);

        await locals.db.prepare(
            `UPDATE writings SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`
        ).bind(...values).run();

        return json({ success: true });
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    await locals.db.prepare(
        "UPDATE writings SET title = ?, content = ?, word_count = ?, visibility = ?, status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
    ).bind(title.trim(), content.trim(), wordCount, visibility || 'public', status || 'draft', params.id, locals.user.id).run();

    return json({ success: true, wordCount });
}

export async function DELETE({ request, locals, params }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    await locals.db.prepare('DELETE FROM writings WHERE id = ? AND user_id = ?')
        .bind(params.id, locals.user.id).run();

    return json({ success: true });
}
