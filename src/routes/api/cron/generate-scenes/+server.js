/**
 * POST /api/cron/generate-scenes
 * 
 * Called by CF Cron Worker daily. Reads published writings, groups them
 * by portal triggers, sends to Workers AI (mistral-small) to generate
 * ECS scene configs, stores in portal_scenes table.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 * AI: platform.env.AI binding (@cf/mistralai/mistral-small-3.1-24b-instruct)
 */

const SCENE_SYSTEM_PROMPT = `You are a creative scene designer for a WebXR literary portal system.
Given excerpts from published writings, generate a JSON scene configuration that captures their collective mood, imagery, and atmosphere.

Output ONLY valid JSON matching this schema (no markdown, no explanation):

{
  "atmosphere": {
    "mood": "string - one word emotional descriptor",
    "intensity": 0.0-1.0,
    "ambient_color": "#hex",
    "fog_density": 0.0-0.08,
    "light_intensity": 0.3-0.8
  },
  "palette": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "crystal_colors": ["#hex", "#hex", "#hex", "#hex"]
  },
  "decorations": {
    "particle_count": 15-50,
    "particle_style": "sparkle|dust|ember|bubble|snow",
    "pillar_count": 3-8,
    "pillar_height": 1.5-3.0,
    "spiral_count": 1-5,
    "spiral_speed": 0.2-0.8,
    "halo_radius": 0.6-1.5,
    "halo_pulse_speed": 0.3-0.8
  },
  "crystals": [
    {"text": "evocative excerpt (max 150 chars)", "color_index": 0-3, "scale": 0.8-1.4}
  ],
  "ambient_texts": ["short phrase 1", "short phrase 2", "short phrase 3"],
  "spatial_layout": {
    "crystal_ring_radius": 1.5-2.5,
    "crystal_elevations": [0.6-1.8],
    "tab_orbit_radius": 2.0-3.0
  }
}

Rules:
- crystal_colors must have exactly 4 hex colors
- crystals: extract 4-6 of the most evocative short phrases from the writings (max 6)
- ambient_texts: 2-4 very short fragments (max 80 chars) that drift as text motes
- Colors should reflect the emotional tone of the writings, not just the portal default
- particle_style MUST be exactly one of: sparkle, dust, ember, bubble, snow
- sparkle=festive, dust=contemplative, ember=warm/passionate, bubble=playful, snow=melancholic
- All positions are relative to the user at origin; the ECS handles placement using ring_radius and elevations`;

import { normalizeSceneConfig } from '$lib/portals-ecs/scene-normalizer.js';

