import { redirect, error, fail } from '@sveltejs/kit';

export async function load({ locals, params }) {
    if (!locals.user) throw redirect(302, '/login');

    const writing = await locals.db.prepare(
        'SELECT w.id, w.user_id, w.prompt_id, w.title, w.content, w.word_count, w.ai_assisted, w.visibility, w.status, w.created_at, w.updated_at, w.locale, w.category, p.prompt_text FROM writings w LEFT JOIN writing_prompts p ON w.prompt_id = p.id WHERE w.id = ? AND w.user_id = ?'
    ).bind(params.id, locals.user.id).first();

    if (!writing) throw error(404, 'Writing not found');

    return { writing };
};

export const actions = {
    save: async ({ request, locals, params }) => {
        if (!locals.user) throw redirect(302, '/login');
        const data = await request.formData();
        const title = data.get('title')?.toString().trim();
        const content = data.get('content')?.toString().trim();
        const visibility = data.get('visibility')?.toString() || 'public';

        if (!title || !content) {
            return fail(400, { error: 'Title and content are required' });
        }

        const wordCount = content.split(/\s+/).filter(Boolean).length;

        await locals.db.prepare(
            'UPDATE writings SET title = ?, content = ?, word_count = ?, visibility = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?'
        ).bind(title, content, wordCount, visibility, 'draft', params.id, locals.user.id).run();

        return { success: true };
    },

    publish: async ({ request, locals, params }) => {
        if (!locals.user) throw redirect(302, '/login');
        const data = await request.formData();
        const title = data.get('title')?.toString().trim();
        const content = data.get('content')?.toString().trim();
        const visibility = data.get('visibility')?.toString() || 'public';

        if (!title || !content) {
            return fail(400, { error: 'Title and content are required' });
        }

        const wordCount = content.split(/\s+/).filter(Boolean).length;

        await locals.db.prepare(
            'UPDATE writings SET title = ?, content = ?, word_count = ?, visibility = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?'
        ).bind(title, content, wordCount, visibility, 'published', params.id, locals.user.id).run();

        return { success: true, published: true };
    }
};
