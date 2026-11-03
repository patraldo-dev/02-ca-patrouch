// src/routes/api/writings/save/+server.js
import { json } from "@sveltejs/kit";
import { saveDraft, adjustWordCount } from "#lib/server/writing-stats.js";
import { notify } from "#lib/server/notify.js";
import { env } from 'cloudflare:workers';

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "out",
  "off",
  "over",
  "under",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "because",
  "but",
  "and",
  "or",
  "if",
  "while",
  "about",
  "up",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "he",
  "him",
  "his",
  "she",
  "her",
  "they",
  "them",
  "their",
  "what",
  "which",
  "who",
  "whom",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "es",
  "son",
  "era",
  "ser",
  "estar",
  "estaba",
  "tiene",
  "tienen",
  "puede",
  "hacer",
  "que",
  "de",
  "en",
  "por",
  "para",
  "con",
  "sin",
  "sobre",
  "entre",
  "hacia",
  "desde",
  "como",
  "pero",
  "mas",
  "muy",
  "ya",
  "no",
  "si",
  "o",
  "y",
  "a",
  "se",
  "su",
  "sus",
  "mi",
  "tu",
  "nos",
  "les",
  "le",
  "lo",
  "este",
  "esta",
  "ese",
  "esa",
  "donde",
  "cuando",
  "porque",
  "le",
  "la",
  "les",
  "des",
  "une",
  "sont",
  "était",
  "être",
  "avoir",
  "ont",
  "fait",
  "peut",
  "dans",
  "pour",
  "sur",
  "avec",
  "sans",
  "entre",
  "vers",
  "depuis",
  "comme",
  "mais",
  "plus",
  "moins",
  "très",
  "déjà",
  "non",
  "ou",
  "et",
  "son",
  "sa",
  "ses",
  "mon",
  "notre",
  "votre",
  "leur",
  "ce",
  "cette",
  "ces",
  "où",
  "quand",
  "comment",
  "aussi",
  "that",
  "been",
  "were",
  "said",
  "just",
  "into",
  "could",
  "would",
  "them",
  "than",
  "their",
  "which",
  "about",
  "upon",
  "shall",
]);

