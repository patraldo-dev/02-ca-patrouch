// src/routes/api/projects/[id]/follow/+server.js — toggle follow.
// Followers get a notification when the project's next part publishes.
import { json } from '@sveltejs/kit';

export async function POST({ locals, params }) {
    const user = locals?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    if (!['member', 'admin'].includes(user.role || '')) {
        return json({ error: 'Members only' }, { status: 403 });
    }

    const project = await locals.db
        .prepare('SELECT id, user_id FROM projects WHERE id = ?')
        .bind(params.id)
        .first();
    if (!project) return json({ error: 'Not found' }, { status: 404 });
    if (project.user_id === user.id) {
        return json({ error: 'Own project' }, { status: 400 });
    }

    const existing = await locals.db
        .prepare('SELECT id FROM project_follows WHERE project_id = ? AND user_id = ?')
        .bind(params.id, user.id)
        .first();

    try {
        if (existing) {
            await locals.db
                .prepare('DELETE FROM project_follows WHERE id = ?')
                .bind(existing.id)
                .run();
            return json({ following: false });
        }
        await locals.db
            .prepare('INSERT INTO project_follows (id, project_id, user_id) VALUES (?, ?, ?)')
            .bind(crypto.randomUUID(), params.id, user.id)
            .run();
        return json({ following: true });
    } catch (e) {
        console.error('[projects] follow failed:', e.message);
        return json({ error: 'Could not update follow' }, { status: 500 });
    }
}
