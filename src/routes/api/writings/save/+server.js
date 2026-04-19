// src/routes/api/writings/save/+server.js
import { json } from '@sveltejs/kit';
import { saveDraft } from '$lib/server/writing-stats.js';

const STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','may','might','can','to','of','in','for','on','with','at',
  'by','from','as','into','through','during','before','after','above','below','between','out',
  'off','over','under','then','once','here','there','when','where','why','how','all','each',
  'every','both','few','more','most','other','some','such','no','not','only','own','same','so',
  'than','too','very','just','because','but','and','or','if','while','about','up','it','its',
  'this','that','these','those','i','me','my','we','our','you','your','he','him','his','she',
  'her','they','them','their','what','which','who','whom','el','la','los','las','un','una',
  'es','son','era','ser','estar','estaba','tiene','tienen','puede','hacer','que','de','en',
  'por','para','con','sin','sobre','entre','hacia','desde','como','pero','mas','muy','ya',
  'no','si','o','y','a','se','su','sus','mi','tu','nos','les','le','lo','este','esta','ese',
  'esa','donde','cuando','porque','le','la','les','des','une','sont','était','être','avoir',
  'ont','fait','peut','dans','pour','sur','avec','sans','entre','vers','depuis','comme',
  'mais','plus','moins','très','déjà','non','ou','et','son','sa','ses','mon','notre',
  'votre','leur','ce','cette','ces','où','quand','comment','aussi','that','been','were',
  'said','just','into','could','would','them','than','their','which','about','upon','shall'
]);

