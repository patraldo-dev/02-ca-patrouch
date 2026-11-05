// src/routes/projects/[id]/+page.server.js — a project (serial/collection):
// cover info + ordered parts. Owner also sees drafts-in-progress.
import { error } from '@sveltejs/kit';

export async function load({ locals, params }) {
    const db = locals.db;

    const project = await db
        .prepare(
            `SELECT p.id, p.title, p.description, p.locale, p.kind, p.created_at, p.user_id,
                    u.displayUsername AS author_name
             FROM projects p LEFT JOIN users u ON u.id = p.user_id
             WHERE p.id = ?`
        )
        .bind(params.id)
        .first();

    if (!project) throw error(404, 'Project not found');

    const isOwner = locals.user?.id === project.user_id;
    // Serials read in project_order; collections are unordered — by date.
    const order = project.kind === 'collection' ? 'created_at ASC' : 'project_order ASC';
    const partsRes = await db
        .prepare(
            `SELECT id, title, word_count, status, created_at, project_order
             FROM writings WHERE project_id = ?
             ${isOwner ? '' : "AND status = 'published' AND visibility = 'public'"}
             ORDER BY ${order}`
        )
        .bind(params.id)
        .all();
    const parts = partsRes.results || [];

    let following = false;
    if (locals.user && !isOwner) {
        const f = await db
            .prepare('SELECT id FROM project_follows WHERE project_id = ? AND user_id = ?')
            .bind(params.id, locals.user.id)
            .first();
        following = !!f;
    }

    return { project, parts, isOwner, following };
}
