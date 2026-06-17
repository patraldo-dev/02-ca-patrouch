import { json } from '@sveltejs/kit';
import { applyInstantEffects } from '$lib/server/narrator-effects.js';

export async function GET({ platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ events: [] });

    try {
        const url = new URL(platform?.request?.url || 'http://localhost');
        const game = url.searchParams.get('game') || 'both';
        let query = `SELECT * FROM narrator_events WHERE (expires_at IS NULL OR expires_at > datetime('now'))`;
        if (game !== 'both') query += ` AND (target_game = 'both' OR target_game = ?)`;
        query += ` ORDER BY created_at DESC LIMIT 5`;
        const stmt = game !== 'both' ? db.prepare(query).bind(game) : db.prepare(query);
        const { results } = await stmt.all();
        return json({ events: results || [] });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

async function translateText(ai, text, targetLang) {
    const langNames = { es: 'Spanish', fr: 'French', en: 'English' };
    const prompt = `Translate the following text to ${langNames[targetLang]}. Return ONLY the translation, nothing else, no quotes, no explanation:\n\n${text}`;
    const resp = await ai.run('@cf/mistralai/mistral-small-3.1-24b-instruct', { prompt, max_tokens: 500 });
    return (resp?.response || '').trim();
}

// POST: create event (used by cron/narrator)
export async function POST({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });

    const cronSecret = (await platform?.env?.CRON_SECRET?.get?.()) ?? null;
    const auth = request.headers.get('Authorization');
    if (!auth || !cronSecret || auth !== `Bearer ${cronSecret}`) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ai = platform?.env?.AI;

    try {
        let data = {};
        try {
            data = await request.json();
        } catch {
            // No body — generate a narrative event
        }

        // If no title/narrative provided, generate one with AI
        if (!data.title || !data.narrative) {
            if (!ai) return json({ error: 'AI unavailable' }, { status: 503 });

            // Fetch recent activity for context
            const { results: players } = await db.prepare('SELECT username, lat, lon, fuel FROM bq_players').all();
            const playerContext = (players || []).slice(0, 10).map(p => `${p.username} at (${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}) with $${p.fuel}`).join('; ');

            const prompt = `You are El Narrador (Albot Camus), the omniscient narrator of a pirate bottle game on the Pacific coast of Mexico. You speak with authority and mischief.

Current players: ${playerContext || 'None'}

THE KRAKEN roams the ocean. It displaces every 6 hours and attacks players within 5 km (15% fuel loss + 1h paralysis). Players within 25 km get warnings. Reference the Kraken in your narratives when it stirs.

Create ONE event. Choose from the EFFECT CATALOG below — each has real mechanical teeth (game-altering consequences). Be unpredictable: 50% chance calamity, 40% chance blessing, 10% chance flavor.

EFFECT CATALOG (use event_type + effects):

CALAMITIES (hinder players):
- event_type "paralyze" — {"paralyze": true, "target": "humans|ai|all|player:username"} Immobilizes targets. They cannot move, transfer, or check in.
- event_type "storm" — {"half_speed": true, "fuel_penalty": 50, "target": "all"} Double fuel cost + flat penalty per move.
- event_type "doldrums" — {"drift_speed_mult": 0.3, "target": "all"} Bottle drift nearly stops.
- event_type "fog" — {"no_vision": true, "target": "humans"} AI players blinded — cannot navigate. Map limited for humans.
- event_type "market_crash" — {"fuel_penalty": 100, "target": "all"} Severe fuel penalty per move.
- event_type "kraken" — {"fuel_tax": 0.3, "target": "all"} 30% of all funds destroyed instantly.
- event_type "mutiny" — {"no_move": true, "target": "humans"} No movement for duration (general blockade).
- event_type "bounty" — {"bounty_player": "username", "capture_bonus": 200, "target": "all"} Bounty placed — bonus for capturing that player's bottle.

BLESSINGS (help players):
- event_type "fuel_bonus" — {"fuel_bonus": 100, "target": "all"} Immediate funds granted.
- event_type "favorable_winds" — {"half_cost": true, "target": "all"} Half fuel cost on all moves.
- event_type "clear_skies" — {"visibility": "clear", "capture_radius_mult": 2, "target": "all"} Enhanced vision, easier captures.
- event_type "swift_currents" — {"drift_speed_mult": 1.8, "target": "all"} Bottles drift fast — more action.
- event_type "resurrection" — {"unparalyze": true, "target": "all"} Clears all paralysis.
- event_type "safe_harbor" — {"fuel_bonus": 30, "target": "humans"} Fuel for human players near ports.

Generate a JSON object with:
- title: dramatic title (max 10 words)
- narrative: 2-4 sentences, vivid and engaging (max 350 chars). The narrative MUST describe the game effect dramatically.
- event_type: one of the catalog types above
- duration_hours: 2, 4, 6, or 12
- effects: the effects JSON from the catalog entry you chose. Include "target" field.
- target_game: "both"
Always include effects with real mechanical consequences. No empty flavor events unless event_type is literally "flavor".
Be bold. Create events that make players FEEL the impact.`;

            const aiResp = await ai.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
                messages: [
                    { role: 'system', content: 'Respond ONLY with valid JSON. No markdown, no backticks, no explanation.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 250
            });
            console.log('[NARRATOR] TYPE:', typeof aiResp, 'KEYS:', aiResp && typeof aiResp === 'object' ? Object.keys(aiResp) : 'N/A', 'FULL:', JSON.stringify(aiResp).slice(0, 500));

            // Defensive text extraction
            function extractText(r) {
                if (typeof r === 'string') return r;
                if (r?.choices?.[0]?.message?.content) return r.choices[0].message.content;
                if (r?.response) return r.response;
                return JSON.stringify(r);
            }
            const aiText = extractText(aiResp);
            // aiText is now always a string (possibly JSON-wrapped)
            let jsonStr = aiText.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] || aiText.match(/\{[\s\S]*\}/)?.[0];
            if (!jsonStr) return json({ error: 'AI did not return JSON', aiPreview: aiText.slice(0, 500) }, { status: 500 });

            data = JSON.parse(jsonStr.trim());
        }

        const { title, narrative, event_type, modifier_type, modifier_value, affected_zone, target_players, duration_hours, title_es, narrative_es, title_fr, narrative_fr } = data;
        const id = crypto.randomUUID();
        const dur = duration_hours || 6;
        const expiresSql = `datetime('now', '+${dur} hours')`;

        let tEs = title_es, nEs = narrative_es, tFr = title_fr, nFr = narrative_fr;

        // Skip auto-translate in cron to avoid CPU timeout
        // Translations handled client-side on demand
        if (!tEs) tEs = title;
        if (!nEs) nEs = narrative;
        if (!tFr) tFr = title;
        if (!nFr) nFr = narrative;

        const effectsObj = data.effects || {};
        // Ensure target is preserved in stored effects
        if (data.target && !effectsObj.target) effectsObj.target = data.target;
        const effectsJson = JSON.stringify(effectsObj);

        await db.prepare(`
            INSERT INTO narrator_events (id, title, narrative, event_type, duration_hours, expires_at, effects, target_game)
            VALUES (?, ?, ?, ?, ?, datetime('now', '+${dur} hours'), ?, ?)
        `).bind(id, title, narrative, event_type || 'flavor', dur, effectsJson, data.target_game || 'both').run();

        // Apply instant effects (paralyze, fuel_bonus, kraken, resurrection)
        let appliedEffects = [];
        try {
            appliedEffects = await applyInstantEffects(db, {
                event_type: event_type || 'flavor',
                effects: effectsObj,
                duration_hours: dur,
            });
            if (appliedEffects.length) {
                console.log('[NARRATOR] Instant effects applied:', JSON.stringify(appliedEffects));
            }
        } catch (e) { console.error('[NARRATOR] Effect processing failed:', e.message); }

        // Notify players with game notifications on
        try {
            const { notifyAll } = await import("$lib/server/notify.js");
            await notifyAll(db, { type: "narrator", title: "🌊 " + title, body: narrative });
        } catch (e) { console.error("[narrator] notify failed:", e.message); }
        return json({ success: true, id, appliedEffects });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
