// src/lib/server/narrator-effects.js
// Processes narrator event effects — instant effects applied at creation time.
// Duration effects are checked per-action in move/bot-ai-cron endpoints.

import { NARRATOR_CATALOG } from '$lib/narrator-catalog.js';

/**
 * Apply instant effects when a narrator event is created.
 * Returns array of result summaries.
 */
export async function applyInstantEffects(db, eventRow) {
    const effects = typeof eventRow.effects === 'string'
        ? JSON.parse(eventRow.effects || '{}')
        : (eventRow.effects || {});

    const target = effects.target || 'all';
    const durationHours = eventRow.duration_hours || 6;
    const eventType = eventRow.event_type;
    const results = [];

    // Skip flavor events entirely
    if (eventType === 'flavor') return results;

    // Look up which effect keys are "instant" from the catalog
    // and check if this event's eventType matches one
    const catalogEntry = NARRATOR_CATALOG[eventType];

    // ── PARALYZE ──
    if (effects.paralyze || eventType === 'paralyze' || effects.freeze_hours) {
        const ids = await resolvePlayerTargets(db, target, effects);
        if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            // Use MAX so we don't shorten an existing longer paralysis
            await db.prepare(
                `UPDATE bq_players SET paralyzed_until = MAX(COALESCE(paralyzed_until,'1970-01-01 00:00:00'), datetime('now', '+${durationHours} hours')) WHERE id IN (${placeholders})`
            ).bind(...ids).run();
        }
        results.push({ effect: 'paralyze', affected: ids.length, target });
    }

    // ── KRAKEN'S TOLL (instant fuel destruction) ──
    if (effects.fuel_tax || eventType === 'kraken') {
        const ids = await resolvePlayerTargets(db, target, effects);
        const pct = Math.min(Math.abs(effects.fuel_tax || 0.3), 1);
        let totalDestroyed = 0;
        for (const pid of ids) {
            const player = await db.prepare('SELECT fuel FROM bq_players WHERE id = ?').bind(pid).first();
            if (player && player.fuel > 0) {
                const tax = Math.ceil(player.fuel * pct);
                await db.prepare('UPDATE bq_players SET fuel = MAX(0, fuel - ?) WHERE id = ?')
                    .bind(tax, pid).run();
                totalDestroyed += tax;
            }
        }
        results.push({ effect: 'kraken', affected: ids.length, amount: totalDestroyed, target });
    }

    // ── FUEL_BONUS / TREASURE (instant fuel grant) ──
    if (effects.fuel_bonus || eventType === 'fuel_bonus') {
        const ids = await resolvePlayerTargets(db, target, effects);
        const amount = effects.fuel_bonus || 50;
        if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id IN (${placeholders})`)
                .bind(amount, ...ids).run();
        }
        results.push({ effect: 'fuel_bonus', affected: ids.length, amount, target });
    }

    // ── RESURRECTION (clear all paralysis) ──
    if (effects.unparalyze || eventType === 'resurrection') {
        const ids = await resolvePlayerTargets(db, target, effects);
        if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            await db.prepare(`UPDATE bq_players SET paralyzed_until = NULL WHERE id IN (${placeholders})`)
                .bind(...ids).run();
        }
        results.push({ effect: 'resurrection', affected: ids.length, target });
    }

    return results;
}

/**
 * Resolve a target spec to a list of player IDs.
 * Supports: all, humans, ai, bb_bots, player:username, team:name, zone:lat,lon,radius
 */
export async function resolvePlayerTargets(db, target, effects = {}) {
    // Zone targeting from effects
    if (target.startsWith('zone:') || effects.zone) {
        const zoneMatch = target.match(/zone:([\d.-]+),([\d.-]+),([\d.]+)/);
        if (zoneMatch) {
            const [, lat, lon, radius] = zoneMatch;
            return resolveByZone(db, parseFloat(lat), parseFloat(lon), parseFloat(radius));
        }
        if (effects.zone) {
            return resolveByZone(db, effects.zone.lat, effects.zone.lon, effects.zone.radius || 2);
        }
        return [];
    }

    switch (target) {
        case 'all': {
            const { results } = await db.prepare('SELECT id FROM bq_players').all();
            return (results || []).map(p => p.id);
        }
        case 'humans': {
            const { results } = await db.prepare("SELECT id FROM bq_players WHERE type = 'human'").all();
            return (results || []).map(p => p.id);
        }
        case 'ai': {
            const { results } = await db.prepare("SELECT id FROM bq_players WHERE type = 'ai'").all();
            return (results || []).map(p => p.id);
        }
        default:
            if (target.startsWith('player:')) {
                const username = target.slice(7);
                const player = await db.prepare('SELECT id FROM bq_players WHERE username = ?')
                    .bind(username).first();
                return player ? [player.id] : [];
            }
            if (target.startsWith('team:')) {
                const teamName = target.slice(5);
                const { results } = await db.prepare('SELECT id FROM bq_players WHERE team_id = ?')
                    .bind(teamName).all();
                return (results || []).map(p => p.id);
            }
            return [];
    }
}

async function resolveByZone(db, lat, lon, radiusDeg) {
    const { results } = await db.prepare(`
        SELECT id, lat, lon FROM bq_players
        WHERE lat IS NOT NULL AND lon IS NOT NULL
    `).all();
    return (results || []).filter(p => {
        const dlat = p.lat - lat;
        const dlon = p.lon - lon;
        return Math.sqrt(dlat * dlat + dlon * dlon) <= radiusDeg;
    }).map(p => p.id);
}
