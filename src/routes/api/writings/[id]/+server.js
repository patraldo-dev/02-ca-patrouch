import { json } from '@sveltejs/kit';

export async function PUT({ request, locals, params }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { title, content, visibility, status } = await request.json();
    if (!title?.trim() || !content?.trim()) {
        return json({ error: 'Title and content are required' }, { status: 400 });
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