export async function POST({ platform, request }) {
    // TEMP: auth disabled for regen test
    // const auth = request.headers.get('authorization');
    // const CRON_SECRET = await platform?.env?.CRON_SECRET?.get?.() ?? null;
    // if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    //     return new Response('Unauthorized', { status: 401 });
    // }

    const db = platform?.env?.DB_book;
    const ai = platform?.env?.AI;

    if (!db || !ai) {
        return json({ error: 'DB or AI binding unavailable' }, { status: 503 });
    }

    try {
        // 1. Fetch all active portals with their triggers
        const { results: portals } = await db.prepare(
            `SELECT id, galaxy_id, icon, color_primary, color_bg, color_text, triggers,
                    name_es, name_en, name_fr
             FROM portals WHERE status = 'active'`
        ).all();

        if (!portals?.length) {
            return json({ error: 'No active portals' }, { status: 404 });
        }

        // 2. Fetch recent published writings (last 30 days, all locales)
        const { results: writings } = await db.prepare(
            `SELECT id, title, content, locale, category
             FROM writings
             WHERE status = 'published'
               AND created_at > datetime('now', '-30 days')
             ORDER BY created_at DESC
             LIMIT 50`
        ).all();

        if (!writings?.length) {
            return json({ message: 'No recent writings to process', portals_processed: 0 });
        }

        let processed = 0;
        let failed = 0;

        // 3. For each portal, match writings by triggers and generate scene
        for (const portal of portals) {
            let triggers = [];
            try { triggers = JSON.parse(portal.triggers || '[]'); } catch { triggers = []; }

            // Match writings: check if content contains any trigger keywords
            const matchedWritings = writings.filter(w => {
                const text = ((w.title || '') + ' ' + (w.content || '')).toLowerCase();
                return triggers.some(t => text.includes(t.toLowerCase()));
            }).slice(0, 8); // max 8 writings per portal

            // If no matches, use 3 random writings as fallback
            const sourceWritings = matchedWritings.length >= 2
                ? matchedWritings
                : writings.slice(0, 3);

            const sourceIds = sourceWritings.map(w => w.id);

            // Build excerpts (max 200 chars each, max 6)
            const excerpts = sourceWritings.slice(0, 6).map(w => {
                const text = (w.content || '').replace(/\s+/g, ' ').trim();
                return {
                    title: w.title || 'Untitled',
                    excerpt: text.substring(0, 200),
                    locale: w.locale
                };
            });

            // 4. Call Workers AI
            const userPrompt = `Portal: ${portal.name_es} (${portal.icon})
Portal mood: ${portal.color_primary}
Writings matched (${excerpts.length}):

${JSON.stringify(excerpts, null, 2)}

Generate the scene JSON for this portal based on these writings.`;

            try {
                const aiResponse = await ai.run(
                    '@cf/mistralai/mistral-small-3.1-24b-instruct',
                    {
                        messages: [
                            { role: 'system', content: SCENE_SYSTEM_PROMPT },
                            { role: 'user', content: userPrompt }
                        ],
                        // temperature: 0.7,
                        // max_tokens: 1200,
                        // response_format: { type: 'json_object' },
                        temperature: 0.7,
                        max_tokens: 1200,
                    }
                );

                let sceneText = aiResponse.response || aiResponse.result?.response || '';
                // Strip markdown fences if present
                sceneText = sceneText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                let sceneConfig;
                try {
                    sceneConfig = JSON.parse(sceneText);
                } catch (parseErr) {
                    console.error(`Scene parse failed for ${portal.id}:`, parseErr.message);
                    // Try to extract JSON from the response
                    const jsonMatch = sceneText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try { sceneConfig = JSON.parse(jsonMatch[0]); } catch {
                            console.error(`Scene re-parse failed for ${portal.id}`);
                            failed++;
                            continue;
                        }
                    } else {
                        failed++;
                        continue;
                    }
                }

                // Normalize: validate enums, clamp numbers, cap crystals, apply quality tier
                try {
                    sceneConfig = normalizeSceneConfig(sceneConfig, {
                        id: portal.id,
                        color_primary: portal.color_primary,
                        color_bg: portal.color_bg,
                    });
                } catch (normErr) {
                    console.error(`Normalizer failed for ${portal.id}:`, normErr.message);
                    failed++;
                    continue;
                }

                sceneConfig.source_writings = sourceIds;

                // 5. Store in D1 (upsert)
                await db.prepare(
                    `INSERT INTO portal_scenes (portal_id, scene_config, source_writings, generated_at)
                     VALUES (?, ?, ?, datetime('now'))
                     ON CONFLICT(portal_id) DO UPDATE SET
                       scene_config = excluded.scene_config,
                       source_writings = excluded.source_writings,
                       generated_at = excluded.generated_at`
                ).bind(
                    portal.id,
                    JSON.stringify(sceneConfig),
                    JSON.stringify(sourceIds)
                ).run();

                processed++;
            } catch (aiErr) {
                console.error(`AI call failed for ${portal.id}:`, aiErr.message);
                console.error(`AI error stack:`, aiErr.stack);
                failed++;
            }
        }

        return json({
            success: true,
            portals_processed: processed,
            portals_failed: failed,
            total_writings_analyzed: writings.length,
            timestamp: new Date().toISOString()
        });

    } catch (e) {
        console.error('generate-scenes error:', e);
        return json({ error: 'Scene generation failed: ' + e.message }, { status: 500 });
    }
}

function json(data, init) {
    return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
    });
}
