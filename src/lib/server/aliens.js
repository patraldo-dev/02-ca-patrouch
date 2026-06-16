// src/lib/server/aliens.js
// Alien Armies — two factions waging eternal war in PV waters.
// Visible on map (unlike Kraken). Battles create danger zones + loot.

import { isAtPier, PIER_LAT, PIER_LON } from './pier.js';

const GAME_BOUNDS = {
    minLat: 19.5, maxLat: 22.5,
    minLon: -106.5, maxLon: -104.0
};

// Two alien factions — cosmic horror tone
export const ALIEN_FACTIONS = {
    annunaki: {
        name: 'The Anunnaki',
        icon: '👽',
        color: '#7c3aed',
        spawnEdge: 'north', // spawns at top of map
        flavor: 'Ancient gods from Nibiru, harvesting gold and vengeance.',
    },
    greys: {
        name: 'The Greys',
        icon: '🛸',
        color: '#06b6d4',
        spawnEdge: 'south', // spawns at bottom
        flavor: 'Cold analysts from Zeta Reticuli, dissecting the ocean floor.',
    },
};

const BATTLE_RADIUS_KM = 3;       // proximity to trigger battle
const CROSSFIRE_RADIUS_KM = 8;    // players in this range take damage
const LOOT_BONUS = 100;            // fuel bonus for nearest human after battle
const MOVE_SPEED_DEG = 0.15;       // degrees per cron cycle (toward enemy)
const RESPAWN_HOURS = 12;

/**
 * Ensure alien rows exist. Spawn both factions if missing.
 */
export async function ensureAliens(db) {
    const { results: existing } = await db.prepare('SELECT * FROM bq_aliens').all();
    if (existing && existing.length >= 2) return existing;

    const spawnPromises = Object.entries(ALIEN_FACTIONS).map(async ([key, faction]) => {
        const pos = spawnPosition(faction.spawnEdge);
        await db.prepare(`
            INSERT OR IGNORE INTO bq_aliens (id, faction, name, lat, lon, hp, status, respawn_at)
            VALUES (?, ?, ?, ?, ?, 100, 'active', NULL)
        `).bind(key, key, faction.name, pos.lat, pos.lon).run();
    });

    await Promise.all(spawnPromises);
    const { results } = await db.prepare('SELECT * FROM bq_aliens').all();
    return results || [];
}

function spawnPosition(edge) {
    switch (edge) {
        case 'north':
            return {
                lat: GAME_BOUNDS.maxLat - Math.random() * 0.5,
                lon: GAME_BOUNDS.minLon + Math.random() * (GAME_BOUNDS.maxLon - GAME_BOUNDS.minLon),
            };
        case 'south':
            return {
                lat: GAME_BOUNDS.minLat + Math.random() * 0.5,
                lon: GAME_BOUNDS.minLon + Math.random() * (GAME_BOUNDS.maxLon - GAME_BOUNDS.minLon),
            };
        default:
            return {
                lat: GAME_BOUNDS.minLat + Math.random() * (GAME_BOUNDS.maxLat - GAME_BOUNDS.minLat),
                lon: GAME_BOUNDS.minLon + Math.random() * (GAME_BOUNDS.maxLon - GAME_BOUNDS.minLon),
            };
    }
}

/**
 * Process alien movement + battles. Called by bot-ai-cron.
 */
