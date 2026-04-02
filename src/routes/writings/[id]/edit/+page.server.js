import { redirect, error } from '@sveltejs/kit';

export async function load({ locals, params }) {
    if (!locals.user) throw redirect(302, '/login');

    const writing = await locals.db.prepare(
        'SELECT w.id, w.user_id, w.prompt_id, w.title, w.content, w.word_count, w.ai_assisted, w.visibility, w.status, w.created_at, w.updated_at, w.locale, w.category, p.prompt_text FROM writings w LEFT JOIN writing_prompts p ON w.prompt_id = p.id WHERE w.id = ? AND w.user_id = ?'
    ).bind(params.id, locals.user.id).first();

    if (!writing) throw error(404, 'Writing not found');

    return { writing };
};
