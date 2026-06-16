// src/lib/server/kraken.js
// The Kraken — a roaming sea monster that displaces randomly and attacks nearby players.
// Tied to the bot-ai-cron cycle (every 6h).

import { PIER_LAT, PIER_LON } from './pier.js';

// PV game area bounds
const GAME_BOUNDS = {
    minLat: 19.0, maxLat: 23.0,
    minLon: -107.0, maxLon: -103.0
};

const KRAKEN_ATTACK_RADIUS_KM = 5;    // ~5.5 km — close encounter = attack
const KRAKEN_WARN_RADIUS_KM = 25;      // ~25 km — proximity warning
const KRAKEN_DISPLACE_RANGE = 0.5;     // max degrees per displacement
const PIER_SANCTUARY_RADIUS_KM = 0.2;   // 200m — pier safety zone

/**
 * Ensure the kraken row exists in the DB. Creates it at a random position if missing.
 */
export async function ensureKraken(db) {
    let kraken = await db.prepare('SELECT * FROM bq_kraken WHERE id = ?').bind('kraken').first();
    if (!kraken) {
        const lat = GAME_BOUNDS.minLat + Math.random() * (GAME_BOUNDS.maxLat - GAME_BOUNDS.minLat);
        const lon = GAME_BOUNDS.minLon + Math.random() * (GAME_BOUNDS.maxLon - GAME_BOUNDS.minLon);
        await db.prepare(`
            INSERT INTO bq_kraken (id, lat, lon, last_displacement, attack_count, last_attack_at)
            VALUES ('kraken', ?, ?, datetime('now'), 0, NULL)
        `).bind(lat, lon).run();
        kraken = { id: 'kraken', lat, lon, last_displacement: new Date().toISOString(), attack_count: 0, last_attack_at: null };
    }
    return kraken;
}

/**
 * Displace the kraken to a new random position within game bounds.
 * Called by the cron cycle.
 */
export async function displaceKraken(db) {
    const kraken = await ensureKraken(db);

    // Random walk — move up to KRAKEN_DISPLACE_RANGE degrees in a random direction
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.random() * KRAKEN_DISPLACE_RANGE;
    const dLat = Math.cos(angle) * dist;
    const dLon = Math.sin(angle) * dist;

    let newLat = kraken.lat + dLat;
    let newLon = kraken.lon + dLon;

    // Bounce off bounds
    newLat = Math.max(GAME_BOUNDS.minLat, Math.min(GAME_BOUNDS.maxLat, newLat));
    newLon = Math.max(GAME_BOUNDS.minLon, Math.min(GAME_BOUNDS.maxLon, newLon));

    await db.prepare(`
        UPDATE bq_kraken SET lat = ?, lon = ?, last_displacement = datetime('now') WHERE id = 'kraken'
    `).bind(newLat, newLon).run();

    return { lat: newLat, lon: newLon, prevLat: kraken.lat, prevLon: kraken.lon };
}

/**
 * Check all human players for kraken proximity.
 * Returns warnings (near) and attacks (very near).
 * Attacks: 15% fuel tax on the player + creates a narrator event.
 */
export async function processKrakenAttacks(db) {
    const kraken = await ensureKraken(db);

    const { results: players } = await db.prepare(`
        SELECT id, username, display_name, lat, lon, fuel, type FROM bq_players
        WHERE lat IS NOT NULL AND lon IS NOT NULL
    `).all();

    const warnings = [];
    const attacks = [];

    for (const player of (players || [])) {
        // Pier sanctuary — immune to kraken at Los Muertos Pier
        const distToPier = haversineKm(PIER_LAT, PIER_LON, player.lat, player.lon);
        if (distToPier <= PIER_SANCTUARY_RADIUS_KM) continue;

        const distKm = haversineKm(kraken.lat, kraken.lon, player.lat, player.lon);

        if (distKm <= KRAKEN_ATTACK_RADIUS_KM) {
            // ATTACK — Kraken strikes!
            const tax = Math.ceil((player.fuel || 0) * 0.15);
            if (tax > 0) {
                await db.prepare('UPDATE bq_players SET fuel = MAX(0, fuel - ?) WHERE id = ?')
                    .bind(tax, player.id).run();
            }
            // Paralyze for 1 hour
            await db.prepare(`
                UPDATE bq_players SET paralyzed_until = datetime('now', '+1 hour')
                WHERE id = ? AND (paralyzed_until IS NULL OR paralyzed_until < datetime('now', '+1 hour'))
            `).bind(player.id).run();

            attacks.push({
                player: player.username,
                display_name: player.display_name || player.username,
                damage: tax,
                distance: distKm,
            });
        } else if (distKm <= KRAKEN_WARN_RADIUS_KM) {
            // Proximity warning only
            warnings.push({
                player: player.username,
                display_name: player.display_name || player.username,
                distance: Math.round(distKm),
            });
        }
    }

    // If any attacks, update kraken stats and create narrator event
    if (attacks.length > 0) {
        await db.prepare(`
            UPDATE bq_kraken SET attack_count = attack_count + ?, last_attack_at = datetime('now')
            WHERE id = 'kraken'
        `).bind(attacks.length).run();

        const victims = attacks.map(a => a.display_name).join(', ');
        const eventId = crypto.randomUUID();
        const title = `🐙 The Kraken Strikes!`;
        const narrative = `Tentacles erupted from the deep beneath ${victims}. The beast devoured fuel and left paralysis in its wake. The sea remembers nothing.`;

        await db.prepare(`
            INSERT INTO narrator_events (id, title, narrative, event_type, duration_hours, expires_at, effects, target_game)
            VALUES (?, ?, ?, 'kraken', 1, datetime('now', '+1 hour'), ?, 'both')
        `).bind(eventId, title, narrative, JSON.stringify({
            kraken_attack: true,
            victims: attacks.map(a => a.player),
            fuel_tax: 0.15,
            target: 'all'
        })).run();
    }

    return { kraken, warnings, attacks };
}

/**
 * Get kraken state + proximity info for a specific player position.
 * Used by page.server.js to send warning data to the client.
 */
export async function getKrakenProximity(db, playerLat, playerLon) {
    const kraken = await ensureKraken(db);
    if (playerLat == null || playerLon == null) {
        return { kraken: null, distance: null, warning: null, danger: false };
    }

    const distKm = haversineKm(kraken.lat, kraken.lon, playerLat, playerLon);

    if (distKm <= KRAKEN_ATTACK_RADIUS_KM) {
        return { kraken, distance: Math.round(distKm), warning: 'DANGER', danger: true };
    }
    if (distKm <= KRAKEN_WARN_RADIUS_KM) {
        return { kraken, distance: Math.round(distKm), warning: 'NEAR', danger: false };
    }
    return { kraken: null, distance: Math.round(distKm), warning: null, danger: false };
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
