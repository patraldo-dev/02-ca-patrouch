import { redirect, error } from '@sveltejs/kit';

export async function load({ locals, params }) {
    if (!locals.user) throw redirect(302, '/login');

    try {
        const writing = await locals.db.prepare(
            'SELECT w.id, w.user_id, w.prompt_id, w.title, w.content, w.word_count, w.ai_assisted, w.visibility, w.status, w.created_at, w.updated_at, w.locale, w.category, p.prompt_text, p.category as prompt_category FROM writings w LEFT JOIN writing_prompts p ON w.prompt_id = p.id WHERE w.id = ? AND w.user_id = ?'
        ).bind(params.id, locals.user.id).first();

        if (!writing) throw redirect(302, '/write');

        return { writing };
    } catch (e) {
        if (e.status) throw e; // re-throw redirects/errors
        console.error('Writing load error:', e.message);
        throw error(500, 'Failed to load writing');
    }
};

export const actions = {
    delete: async ({ request, locals, params }) => {
        if (!locals.user) throw redirect(302, '/login');

        await locals.db.prepare('DELETE FROM writings WHERE id = ? AND user_id = ?')
            .bind(params.id, locals.user.id).run();

        throw redirect(303, '/write');
    }
};
