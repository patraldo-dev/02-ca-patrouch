// /prompt/[id] — the revisit view: one daily stimulus and everything the
// community has published against it. Pieces link to their writings; the
// CTA hands the prompt to /write (same continue_prompt handoff as the
// piece view) so anyone can add to the family.
import { error } from '@sveltejs/kit';

export async function load({ locals, params }) {
    const prompt = await locals.db.prepare(
        'SELECT id, prompt_text, prompt_date, category, locale FROM writing_prompts WHERE id = ?'
    ).bind(params.id).first();

    if (!prompt) throw error(404, 'Prompt not found');

    const writings = await locals.db.prepare(
        `SELECT w.id, w.title, w.content, w.created_at, w.word_count, w.user_id,
                u.username, u.display_name, u.show_profile
         FROM writings w LEFT JOIN users u ON w.user_id = u.id
         WHERE w.prompt_id = ? AND w.status = 'published' AND w.visibility = 'public'
         ORDER BY w.created_at ASC`
    ).bind(params.id).all();

    return {
        prompt,
        writings: writings.results || []
    };
}