export async function POST({ request, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    const db = locals.db;
    if (!db) return json({ error: 'No database' }, { status: 503 });

    const { title, content, promptId, aiAssisted, visibility = 'private', visualPromptText, visualArtworkUrl } = await request.json();

    if (!title?.trim() || !content?.trim()) {
        return json({ error: 'Title and content required' }, { status: 400 });
    }

    try {
        const status = visibility === 'public' ? 'published' : 'draft';
        const result = await saveDraft(db, user.id, {
            title: title.trim(),
            content: content.trim(),
            promptId,
            aiAssisted: aiAssisted || false
        });

        // If publishing, update status and visibility
        if (status === 'published') {
            await db.prepare(
                "UPDATE writings SET status = 'published', visibility = 'public', visual_prompt_text = ?, visual_artwork_url = ?, updated_at = datetime('now') WHERE id = ?"
            ).bind(visualPromptText || null, visualArtworkUrl || null, result.id).run();
        }

        // Index into Vectorize (both drafts and published)
        try {
            const ai = platform?.env?.AI;
            const vectorize = platform?.env?.VECTORIZE;
            if (ai && vectorize) {
                const writing = await db.prepare('SELECT id, title, content FROM writings WHERE id = ?').bind(result.id).first();
                if (writing && writing.content) {
                    const emb = await ai.run('@cf/baai/bge-m3', { text: [`${writing.title}\n${writing.content}`] });
                    const vec = emb?.data?.[0];
                    if (vec) {
                        await vectorize.upsert([{ id: writing.id, values: vec, metadata: { title: writing.title } }]);
                    }
                }
            }
        } catch (idxErr) {
            console.error('Auto-index error:', idxErr);
        }

        // Auto-extract keywords for Bottle Quest when publishing
        if (status === 'published' && result.content) {
            // Check if any active keyword proposals match this writing
            // Decay model: points halve with each match, 5 decimal precision
            // Words never expire, just lose force
            try {
                const text = ((result.title || '') + ' ' + result.content).toLowerCase();
                const textWords = new Set(text.match(/\p{L}{4,}/gu) || []);

                const { results: proposals } = await db.prepare(`
                    SELECT id, word, player_id, points_earned, match_count, decay_rate FROM bq_keyword_proposals
                    WHERE status = 'pending'
                `).all();

                if (proposals?.length) {
                    const matchedHumanIds = new Set();
                    let totalHumanBonus = 0;

                    for (const p of proposals) {
                        const kw = p.word.toLowerCase();
                        if (!textWords.has(kw)) continue;

                        // Decay: base * 0.5^match_count
                        const decayed = Math.ceil(p.points_earned * Math.pow(p.decay_rate || 0.5, p.match_count || 0) * 100000) / 100000;
                        const newCount = (p.match_count || 0) + 1;

                        await db.prepare(
                            `UPDATE bq_keyword_proposals SET match_count = ?, last_matched_at = datetime('now'), last_matched_writing_id = ? WHERE id = ?`
                        ).bind(newCount, result.id, p.id).run();

                        const player = await db.prepare(`SELECT type FROM bq_players WHERE id = ?`).bind(p.player_id).first();
                        const isHuman = player?.type === 'human';
                        const isAuthor = p.player_id === result.user_id;

                        if (isHuman && !isAuthor) {
                            matchedHumanIds.add(p.player_id);
                            totalHumanBonus += decayed;
                        } else if (!isHuman) {
                            await db.prepare(
                                `UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`
                            ).bind(decayed, decayed / 2, p.player_id).run();
                        }
                    }

                    // ALL humans share the cooperative bonus
                    if (totalHumanBonus > 0) {
                        const { results: humans } = await db.prepare(`SELECT id FROM bq_players WHERE type = 'human'`).all();
                        if (humans?.length) {
                            for (const h of humans) {
                                await db.prepare(`UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`)
                                    .bind(totalHumanBonus, Math.floor(totalHumanBonus / 2), h.id).run();
                            }
                        }
                    }
                }
            } catch (matchErr) {
                console.error('Keyword matching error:', matchErr);
            }

            // Auto-propose keyword from opt-in writer's text
            try {
                const user = await db.prepare(`SELECT booty_keywords_opt_in FROM users WHERE id = ?`).bind(result.user_id).first();
                if (user?.booty_keywords_opt_in && result.content) {
                    const text = ((result.title || '') + ' ' + result.content).toLowerCase();
                    const words = text.match(/\p{L}{4,}/gu) || [];
                    const freq = {};
                    for (const w of words) {
                        if (STOP_WORDS.has(w)) continue;
                        freq[w] = (freq[w] || 0) + 1;
                    }
                    // Pick the most interesting word (frequency 2+, prefer unique/rare)
                    const candidates = Object.entries(freq).filter(([, c]) => c >= 2).sort((a, b) => {
                        // Prefer words with unusual letters (more complex)
                        const scoreA = a[0].length + (a[0].match(/[xjqzvkw]/gi)?.length || 0) * 3;
                        const scoreB = b[0].length + (b[0].match(/[xjqzvkw]/gi)?.length || 0) * 3;
                        return scoreB - scoreA;
                    });

                    if (candidates.length > 0) {
                        const chosen = candidates[0][0];
                        const today = new Date().toISOString().split('T')[0];
                        // Check not already proposed today
                        const exists = await db.prepare(
                            `SELECT id FROM bq_keyword_proposals WHERE player_id = ? AND proposal_date = ?`
                        ).bind(result.user_id, today).first();
                        // Check word not already active
                        const wordActive = await db.prepare(
                            `SELECT id FROM bq_keyword_proposals WHERE word = ? AND status = 'pending'`
                        ).bind(chosen).first();

                        if (!exists && !wordActive) {
                            // Weight the keyword
                            const prompt = await db.prepare(
                                `SELECT prompt_text FROM prompts WHERE category = 'daily-community' AND locale = 'en' ORDER BY created_at DESC LIMIT 1`
                            ).first();
                            let pts = 5 + Math.min(chosen.length - 3, 8);
                            if (prompt) {
                                const pWords = new Set(prompt.prompt_text.toLowerCase().match(/\p{L}{3,}/gu) || []);
                                for (const pw of pWords) {
                                    if (chosen.slice(0, 3) === pw.slice(0, 3)) { pts += 3; break; }
                                }
                            }
                            pts = Math.min(pts, 30);

                            await db.prepare(
                                `INSERT INTO bq_keyword_proposals (player_id, word, points_earned) VALUES (?, ?, ?)`
                            ).bind(result.user_id, chosen, pts).run();
                        }
                    }
                }
            } catch (autoErr) {
                console.error('Auto-keyword error:', autoErr);
            }
        }

        return json({ id: result.id, wordCount: result.wordCount, status });
    } catch (err) {
        console.error('Save writing error:', err);
        return json({ error: err.message }, { status: 500 });
    }
}
