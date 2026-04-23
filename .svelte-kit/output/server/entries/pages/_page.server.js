import "@sveltejs/kit";
async function load({ locals }) {
  const db = locals?.db;
  locals?.platform?.env?.AI;
  const user = locals?.user || null;
  let pastPrompts = [];
  if (db) {
    try {
      const { results } = await db.prepare(`
                SELECT id, prompt_text, locale, created_at
                FROM writing_prompts
                WHERE category = 'daily-community'
                  AND created_at < datetime('now')
                ORDER BY created_at DESC
                LIMIT 14
            `).all();
      pastPrompts = (results || []).map((p) => ({
        ...p,
        dateLabel: new Date(p.created_at.replace(" ", "T")).toLocaleDateString(
          locals.locale === "fr" ? "fr-FR" : locals.locale === "en" ? "en-US" : "es-MX",
          { month: "short", day: "numeric" }
        )
      }));
    } catch (e) {
    }
  }
  return { user, pastPrompts };
}
export {
  load
};
