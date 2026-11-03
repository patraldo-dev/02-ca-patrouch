import { redirect, error } from '@sveltejs/kit';

export async function load({ locals, params }) {
    try {
        // Get the writing — don't filter by user so anyone can view public writings
        const writing = await locals.db.prepare(
            'SELECT w.id, w.user_id, w.prompt_id, w.title, w.content, w.word_count, w.ai_assisted, w.visibility, w.status, w.created_at, w.updated_at, w.locale, w.category, w.allow_comments, w.visual_prompt_text, w.visual_artwork_url, w.manuscript_url, w.project_id, p.prompt_text, p.category as prompt_category, u.username, u.show_profile, u.role FROM writings w LEFT JOIN writing_prompts p ON w.prompt_id = p.id LEFT JOIN users u ON w.user_id = u.id WHERE w.id = ?'
        ).bind(params.id).first();

        if (!writing) throw error(404, 'Writing not found');

        // Private writings only visible to owner
        if (writing.visibility === 'private' && (!locals.user || locals.user.id !== writing.user_id)) {
            throw error(404, 'Writing not found');
        }

        // Projects v1: part number + prev/next navigation when in a project.
        let project = null;
        if (writing.project_id) {
            try {
                const proj = await locals.db
                    .prepare('SELECT id, title FROM projects WHERE id = ?')
                    .bind(writing.project_id)
                    .first();
                if (proj) {
                    const partsRes = await locals.db
                        .prepare(
                            "SELECT id, project_order FROM writings WHERE project_id = ? AND status = 'published' AND visibility = 'public' ORDER BY project_order ASC"
                        )
                        .bind(writing.project_id)
                        .all();
                    const parts = partsRes.results || [];
                    const idx = parts.findIndex((x) => x.id === writing.id);
                    project = {
                        id: proj.id,
                        title: proj.title,
                        partNumber: idx >= 0 ? idx + 1 : null,
                        totalParts: parts.length,
                        prevId: idx > 0 ? parts[idx - 1].id : null,
                        nextId: idx >= 0 && idx < parts.length - 1 ? parts[idx + 1].id : null
                    };
                }
            } catch (e) {
                console.error('Project load error:', e.message);
            }
        }

        return { writing, project, user: locals.user || null };
    } catch (e) {
        if (e.status) throw e;
        console.error('Writing load error:', e.message);
        throw error(500, 'Failed to load writing');
    }
};
