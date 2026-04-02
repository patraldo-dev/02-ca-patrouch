import { redirect, error } from '@sveltejs/kit';

export async function load({ locals, params }) {
    try {
        // Get the writing — don't filter by user so anyone can view public writings
        const writing = await locals.db.prepare(
            'SELECT w.id, w.user_id, w.prompt_id, w.title, w.content, w.word_count, w.ai_assisted, w.visibility, w.status, w.created_at, w.updated_at, w.locale, w.category, p.prompt_text, p.category as prompt_category, u.username, u.show_profile FROM writings w LEFT JOIN writing_prompts p ON w.prompt_id = p.id LEFT JOIN users u ON w.user_id = u.id WHERE w.id = ?'
        ).bind(params.id).first();

        if (!writing) throw error(404, 'Writing not found');

        // Private writings only visible to owner
        if (writing.visibility === 'private' && (!locals.user || locals.user.id !== writing.user_id)) {
            throw error(404, 'Writing not found');
        }

        return { writing };
    } catch (e) {
        if (e.status) throw e;
        console.error('Writing load error:', e.message);
        throw error(500, 'Failed to load writing');
    }
};