export async function POST({ request, locals }) {
  const user = locals.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const db = locals.db;
  if (!db) return json({ error: "No database" }, { status: 503 });

  const {
    id,
    title,
    content,
    promptId,
    aiAssisted,
    visibility = "private",
    status: statusPref,
    newDraft,
    visualPromptText,
    visualArtworkUrl,
    manuscriptUrl,
    projectId,
  } = await request.json();

  if (!title?.trim() || !content?.trim()) {
    return json({ error: "Title and content required" }, { status: 400 });
  }

  try {
    // Publish intent: honor an explicit status field; otherwise derive from
    // visibility (the editor's publish button sends visibility only).
    const wantsPublish = statusPref
      ? statusPref === "published"
      : visibility === "public";

    // ── Resolve the target row: saving must never fork a draft. ──
    // 1. Explicit id (client tracked its draft) → must exist and be owned.
    // 2. Otherwise adopt the user's latest draft for this prompt, so a reload
    //    or stale client still updates in place. newDraft opts out (the
    //    "write something new" flow intentionally starts a fresh row).
    // 3. Else create the first draft.
    let existing = null;
    if (id) {
      existing = await db
        .prepare(
          "SELECT id, word_count, status, visibility FROM writings WHERE id = ? AND user_id = ?",
        )
        .bind(id, user.id)
        .first();
      if (!existing) {
        return json({ error: "Writing not found" }, { status: 404 });
      }
    } else if (promptId && !newDraft) {
      existing = await db
        .prepare(
          "SELECT id, word_count, status, visibility FROM writings WHERE user_id = ? AND prompt_id = ? AND status = 'draft' ORDER BY updated_at DESC LIMIT 1",
        )
        .bind(user.id, promptId)
        .first();
    }

    let result;
    if (existing) {
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
      await db
        .prepare(
          `UPDATE writings SET title = ?, content = ?, word_count = ?, ai_assisted = ?,
             visual_prompt_text = COALESCE(?, visual_prompt_text),
             visual_artwork_url = COALESCE(?, visual_artwork_url),
             updated_at = datetime('now')
           WHERE id = ? AND user_id = ?`,
        )
        .bind(
          title.trim(),
          content.trim(),
          wordCount,
          aiAssisted ? 1 : 0,
          visualPromptText || null,
          visualArtworkUrl || null,
          existing.id,
          user.id,
        )
        .run();
      // Saving an edit is not a new writing — only apply the word delta.
      try {
        await adjustWordCount(db, user.id, wordCount - (existing.word_count || 0));
      } catch (e) {
        console.error("Word delta adjust failed:", e);
      }
      result = { id: existing.id, wordCount };
    } else {
      result = await saveDraft(db, user.id, {
        title: title.trim(),
        content: content.trim(),
        promptId,
        aiAssisted: aiAssisted || false,
        visualPromptText,
        visualArtworkUrl,
      });
    }

    // Phase 3: optionally attach the kept manuscript facsimile to this writing.
    if (manuscriptUrl) {
      try {
        await db
          .prepare('UPDATE writings SET manuscript_url = ? WHERE id = ? AND user_id = ?')
          .bind(manuscriptUrl, result.id, user.id)
          .run();
      } catch (e) {
        console.error('[handwriting] attach failed:', e.message);
      }
    }

    // Projects v1: assign to a serial/collection. Order appends when the
    // writing joins (or switches) projects; re-saving keeps its slot.
    if (projectId !== undefined) {
      const pid = typeof projectId === 'string' && projectId ? projectId : null;
      if (pid) {
        const proj = await db
          .prepare('SELECT id, user_id FROM projects WHERE id = ?')
          .bind(pid)
          .first();
        if (!proj || proj.user_id !== user.id) {
          return json({ error: 'Project not found' }, { status: 400 });
        }
      }
      const cur = await db
        .prepare('SELECT project_id, project_order FROM writings WHERE id = ?')
        .bind(result.id)
        .first();
      let order = null;
      if (pid) {
        if (cur?.project_id === pid && cur.project_order != null) {
          order = cur.project_order;
        } else {
          const mx = await db
            .prepare('SELECT MAX(project_order) AS m FROM writings WHERE project_id = ?')
            .bind(pid)
            .first();
          order = (mx?.m || 0) + 1;
        }
      }
      await db
        .prepare('UPDATE writings SET project_id = ?, project_order = ? WHERE id = ? AND user_id = ?')
        .bind(pid, order, result.id, user.id)
        .run();
      if (pid) {
        await db
          .prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?")
          .bind(pid)
          .run();
      }
    }

    // If publishing, set the canonical pair in a single statement.
    const prior = await db
      .prepare('SELECT status, project_id, project_order, title FROM writings WHERE id = ?')
      .bind(result.id)
      .first();
    if (wantsPublish) {
      await db
        .prepare(
          "UPDATE writings SET status = 'published', visibility = 'public', visual_prompt_text = ?, visual_artwork_url = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
        )
        .bind(visualPromptText || null, visualArtworkUrl || null, result.id, user.id)
        .run();
    }

    // Freshly published part of a project → notify followers (never the author).
    if (wantsPublish && prior?.status !== 'published' && prior?.project_id) {
      try {
        const proj = await db
          .prepare('SELECT title FROM projects WHERE id = ?')
          .bind(prior.project_id)
          .first();
        const authorName = user.displayUsername || user.name || '';
        const { results: followers } = await db
          .prepare('SELECT user_id FROM project_follows WHERE project_id = ? AND user_id != ?')
          .bind(prior.project_id, user.id)
          .all();
        for (const f of followers || []) {
          await notify(db, {
            user_id: f.user_id,
            type: 'project_part',
            title: `«${proj?.title || ''}» — nueva parte`,
            body: `${authorName} publicó «${prior.title}» (parte ${prior.project_order})`,
            meta: { project_id: prior.project_id, writing_id: result.id },
          });
        }
      } catch (e) {
        console.error('[projects] notify failed:', e.message);
      }
    }

    // Index into Vectorize (both drafts and published)
    try {
      const ai = env?.AI;
      const vectorize = env?.VECTORIZE;
      if (ai && vectorize) {
        const writing = await db
          .prepare("SELECT id, title, content FROM writings WHERE id = ?")
          .bind(result.id)
          .first();
        if (writing && writing.content) {
          const emb = await ai.run("@cf/baai/bge-m3", {
            text: [`${writing.title}\n${writing.content}`],
          });
          const vec = emb?.data?.[0];
          if (vec) {
            await vectorize.upsert([
              {
                id: writing.id,
                values: vec,
                metadata: { title: writing.title },
              },
            ]);
          }
        }
      }
    } catch (idxErr) {
      console.error("Auto-index error:", idxErr);
    }

    // Auto-extract keywords for Bottle Quest when publishing
    if (wantsPublish && result.content) {
      // Check if any active keyword proposals match this writing
      // Decay model: points halve with each match, 5 decimal precision
      // Words never expire, just lose force
      try {
        const text = (
          (result.title || "") +
          " " +
          result.content
        ).toLowerCase();
        const textWords = new Set(text.match(/\p{L}{4,}/gu) || []);

        const { results: proposals } = await db
          .prepare(
            `
                    SELECT id, word, player_id, points_earned, match_count, decay_rate FROM bq_keyword_proposals
                    WHERE status = 'pending'
                `,
          )
          .all();

        if (proposals?.length) {
          const matchedHumanIds = new Set();
          let totalHumanBonus = 0;

          for (const p of proposals) {
            const kw = p.word.toLowerCase();
            if (!textWords.has(kw)) continue;

            // Decay: base * 0.5^match_count
            const decayed =
              Math.ceil(
                p.points_earned *
                  Math.pow(p.decay_rate || 0.5, p.match_count || 0) *
                  100000,
              ) / 100000;
            const newCount = (p.match_count || 0) + 1;

            await db
              .prepare(
                `UPDATE bq_keyword_proposals SET match_count = ?, last_matched_at = datetime('now'), last_matched_writing_id = ? WHERE id = ?`,
              )
              .bind(newCount, result.id, p.id)
              .run();

            const player = await db
              .prepare(`SELECT type FROM bq_players WHERE id = ?`)
              .bind(p.player_id)
              .first();
            const isHuman = player?.type === "human";
            const isAuthor = p.player_id === result.user_id;

            if (isHuman && !isAuthor) {
              matchedHumanIds.add(p.player_id);
              totalHumanBonus += decayed;
              // Contributor gets DOUBLE (always, even solo)
              if (p.player_id !== writing.user_id) {
                await db
                  .prepare(
                    `UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`,
                  )
                  .bind(decayed * 2, decayed, p.player_id)
                  .run();
              }
            } else if (!isHuman) {
              await db
                .prepare(
                  `UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`,
                )
                .bind(decayed, decayed / 2, p.player_id)
                .run();
            }
          }

          // Cooperative bonus: only TEAM players (solo = 0)
          if (totalHumanBonus > 0) {
            const { results: teamHumans } = await db
              .prepare(
                `SELECT id FROM bq_players WHERE type = 'human' AND solo = 0`,
              )
              .all();
            if (teamHumans?.length) {
              for (const h of teamHumans) {
                await db
                  .prepare(
                    `UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`,
                  )
                  .bind(totalHumanBonus, Math.floor(totalHumanBonus / 2), h.id)
                  .run();
              }
            }
          }
        }
      } catch (matchErr) {
        console.error("Keyword matching error:", matchErr);
      }
    } // end if published

    // ── Portal reindex: fire-and-forget after publish ──
    // Triggers portal count updates + potential new portal discovery
    if (wantsPublish) {
      try {
        const reindexUrl = new URL("/api/portals/reindex", request.url);
        fetch(reindexUrl, { method: "POST" }).catch(() => {});
      } catch {}
    }

    return json({ id: result.id, wordCount: result.wordCount, status: wantsPublish ? "published" : (existing?.status || "draft") });
  } catch (err) {
    console.error("Save writing error:", err);
    return json({ error: err.message }, { status: 500 });
  }
}
