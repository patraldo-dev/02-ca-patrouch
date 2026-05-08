// src/routes/api/cron/sst/+server.js
// Cron endpoint: fetches SST from NOAA ERDDAP, caches in D1, triggers narrator events
// Called weekly by Cloudflare cron trigger

import { json } from '@sveltejs/kit';
import { fetchSSTData, cacheSSTData, generateSSTNarrativeContext } from '$lib/server/sst-cache.js';

export async function GET({ request, platform }) {
    // Auth check
    const cronSecret = (await platform?.env?.CRON_SECRET?.get?.()) ?? null;
    const auth = request.headers.get('Authorization');
    if (!auth || !cronSecret || auth !== `Bearer ${cronSecret}`) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });

    try {
        console.log('[SST-CRON] Starting SST fetch...');
        const sstData = await fetchSSTData();
        console.log('[SST-CRON] Fetched:', sstData.filter(s => s.avg_sst !== null).map(s => `${s.zone_id}=${s.avg_sst}°C (${s.anomaly > 0 ? '+' : ''}${s.anomaly})`));

        // Cache in D1
        await cacheSSTData(db, sstData);

        // Generate narrator events from anomalies
        const narrativeSeeds = generateSSTNarrativeContext(sstData);
        let narratorEvents = 0;

        if (narrativeSeeds.length > 0) {
            const ai = platform?.env?.AI;
            if (ai) {
                // Pick the most significant event
                const topEvent = narrativeSeeds.sort((a, b) => Math.abs(b.severity === 'extreme' ? 3 : 1) - Math.abs(a.severity === 'extreme' ? 3 : 1))[0];

                const prompt = `You are El Narrador (Albot Camus), the omniscient narrator of a pirate bottle game on the Pacific coast of Mexico. You speak with authority and mystery — never explain the science, just narrate what a sailor would observe.

Ocean data: ${topEvent.message}

Create ONE narrator event as JSON:
{
    "title": "dramatic title max 8 words",
    "narrative": "2-3 vivid sentences max 300 chars. Poetic but urgent. A sailor telling others what they see.",
    "event_type": "weather",
    "duration_hours": 12,
    "effects": ${JSON.stringify(topEvent.effects)},
    "target_game": "both"
}`;

                const aiResp = await ai.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
                    messages: [
                        { role: 'system', content: 'Respond ONLY with valid JSON. No markdown, no backticks.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 200
                });

                const aiText = aiResp?.response || aiResp?.choices?.[0]?.message?.content || JSON.stringify(aiResp);
                let jsonStr = aiText.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] || aiText.match(/\{[\s\S]*\}/)?.[0];

                if (jsonStr) {
                    try {
                        const eventData = JSON.parse(jsonStr.trim());
                        const id = crypto.randomUUID();
                        await db.prepare(`
                            INSERT INTO narrator_events (id, title, narrative, event_type, duration_hours, expires_at, effects, target_game)
                            VALUES (?, ?, ?, 'weather', ?, datetime('now', '+12 hours'), ?, 'both')
                        `).bind(id, eventData.title, eventData.narrative, eventData.duration_hours || 12, JSON.stringify(eventData.effects || topEvent.effects)).run();
                        narratorEvents = 1;
                        console.log('[SST-CRON] Narrator event created:', eventData.title);
                    } catch (e) {
                        console.error('[SST-CRON] Failed to parse AI response:', e.message);
                    }
                }
            }
        }

        return json({
            success: true,
            fetched: sstData.filter(s => s.avg_sst !== null).length,
            zones: sstData,
            narrator_events: narratorEvents,
        });
    } catch (e) {
        console.error('[SST-CRON] Error:', e.message);
        return json({ error: e.message }, { status: 500 });
    }
}
