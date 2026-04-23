import { redirect, fail } from "@sveltejs/kit";
async function load({ locals, url }) {
  if (!locals.user) throw redirect(302, "/login");
  const promptId = url.searchParams.get("promptId") || null;
  let prompt = null;
  if (promptId) {
    console.log("📝 write/new load - promptId:", promptId);
    prompt = await locals.db.prepare(
      "SELECT id, prompt_text, category FROM writing_prompts WHERE id = ?"
    ).bind(promptId).first();
    console.log("📝 prompt found:", prompt ? "YES" : "NO", prompt ? prompt.prompt_text?.slice(0, 50) : "");
  } else {
    console.log("📝 write/new load - no promptId (free writing)");
  }
  return { user: locals.user, prompt };
}
const actions = {
  publish: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, "/login");
    const data = await request.formData();
    const title = data.get("title")?.trim();
    const content = data.get("content")?.trim();
    const promptId = data.get("promptId") || null;
    const aiAssisted = data.get("aiAssisted") === "on";
    const visibility = data.get("visibility") || "private";
    if (!title || !content) {
      return fail(400, { error: "Title and content are required", title, content, visibility });
    }
    const id = crypto.randomUUID();
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    await locals.db.prepare(
      `INSERT INTO writings (id, user_id, prompt_id, title, content, word_count, ai_assisted, visibility, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'), datetime('now'))`
    ).bind(id, locals.user.id, promptId, title, content, wordCount, aiAssisted ? 1 : 0, visibility).run();
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const yesterday = (() => {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })();
    const existing = await locals.db.prepare("SELECT * FROM user_writing_stats WHERE user_id = ?").bind(locals.user.id).first();
    if (existing) {
      let streak = existing.current_streak || 0;
      let longest = existing.longest_streak || 0;
      if (existing.last_writing_date === today) ;
      else if (existing.last_writing_date === yesterday) streak += 1;
      else streak = 1;
      if (streak > longest) longest = streak;
      await locals.db.prepare(
        `UPDATE user_writing_stats SET total_writings = total_writings + 1, total_words = total_words + ?,
                 current_streak = ?, longest_streak = ?, last_writing_date = ?, updated_at = datetime('now')
                 WHERE user_id = ?`
      ).bind(wordCount, streak, longest, today, locals.user.id).run();
    } else {
      await locals.db.prepare(
        `INSERT INTO user_writing_stats (user_id, total_writings, total_words, current_streak, longest_streak, prompts_accepted, prompts_passed, last_writing_date, updated_at)
                 VALUES (?, 1, ?, 1, 1, 0, 0, ?, datetime('now'))`
      ).bind(locals.user.id, wordCount, today).run();
    }
    throw redirect(303, "/write");
  },
  draft: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, "/login");
    const data = await request.formData();
    const title = data.get("title")?.trim() || "Untitled Draft";
    const content = data.get("content")?.trim() || "";
    const promptId = data.get("promptId") || null;
    const aiAssisted = data.get("aiAssisted") === "on";
    const id = crypto.randomUUID();
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    await locals.db.prepare(
      `INSERT INTO writings (id, user_id, prompt_id, title, content, word_count, ai_assisted, visibility, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'private', 'draft', datetime('now'), datetime('now'))`
    ).bind(id, locals.user.id, promptId, title, content, wordCount, aiAssisted ? 1 : 0).run();
    return { saved: true };
  }
};
export {
  actions,
  load
};
