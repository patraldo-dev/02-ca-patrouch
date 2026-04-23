import { json } from "@sveltejs/kit";
import { s as saveDraft } from "../../../../../chunks/writing-stats.js";
async function POST({ request, locals }) {
  const user = locals.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const db = locals.db;
  if (!db) return json({ error: "No database" }, { status: 503 });
  const { title, content, promptId, aiAssisted, visibility = "private", visualPromptText, visualArtworkUrl } = await request.json();
  if (!title?.trim() || !content?.trim()) {
    return json({ error: "Title and content required" }, { status: 400 });
  }
  try {
    const status = visibility === "public" ? "published" : "draft";
    const result = await saveDraft(db, user.id, {
      title: title.trim(),
      content: content.trim(),
      promptId,
      aiAssisted: aiAssisted || false
    });
    if (status === "published") {
      await db.prepare(
        "UPDATE writings SET status = 'published', visibility = 'public', visual_prompt_text = ?, visual_artwork_url = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(visualPromptText || null, visualArtworkUrl || null, result.id).run();
    }
    try {
      const ai = platform?.env?.AI;
      const vectorize = platform?.env?.VECTORIZE;
      if (ai && vectorize) {
        const writing2 = await db.prepare("SELECT id, title, content FROM writings WHERE id = ?").bind(result.id).first();
        if (writing2 && writing2.content) {
          const emb = await ai.run("@cf/baai/bge-m3", { text: [`${writing2.title}
${writing2.content}`] });
          const vec = emb?.data?.[0];
          if (vec) {
            await vectorize.upsert([{ id: writing2.id, values: vec, metadata: { title: writing2.title } }]);
          }
        }
      }
    } catch (idxErr) {
      console.error("Auto-index error:", idxErr);
    }
    if (status === "published" && result.content) {
      try {
        const text = ((result.title || "") + " " + result.content).toLowerCase();
        const textWords = new Set(text.match(new RegExp("\\p{L}{4,}", "gu")) || []);
        const { results: proposals } = await db.prepare(`
                    SELECT id, word, player_id, points_earned, match_count, decay_rate FROM bq_keyword_proposals
                    WHERE status = 'pending'
                `).all();
        if (proposals?.length) {
          const matchedHumanIds = /* @__PURE__ */ new Set();
          let totalHumanBonus = 0;
          for (const p of proposals) {
            const kw = p.word.toLowerCase();
            if (!textWords.has(kw)) continue;
            const decayed = Math.ceil(p.points_earned * Math.pow(p.decay_rate || 0.5, p.match_count || 0) * 1e5) / 1e5;
            const newCount = (p.match_count || 0) + 1;
            await db.prepare(
              `UPDATE bq_keyword_proposals SET match_count = ?, last_matched_at = datetime('now'), last_matched_writing_id = ? WHERE id = ?`
            ).bind(newCount, result.id, p.id).run();
            const player = await db.prepare(`SELECT type FROM bq_players WHERE id = ?`).bind(p.player_id).first();
            const isHuman = player?.type === "human";
            const isAuthor = p.player_id === result.user_id;
            if (isHuman && !isAuthor) {
              matchedHumanIds.add(p.player_id);
              totalHumanBonus += decayed;
              if (p.player_id !== writing.user_id) {
                await db.prepare(
                  `UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`
                ).bind(decayed * 2, decayed, p.player_id).run();
              }
            } else if (!isHuman) {
              await db.prepare(
                `UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`
              ).bind(decayed, decayed / 2, p.player_id).run();
            }
          }
          if (totalHumanBonus > 0) {
            const { results: teamHumans } = await db.prepare(`SELECT id FROM bq_players WHERE type = 'human' AND solo = 0`).all();
            if (teamHumans?.length) {
              for (const h of teamHumans) {
                await db.prepare(`UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`).bind(totalHumanBonus, Math.floor(totalHumanBonus / 2), h.id).run();
              }
            }
          }
        }
      } catch (matchErr) {
        console.error("Keyword matching error:", matchErr);
      }
    }
    return json({ id: result.id, wordCount: result.wordCount, status });
  } catch (err) {
    console.error("Save writing error:", err);
    return json({ error: err.message }, { status: 500 });
  }
}
export {
  POST
};
