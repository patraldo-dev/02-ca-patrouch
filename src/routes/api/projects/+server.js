// src/routes/api/projects/+server.js — Projects v1 (serials/collections).
// GET  = the signed-in member's projects (for the editor picker).
// POST = create a project. Strictly v1 scope: title + description, that's it.
import { json } from '@sveltejs/kit';

function gate(user) {
    if (!user) return 401;
    if (!['member', 'admin'].includes(user.role || '')) return 403;
    return 0;
}

export async function GET({ locals }) {
    const denied = gate(locals?.user);
    if (denied) return json({ error: 'Unauthorized' }, { status: denied });
    try {
        const { results } = await locals.db
            .prepare(
                `SELECT p.id, p.title, p.description, p.locale, p.kind,
                        (SELECT COUNT(*) FROM writings w WHERE w.project_id = p.id) AS part_count
                 FROM projects p WHERE p.user_id = ?
                 ORDER BY p.updated_at DESC`
            )
            .bind(locals.user.id)
            .all();
        return json({ projects: results || [] });
    } catch (e) {
        console.error('[projects] list failed:', e.message);
        return json({ error: 'Could not load projects' }, { status: 500 });
    }
}

export async function POST({ locals, request }) {
    const denied = gate(locals?.user);
    if (denied) return json({ error: 'Unauthorized' }, { status: denied });

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request' }, { status: 400 });
    }
    const title = String(body.title || '').trim().slice(0, 120);
    if (!title) return json({ error: 'Title required' }, { status: 400 });
    const description = String(body.description || '').trim().slice(0, 500) || null;
    const locale = ['en', 'es', 'fr'].includes(body.locale) ? body.locale : 'es';
    const kind = body.kind === 'collection' ? 'collection' : 'serial';
    // Optional seed pieces (AI gather uses this): ids must belong to the
    // author — enforced in the UPDATE's WHERE, not trusted from the client.
    const writingIds = Array.isArray(body.writing_ids)
        ? body.writing_ids.filter((w) => typeof w === 'string').slice(0, 80)
        : [];

    const id = crypto.randomUUID();
    try {
        await locals.db
            .prepare('INSERT INTO projects (id, user_id, title, description, locale, kind) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(id, locals.user.id, title, description, locale, kind)
            .run();
        if (writingIds.length) {
            for (let i = 0; i < writingIds.length; i++) {
                await locals.db
                    .prepare('UPDATE writings SET project_id = ?, project_order = ? WHERE id = ? AND user_id = ?')
                    .bind(id, kind === 'serial' ? i + 1 : null, writingIds[i], locals.user.id)
                    .run();
            }
        }
    } catch (e) {
        console.error('[projects] create failed:', e.message);
        return json({ error: 'Could not create project' }, { status: 500 });
    }
    return json({ id, title, kind });
}
