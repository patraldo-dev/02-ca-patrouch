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
            // Check if any pending keyword proposals match this writing
            try {
                const text = ((result.title || '') + ' ' + result.content).toLowerCase();
                const textWords = new Set(text.match(/\p{L}{4,}/gu) || []);

                const { results: proposals } = await db.prepare(`
                    SELECT id, word, player_id FROM bq_keyword_proposals
                    WHERE status = 'pending' AND proposal_date >= date('now', '-3 days')
                `).all();

                if (proposals?.length) {
                    let matchedCount = 0;
                    for (const p of proposals) {
                        const kw = p.word.toLowerCase();
                        if (textWords.has(kw)) {
                            const points = kw.length >= 7 ? 15 : 10;
                            await db.prepare(
                                `UPDATE bq_keyword_proposals SET status = 'matched', matched_writing_id = ?, points_earned = ? WHERE id = ?`
                            ).bind(result.id, points, p.id).run();
                            matchedCount++;
                        }
                    }
                    if (matchedCount > 0) {
                        // Award ALL human players (cooperative model)
                        const { results: humans } = await db.prepare(`SELECT id FROM bq_players WHERE type = 'human'`).all();
                        if (humans?.length) {
                            for (const h of humans) {
                                await db.prepare(`UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`)
                                    .bind(matchedCount * 10, matchedCount * 5, h.id).run();
                            }
                        }
                    }
                }
            } catch (matchErr) {
                console.error('Keyword matching error:', matchErr);
            }
        }

        return json({ id: result.id, wordCount: result.wordCount, status });
    } catch (err) {
        console.error('Save writing error:', err);
        return json({ error: err.message }, { status: 500 });
    }
}
