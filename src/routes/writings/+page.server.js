import { redirect } from '@sveltejs/kit';

export async function load({ locals, params }) {
    if (!locals.user) throw redirect(302, '/login');

    const writing = await locals.db.prepare(
        'SELECT w.*, p.prompt_text, p.category as prompt_category FROM writings w LEFT JOIN writing_prompts p ON w.prompt_id = p.id WHERE w.id = ? AND w.user_id = ?'
    ).bind(params.writingId, locals.user.id).first();

    if (!writing) throw redirect(302, '/write');

    return { writing };
}

export const actions = {
    delete: async ({ request, locals, params }) => {
        if (!locals.user) throw redirect(302, '/login');

        await locals.db.prepare('DELETE FROM writings WHERE id = ? AND user_id = ?')
            .bind(params.writingId, locals.user.id).run();

        throw redirect(303, '/write');
    }
};
