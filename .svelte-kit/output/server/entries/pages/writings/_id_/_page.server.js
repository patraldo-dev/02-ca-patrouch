import { error } from "@sveltejs/kit";
async function load({ locals, params }) {
  try {
    const writing = await locals.db.prepare(
      "SELECT w.id, w.user_id, w.prompt_id, w.title, w.content, w.word_count, w.ai_assisted, w.visibility, w.status, w.created_at, w.updated_at, w.locale, w.category, w.allow_comments, w.visual_prompt_text, w.visual_artwork_url, p.prompt_text, p.category as prompt_category, u.username, u.show_profile, u.role FROM writings w LEFT JOIN writing_prompts p ON w.prompt_id = p.id LEFT JOIN users u ON w.user_id = u.id WHERE w.id = ?"
    ).bind(params.id).first();
    if (!writing) throw error(404, "Writing not found");
    if (writing.visibility === "private" && (!locals.user || locals.user.id !== writing.user_id)) {
      throw error(404, "Writing not found");
    }
    return { writing, user: locals.user || null };
  } catch (e) {
    if (e.status) throw e;
    console.error("Writing load error:", e.message);
    throw error(500, "Failed to load writing");
  }
}
export {
  load
};