export async function processAliens(db) {
    await ensureAliens(db);
    const aliens = await db.prepare('SELECT * FROM bq_aliens').all();
    const { results: alienRows } = aliens;
    if (!alienRows || alienRows.length < 2) return { events: [] };

    const events = [];

    // Check for respawns
    for (const alien of alienRows) {
        if (alien.status === 'defeated' && alien.respawn_at) {
            const respawnTime = new Date(alien.respawn_at.replace(' ', 'T') + 'Z');
            if (respawnTime <= new Date()) {
                const faction = ALIEN_FACTIONS[alien.faction];
                const pos = spawnPosition(faction.spawnEdge);
                await db.prepare(`
                    UPDATE bq_aliens SET lat = ?, lon = ?, hp = 100, status = 'active', respawn_at = NULL
                    WHERE id = ?
                `).bind(pos.lat, pos.lon, alien.id).run();
                events.push({
                    type: 'alien_respawn',
                    faction: alien.faction,
                    name: alien.name,
                    position: pos,
                });
            }
        }
    }

    // Re-fetch after respawns
    const { results: activeAliens } = await db.prepare(
        "SELECT * FROM bq_aliens WHERE status = 'active'"
    ).all();

    if (!activeAliens || activeAliens.length < 2) return { events };

    const [alienA, alienB] = activeAliens;

    // Check distance — are they in battle range?
    const distKm = haversineKm(alienA.lat, alienA.lon, alienB.lat, alienB.lon);

    if (distKm <= BATTLE_RADIUS_KM) {
        // ═══ BATTLE! ═══
        const battleResult = await resolveBattle(db, alienA, alienB);
        events.push(battleResult);
    } else {
        // ═══ MARCH TOWARD EACH OTHER ═══
        for (const alien of activeAliens) {
            const target = activeAliens.find(a => a.id !== alien.id);
            if (!target) continue;

            const dLat = target.lat - alien.lat;
            const dLon = target.lon - alien.lon;
            const dist = Math.sqrt(dLat * dLat + dLon * dLon);

            if (dist > 0) {
                // Move toward enemy at MOVE_SPEED_DEG
                const stepLat = (dLat / dist) * Math.min(MOVE_SPEED_DEG, dist);
                const stepLon = (dLon / dist) * Math.min(MOVE_SPEED_DEG, dist);
                const newLat = alien.lat + stepLat;
                const newLon = alien.lon + stepLon;

                await db.prepare('UPDATE bq_aliens SET lat = ?, lon = ? WHERE id = ?')
                    .bind(newLat, newLon, alien.id).run();
            }
        }
        events.push({
            type: 'alien_march',
            positions: activeAliens.map(a => ({ faction: a.faction, name: a.name, lat: a.lat, lon: a.lon })),
            distance: Math.round(distKm),
        });
    }

    // Process crossfire damage to players
    const crossfireEvents = await processCrossfire(db, activeAliens);
    events.push(...crossfireEvents);

    return { events };
}

/**
 * Resolve a battle between two aliens. Higher HP wins, loser respawns.
 */
