// Drift Model for Booty Battle (migrated from bottlequest)
// Simulates bottle drift with proper land/beaching detection

function lat2rad(lat) { return lat * Math.PI / 180; }

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = lat2rad(lat2 - lat1);
    const dLon = lat2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat2rad(lat1)) * Math.cos(lat2rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Simplified current zones for Pacific Ocean
const ZONES = [
    { id: 'open-ocean', name: 'Open Ocean', min_lat: -40, max_lat: 40, min_lon: -180, max_lon: -100, base_lat: 10, base_u: 0.02, base_v: 0.0, seasonal_u_amp: 0.01, seasonal_v_amp: 0.005, noise_factor: 0.3 },
    { id: 'north-equatorial', name: 'N. Equatorial Current', min_lat: 8, max_lat: 20, min_lon: -130, max_lon: -100, base_lat: 14, base_u: -0.06, base_v: 0.0, seasonal_u_amp: 0.01, seasonal_v_amp: 0.005, noise_factor: 0.2 },
    { id: 'equatorial-counter', name: 'Equatorial Counter Current', min_lat: 0, max_lat: 8, min_lon: -130, max_lon: -100, base_lat: 4, base_u: 0.04, base_v: 0.0, seasonal_u_amp: 0.01, seasonal_v_amp: 0.005, noise_factor: 0.25 },
    { id: 'california-current', name: 'California Current', min_lat: 25, max_lat: 45, min_lon: -130, max_lon: -115, base_lat: 35, base_u: 0.0, base_v: -0.04, seasonal_u_amp: 0.01, seasonal_v_amp: 0.01, noise_factor: 0.2 },
    { id: 'banderas-bay', name: 'Bay of Banderas', min_lat: 20.4, max_lat: 20.8, min_lon: -105.6, max_lon: -105.1, base_lat: 20.6, base_u: 0.0, base_v: 0.0, seasonal_u_amp: 0.005, seasonal_v_amp: 0.005, noise_factor: 0.4 },
];

// Pacific coast points for land detection (lat, lon, beach_radius_km)
const COAST_POINTS = [
    // Bay of Banderas
    [20.71, -105.54, 0.3], [20.72, -105.29, 0.2], [20.65, -105.23, 0.15],
    [19.53, -105.22, 0.3], [20.47, -105.40, 0.2], [20.50, -105.36, 0.2],
    // Mexico Pacific
    [21.5, -105.2, 0.5], [19.5, -105.0, 0.5], [19.1, -104.5, 0.5],
    [18.0, -103.5, 0.6], [16.5, -99.5, 0.6], [15.5, -96.0, 0.6],
    [15.0, -93.0, 0.6],
    // Central America
    [12.0, -87.0, 0.5], [9.0, -80, 1.0],
    // South America Pacific
    [4.0, -77.5, 0.8], [-1.5, -80.0, 0.8], [-10, -78, 1.0], [-25, -71, 1.0],
    // Baja California
    [28, -114, 0.8], [24, -110, 1.0], [23, -110, 0.8], [28, -115.5, 1.2],
    // Islands
    [20.8, -156.5, 0.5], [-0.7, -90.5, 0.3], [10.3, -109.2, 0.2], [18.7, -112, 0.5],
    // US/Canada coast (shouldn't reach but just in case)
    [48, -125, 1.0], [37, -122, 0.5],
];

function checkCoast(lat, lon) {
    let closestName = null;
    let minDist = Infinity;

    for (const [clat, clon, threshold] of COAST_POINTS) {
        const d = haversine(lat, lon, clat, clon);
        if (d < minDist) {
            minDist = d;
            closestName = `${clat.toFixed(1)},${clon.toFixed(1)}`;
        }
        // Beach if within 3km of coast point
        if (d < 3) {
            return { beached: true, coast: closestName, distanceKm: minDist };
        }
    }

    return { beached: false, coast: closestName, distanceKm: minDist, approaching: minDist < 20 };
}

function findZones(lat, lon) {
    return ZONES.filter(z => lat >= z.min_lat && lat <= z.max_lat && lon >= z.min_lon && lon <= z.max_lon);
}

function calculateDrift(zones, month) {
    let zone = zones[0];
    if (!zone) return null;

    const seasonalPhase = Math.sin((month - 1) * Math.PI / 6);
    const u = zone.base_u + zone.seasonal_u_amp * seasonalPhase;
    const v = zone.base_v + zone.seasonal_v_amp * seasonalPhase;
    const noise = zone.noise_factor || 0.3;
    const baseSpeed = Math.sqrt(u ** 2 + v ** 2) || 0.05;
    const randU = (Math.random() - 0.5) * 2 * noise * baseSpeed;
    const randV = (Math.random() - 0.5) * 2 * noise * baseSpeed;
    const totalU = u + randU;
    const totalV = v + randV;
    const speed = Math.sqrt(totalU ** 2 + totalV ** 2);
    const heading = Math.atan2(totalU, totalV) * (180 / Math.PI);

    const HOURS = 6;
    const DT = HOURS * 3600;
    const deltaLat = totalV * DT / 111320;
    const deltaLon = totalU * DT / (111320 * Math.cos(lat2rad(Math.abs(zone.base_lat || 15))));

    return { deltaLat, deltaLon, speedKmh: speed * 3.6, speedMs: speed, heading, u: totalU, v: totalV, zone: zone.name };
}

/**
 * Run drift simulation for all active bottles
 * @param {D1Database} db
 * @returns {object} simulation results
 */
export async function simulateDrift(db) {
    const { results: bottles } = await db.prepare(`
        SELECT id, current_lat, current_lon, distance_km, status, created_at
        FROM bottles WHERE status IN ('launched', 'sailing')
        AND current_lat IS NOT NULL AND current_lon IS NOT NULL
    `).all();

    if (!bottles || bottles.length === 0) {
        return { message: 'No active bottles', updated: 0 };
    }

    const month = new Date().getMonth() + 1;
    const updated = [];

    for (const bottle of bottles) {
        const matching = findZones(bottle.current_lat, bottle.current_lon);
        const activeZones = matching.length > 0 ? matching : [ZONES[0]];
        const drift = calculateDrift(activeZones, month);
        if (!drift) continue;

        let newLat = bottle.current_lat + drift.deltaLat;
        let newLon = bottle.current_lon + drift.deltaLon;
        const distKm = drift.speedMs * 6 * 3600 / 1000;

        // Coast check — THIS TIME ACTUALLY BEACHES
        const coast = checkCoast(newLat, newLon);
        let beached = false;

        if (coast.beached) {
            // Bottle hits land!
            await db.prepare(`
                UPDATE bottles SET status = 'beached', beached_at = datetime('now'),
                current_lat = ?, current_lon = ?, distance_km = ?,
                updated_at = datetime('now') WHERE id = ?
            `).bind(newLat, newLon, (bottle.distance_km || 0) + distKm, bottle.id).run();

            // Log beaching event
            try {
                await db.prepare(`
                    INSERT INTO bottle_events (id, bottle_id, event_type, lat, lon, description, created_at)
                    VALUES (?, ?, 'beached', ?, ?, ?, datetime('now'))
                `).bind(crypto.randomUUID(), bottle.id, newLat, newLon,
                    `Bottle beached after ${((bottle.distance_km || 0) + distKm).toFixed(1)} km`).run();
            } catch (e) { /* bottle_events table may not exist in this DB */ }

            beached = true;
            updated.push({ id: bottle.id, beached: true, lat: newLat.toFixed(4), lon: newLon.toFixed(4), distance_km: ((bottle.distance_km || 0) + distKm).toFixed(1) });
        } else {
            // Deflect slightly if approaching coast
            if (coast.approaching) {
                newLat += (Math.random() - 0.5) * 0.02;
                newLon += (Math.random() - 0.5) * 0.02;
            }

            // Clamp to Eastern Pacific
            newLat = Math.max(-60, Math.min(60, newLat));
            newLon = Math.max(-180, Math.min(-100, newLon));

            await db.prepare(`
                UPDATE bottles SET current_lat = ?, current_lon = ?,
                distance_km = ?, status = 'sailing',
                updated_at = datetime('now') WHERE id = ?
            `).bind(newLat, newLon, (bottle.distance_km || 0) + distKm, bottle.id).run();

            updated.push({ id: bottle.id, zone: drift.zone, speed_kmh: drift.speedKmh.toFixed(2), lat: newLat.toFixed(4), lon: newLon.toFixed(4) });
        }
    }

    return { message: `Updated ${updated.length} bottles`, month, updated };
}
