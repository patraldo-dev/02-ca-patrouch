// /projects — the member's serials and collections, plus the AI gatherer.
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    if (!locals.user) throw redirect(302, '/login');

    const { results } = await locals.db
        .prepare(
            `SELECT p.id, p.title, p.description, p.kind, p.locale,
                    (SELECT COUNT(*) FROM writings w WHERE w.project_id = p.id) AS piece_count
             FROM projects p WHERE p.user_id = ?
             ORDER BY p.updated_at DESC`
        )
        .bind(locals.user.id)
        .all();

    const all = results || [];
    return {
        serials: all.filter((p) => p.kind !== 'collection'),
        collections: all.filter((p) => p.kind === 'collection')
    };
}