async function resolveBattle(db, alienA, alienB) {
    // Each deals damage = random 30-60
    const damageA = 30 + Math.floor(Math.random() * 31);
    const damageB = 30 + Math.floor(Math.random() * 31);

    const newHpA = Math.max(0, alienA.hp - damageB);
    const newHpB = Math.max(0, alienB.hp - damageA);

    let winner = null, loser = null, draw = false;

    if (newHpA <= 0 && newHpB <= 0) {
        draw = true;
    } else if (newHpA <= 0) {
        winner = alienB; loser = alienA;
    } else if (newHpB <= 0) {
        winner = alienA; loser = alienB;
    } else {
        // Both survive — update HP and continue
        await db.prepare('UPDATE bq_aliens SET hp = ? WHERE id = ?').bind(newHpA, alienA.id).run();
        await db.prepare('UPDATE bq_aliens SET hp = ? WHERE id = ?').bind(newHpB, alienB.id).run();

        // Create narrator event for skirmish
        const eventId = crypto.randomUUID();
        await db.prepare(`
            INSERT INTO narrator_events (id, title, narrative, event_type, duration_hours, expires_at, effects, target_game)
            VALUES (?, ?, ?, 'storm', 2, datetime('now', '+2 hours'), ?, 'both')
        `).bind(
            eventId,
            `⚔️ ${ALIEN_FACTIONS[alienA.faction].name} Clash with ${ALIEN_FACTIONS[alienB.faction].name}`,
            `Above the bay, saucers exchange plasma fire. The sea boils beneath them. Citizens flee to the pier.`,
            JSON.stringify({ half_speed: true, fuel_penalty: 25, target: 'all', alien_battle: true })
        ).run();

        return {
            type: 'alien_skirmish',
            alienA: { name: alienA.name, hp: newHpA, damage: damageA },
            alienB: { name: alienB.name, hp: newHpB, damage: damageB },
        };
    }

    // Someone died — process loot + respawn
    const battleLat = (alienA.lat + alienB.lat) / 2;
    const battleLon = (alienA.lon + alienB.lon) / 2;

    // Award loot to nearest human player
    const { results: humans } = await db.prepare(
        "SELECT id, username, display_name, lat, lon, fuel FROM bq_players WHERE type = 'human' AND lat IS NOT NULL"
    ).all();

    let lootWinner = null;
    if (humans && humans.length > 0) {
        let nearest = null, nearestDist = Infinity;
        for (const h of humans) {
            // Skip players at pier — they're safe but can't loot from there
            if (isAtPier(h.lat, h.lon)) continue;
            const d = haversineKm(battleLat, battleLon, h.lat, h.lon);
            if (d < nearestDist) { nearestDist = d; nearest = h; }
        }

        if (nearest && nearestDist <= 20) {
            await db.prepare('UPDATE bq_players SET fuel = fuel + ? WHERE id = ?')
                .bind(LOOT_BONUS, nearest.id).run();
            lootWinner = {
                player: nearest.username,
                display_name: nearest.display_name || nearest.username,
                distance: Math.round(nearestDist),
                loot: LOOT_BONUS,
            };
        }
    }

    // Defeat the loser / both
    const respawnAt = `datetime('now', '+${RESPAWN_HOURS} hours')`;
    if (draw) {
        await db.prepare(`UPDATE bq_aliens SET hp = 0, status = 'defeated', respawn_at = ${respawnAt} WHERE id IN (?, ?)`)
            .bind(alienA.id, alienB.id).run();
    } else {
        await db.prepare(`UPDATE bq_aliens SET hp = 0, status = 'defeated', respawn_at = ${respawnAt} WHERE id = ?`)
            .bind(loser.id).run();
        await db.prepare('UPDATE bq_aliens SET hp = ? WHERE id = ?')
            .bind(winner.hp - 20, winner.id).run(); // winner takes some damage
    }

    // Create narrator event for the battle
    const eventId = crypto.randomUUID();
    const title = draw
        ? `💥 Mutual Destruction: ${alienA.name} & ${alienB.name}`
        : `🏆 ${ALIEN_FACTIONS[winner.faction].name} Victorious`;
    const narrative = draw
        ? `Both armadas obliterated each other above the Pacific. Debris rained for hours. The survivors fled.`
        : `${ALIEN_FACTIONS[loser.faction].name} retreated into the void, defeated. ${ALIEN_FACTIONS[winner.faction].name} claimed the airspace.${lootWinner ? ` ${lootWinner.display_name} salvaged alien tech worth $${LOOT_BONUS}.` : ''}`;

    await db.prepare(`
        INSERT INTO narrator_events (id, title, narrative, event_type, duration_hours, expires_at, effects, target_game)
        VALUES (?, ?, ?, 'storm', 3, datetime('now', '+3 hours'), ?, 'both')
    `).bind(
        eventId, title, narrative,
        JSON.stringify({ half_speed: true, fuel_penalty: 30, target: 'all', alien_battle: true })
    ).run();

    return {
        type: 'alien_battle',
        winner: winner ? { name: winner.name, faction: winner.faction } : null,
        loser: loser ? { name: loser.name, faction: loser.faction } : null,
        draw,
        loot_winner: lootWinner,
        position: { lat: battleLat, lon: battleLon },
    };
}

/**
 * Players near active aliens take crossfire damage.
 */
async function processCrossfire(db, activeAliens) {
    const events = [];
    const { results: humans } = await db.prepare(
        "SELECT id, username, display_name, lat, lon, fuel FROM bq_players WHERE type = 'human' AND lat IS NOT NULL"
    ).all();

    for (const alien of activeAliens) {
        for (const human of (humans || [])) {
            // Pier sanctuary
            if (isAtPier(human.lat, human.lon)) continue;

            const dist = haversineKm(alien.lat, alien.lon, human.lat, human.lon);
            if (dist <= CROSSFIRE_RADIUS_KM) {
                // Crossfire damage: 5-15 fuel
                const damage = 5 + Math.floor(Math.random() * 11);
                await db.prepare('UPDATE bq_players SET fuel = MAX(0, fuel - ?) WHERE id = ?')
                    .bind(damage, human.id).run();

                events.push({
                    type: 'alien_crossfire',
                    player: human.username,
                    display_name: human.display_name || human.username,
                    damage,
                    distance: Math.round(dist),
                    faction: alien.faction,
                });
            }
        }
    }

    return events;
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
