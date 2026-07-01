import { json } from '@sveltejs/kit';

/**
 * POST /api/portals/reindex
 * 
 * Self-generating portal system. Two phases:
 * 
 * Phase 1 — UPDATE: Scans Agora writings against existing portal triggers,
 * updates active_writings_count, activates dormant portals past threshold.
 * 
 * Phase 2 — DISCOVER: Finds writings that don't strongly match any existing portal.
 * When 3+ unmatched writings share thematic keywords, sends them to Workers AI
 * which generates a full portal config (trilingual names, narrator personality,
 * color palette, trigger keywords). New galaxy + portal auto-inserted into D1.
 */

const ACTIVATION_THRESHOLD = 5;
const DISCOVERY_THRESHOLD = 10; // min unmatched writings to trigger AI discovery
const MIN_SHARED_KEYWORDS = 3; // min keywords shared across unmatched writings

export async function POST({ platform, request }) {
    const db = platform?.env?.DB_book;
    const ai = platform?.env?.AI;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    try {
        // ── Phase 1: Update existing portal counts ──
        const { results: portals } = await db.prepare(`
            SELECT id, galaxy_id, triggers, status, active_writings_count FROM portals
        `).all();

        const { results: writings } = await db.prepare(`
            SELECT id, title, content FROM writings
            WHERE status = 'published' AND visibility = 'public'
        `).all();

        const updated = [];
        const matchedWritingIds = new Set();

        for (const portal of portals || []) {
            let triggers = [];
            try { triggers = JSON.parse(portal.triggers || '[]'); } catch {}
            if (triggers.length === 0) continue;

            let matchCount = 0;
            for (const w of writings || []) {
                const text = ((w.title || '') + ' ' + (w.content || '')).toLowerCase();
                const hasMatch = triggers.some(t => text.includes(t.toLowerCase()));
                if (hasMatch) {
                    matchCount++;
                    matchedWritingIds.add(w.id);
                }
            }

            const wasDormant = portal.status === 'dormant';
            const nowActive = wasDormant && matchCount >= ACTIVATION_THRESHOLD;

            if (nowActive) {
                await db.prepare(`
                    UPDATE portals SET active_writings_count = ?, status = 'active', discovered_at = datetime('now')
                    WHERE id = ?
                `).bind(matchCount, portal.id).run();
                updated.push({ portal: portal.id, writings: matchCount, condensed: true });
            } else if (matchCount !== portal.active_writings_count) {
                await db.prepare(`
                    UPDATE portals SET active_writings_count = ? WHERE id = ?
                `).bind(matchCount, portal.id).run();
                updated.push({ portal: portal.id, writings: matchCount, condensed: false });
            }
        }

        // ── Phase 2: Discover new portals from unmatched writings ──
        const discovered = [];

        if (ai && writings && writings.length >= DISCOVERY_THRESHOLD) {
            // Get unmatched writings
            const unmatched = (writings || []).filter(w => !matchedWritingIds.has(w.id));

            if (unmatched.length >= DISCOVERY_THRESHOLD) {
                // Extract keyword frequencies from unmatched writings
                const wordFreq = {};
                const stopWords = new Set([
                    'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
                    'el','la','los','las','un','una','unos','unas','y','o','pero','en','de','del',
                    'al','con','por','para','que','se','su','es','son','fue','era','más','muy',
                    'le','les','su','sus','lo','this','that','is','was','are','were','it','as',
                    'have','has','had','not','no','sí','yes','pero','porque','cuando','donde',
                    'como','qué','quien','cual','también','así','eso','esta','este','estos',
                    'estas','eso','esa','esos','esas','mi','tu','sus','nuestro','their','his','her',
                    'i','you','he','she','we','they','me','him','her','us','them','my','your',
                    'our','their','what','which','who','when','where','why','how','all','each',
                    'every','both','few','more','most','other','some','such','only','own','same',
                    'than','too','very','can','will','just','should','now','one','two','three',
                    'está','están','estoy','estamos','soy','somos','eres','eres','es','son',
                    'si','ya','aquí','ahí','allí','tan','tanto','poco','mucho','todo','nada'
                ]);

                for (const w of unmatched) {
                    const text = ((w.title || '') + ' ' + (w.content || '')).toLowerCase();
                    const words = text.match(/\p{L}{4,}/gu) || [];
                    const unique = new Set(words);
                    for (const word of unique) {
                        if (!stopWords.has(word)) {
                            wordFreq[word] = (wordFreq[word] || 0) + 1;
                        }
                    }
                }

                // Find shared keywords (appear in 2+ unmatched writings)
                const sharedKeywords = Object.entries(wordFreq)
                    .filter(([, count]) => count >= MIN_SHARED_KEYWORDS)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 15)
                    .map(([word]) => word);

                if (sharedKeywords.length >= 3) {
                    // Check we don't already have a portal with these triggers
                    const existingTriggers = new Set();
                    for (const p of portals || []) {
                        try {
                            const t = JSON.parse(p.triggers || '[]');
                            t.forEach(w => existingTriggers.add(w.toLowerCase()));
                        } catch {}
                    }

                    const novelKeywords = sharedKeywords.filter(k => !existingTriggers.has(k));

                    if (novelKeywords.length >= 3) {
                        // Sample unmatched writings for the AI
                        const sampleTexts = unmatched
                            .slice(0, 5)
                            .map(w => (w.title || 'Untitled') + ': ' + (w.content || '').slice(0, 300))
                            .join('\n---\n');

                        const prompt = `You are the cosmic architect of a creative writing universe. 
Analyze these unpublished-to-portal writings and identify their shared thematic essence.

Writings:
${sampleTexts}

Key recurring words: ${novelKeywords.join(', ')}

Generate a new portal (entry point to a galaxy) as JSON with this exact structure:
{
  "galaxy_id": "lowercase-no-spaces-id",
  "portal_id": "lowercase-no-spaces-id",
  "name_es": "Spanish name",
  "name_en": "English name", 
  "name_fr": "French name",
  "description_es": "Short Spanish description (3-4 words)",
  "description_en": "Short English description (3-4 words)",
  "description_fr": "Short French description (3-4 words)",
  "icon": "single emoji",
  "color_primary": "#hex",
  "color_bg": "rgba(r,g,b,0.9)",
  "color_text": "#hex",
  "narrator_tone": "narrator personality in Spanish",
  "narrator_vocabulary": ["word1","word2",...8-10 words...],
  "narrator_proclamation_style": "how narrator speaks, in Spanish",
  "narrator_greeting": "greeting phrase in Spanish",
  "triggers": ["word1","word2",...10-15 trigger keywords...],
  "placement_mode": "floor|wall|floating"
}

Respond with ONLY the JSON, no markdown fences or explanation.`;

                        try {
                            const aiResponse = await ai.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
                                messages: [{ role: 'user', content: prompt }],
                                max_tokens: 600,
                                temperature: 0.8
                            });

                            let responseText = aiResponse.response || aiResponse.result?.response || '';
                            // Strip markdown fences if present
                            responseText = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();

                            const config = JSON.parse(responseText);

                            // Validate minimum fields
                            if (config.galaxy_id && config.portal_id && config.name_es && config.icon) {
                                // Insert galaxy (if new)
                                await db.prepare(`
                                    INSERT OR IGNORE INTO galaxies (id, name_es, name_en, name_fr, icon, sort_order)
                                    VALUES (?, ?, ?, ?, ?, ?)
                                `).bind(
                                    config.galaxy_id,
                                    config.name_es, config.name_en || config.name_es, config.name_fr || config.name_es,
                                    config.icon, 99
                                ).run();

                                // Insert portal
                                await db.prepare(`
                                    INSERT OR IGNORE INTO portals 
                                    (id, galaxy_id, name_es, name_en, name_fr, description_es, description_en, description_fr,
                                     icon, color_primary, color_bg, color_text, narrator_tone, narrator_vocabulary,
                                     narrator_proclamation_style, narrator_greeting, placement_mode, triggers, status, active_writings_count)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
                                `).bind(
                                    config.portal_id, config.galaxy_id,
                                    config.name_es, config.name_en || config.name_es, config.name_fr || config.name_es,
                                    config.description_es || '', config.description_en || '', config.description_fr || '',
                                    config.icon, config.color_primary || '#888888',
                                    config.color_bg || 'rgba(200,200,200,0.9)', config.color_text || '#333333',
                                    config.narrator_tone || 'neutral',
                                    JSON.stringify(config.narrator_vocabulary || []),
                                    config.narrator_proclamation_style || '',
                                    config.narrator_greeting || '',
                                    config.placement_mode || 'floating',
                                    JSON.stringify(config.triggers || novelKeywords.slice(0, 10)),
                                    unmatched.length
                                ).run();

                                discovered.push({
                                    portal: config.portal_id,
                                    galaxy: config.galaxy_id,
                                    name: config.name_es,
                                    icon: config.icon,
                                    keywords: novelKeywords.slice(0, 5)
                                });
                            }
                        } catch (aiErr) {
                            console.error('Portal discovery AI error:', aiErr);
                        }
                    }
                }
            }
        }

        return json({
            updated: updated.length,
            discovered: discovered.length,
            updates: updated,
            discoveries: discovered,
            totalWritings: writings?.length || 0,
            unmatched: (writings?.length || 0) - matchedWritingIds.size
        });
    } catch (e) {
        console.error('Portal reindex error:', e);
        return json({ error: 'Reindex failed: ' + e.message }, { status: 500 });
    }
}
