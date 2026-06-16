// src/lib/server/pier.js
// Los Muertos Pier — strategic home base and sanctuary.

export const PIER_LAT = 20.6035;
export const PIER_LON = -105.2390;
export const PIER_SANCTUARY_RADIUS_M = 200;  // ~200m around pier = safe zone
export const RETREAT_COOLDOWN_HOURS = 6;

/**
 * Check if a player position is within the pier sanctuary zone.
 */
export function isAtPier(lat, lon) {
    if (lat == null || lon == null) return false;
    const dist = haversineMeters(lat, lon, PIER_LAT, PIER_LON);
    return dist <= PIER_SANCTUARY_RADIUS_M;
}

/**
 * Calculate retreat cost from current position to pier.
 * Flat rate: distance × cost_per_km × 0.5 (half price — it's an escape, not a hunt).
 */
export function calculateRetreatCost(lat, lon, costPerKm) {
    if (lat == null || lon == null) return 0;
    const distKm = haversineMeters(lat, lon, PIER_LAT, PIER_LON) / 1000;
    return Math.ceil(distKm * (costPerKm || 0.73) * 0.5);
}

/**
 * Execute retreat to pier for a player.
 * Moves player to pier, deducts fuel, sets cooldown.
 */
export async function retreatToPier(db, player, costPerKm) {
    const cost = calculateRetreatCost(player.lat, player.lon, costPerKm);
    const totalFuel = (player.fuel || 0) + (player.checkin_fuel || 0);

    if (totalFuel < cost) {
        return { success: false, error: `Need $${cost} to retreat, have $${totalFuel}`, cost };
    }

    // Check cooldown
    if (player.retreat_until && new Date(player.retreat_until.replace(' ', 'T') + 'Z') > new Date()) {
        return { success: false, error: 'Retreat on cooldown', cooldown_until: player.retreat_until };
    }

    // Deduct fuel — spend checkin first
    const fromCheckin = Math.min(player.checkin_fuel || 0, cost);
    const fromRegular = cost - fromCheckin;

    await db.prepare(`
        UPDATE bq_players
        SET lat = ?, lon = ?, fuel = fuel - ?, checkin_fuel = checkin_fuel - ?,
            retreat_until = datetime('now', '+${RETREAT_COOLDOWN_HOURS} hours')
        WHERE id = ?
    `).bind(PIER_LAT, PIER_LON, fromRegular, fromCheckin, player.id).run();

    return {
        success: true,
        cost,
        position: { lat: PIER_LAT, lon: PIER_LON },
        cooldown_hours: RETREAT_COOLDOWN_HOURS,
        sanctuary: true,
    };
}

/**
 * Check if a player should be protected from a calamity/attack
 * because they're at the pier.
 */
export function isProtectedAtPier(playerLat, playerLon) {
    return isAtPier(playerLat, playerLon);
}

function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
