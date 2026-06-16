// src/routes/api/narrator/test/+server.js
// Test endpoint — triggers a specific narrator effect manually.
// Usage: POST /api/narrator/test with { "effect": "paralyze", "target": "humans", "duration_hours": 1 }
// Auth: must be admin role.

import { json } from '@sveltejs/kit';
import { applyInstantEffects } from '$lib/server/narrator-effects.js';
import { NARRATOR_CATALOG } from '$lib/narrator-catalog.js';

export async function POST({ request, locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });

    // Only admins can trigger test events
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { effect, target = 'all', duration_hours = 1, title, narrative } = body;

    if (!effect || !NARRATOR_CATALOG[effect]) {
        return json({ error: `Unknown effect. Available: ${Object.keys(NARRATOR_CATALOG).join(', ')}` }, { status: 400 });
    }

    const catalog = NARRATOR_CATALOG[effect];
    const id = crypto.randomUUID();
    const dur = duration_hours;
    const expiresSql = `datetime('now', '+${dur} hours')`;

    // Build effects object
    const effects = { target };
    if (effect === 'paralyze') effects.paralyze = true;
    if (effect === 'fuel_bonus') effects.fuel_bonus = body.amount || 50;
    if (effect === 'kraken') effects.fuel_tax = body.amount || 0.3;
    if (effect === 'resurrection') effects.unparalyze = true;

    const eventTitle = title || `${catalog.icon} ${catalog.label}`;
    const eventNarrative = narrative || catalog.desc;
    const effectsJson = JSON.stringify(effects);

    await db.prepare(`
        INSERT INTO narrator_events (id, title, narrative, event_type, duration_hours, expires_at, effects, target_game)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'both')
    `).bind(id, eventTitle, eventNarrative, effect, dur, expiresSql, effectsJson).run();

    // Apply instant effects
    let appliedEffects = [];
    try {
        appliedEffects = await applyInstantEffects(db, {
            event_type: effect,
            effects,
            duration_hours: dur,
        });
    } catch (e) {
        return json({ error: 'Effect failed: ' + e.message, id }, { status: 500 });
    }

    return json({
        success: true,
        id,
        effect,
        target,
        catalog_entry: catalog,
        applied: appliedEffects,
        expires_in_hours: dur,
    });
}
