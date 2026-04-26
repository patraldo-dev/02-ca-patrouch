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
// Mexico Pacific Coast — dense points every ~0.05° (~5km)
// Format: [lat, lon, threshold_km]
const COAST_POINTS = [
    // Baja California Peninsula (west coast)
    [32.5,-117.1],[32.4,-117.0],[32.2,-117.0],[32.0,-116.9],[31.8,-116.8],
    [31.6,-116.7],[31.4,-116.6],[31.2,-116.5],[31.0,-116.4],[30.8,-116.3],
    [30.6,-116.2],[30.4,-116.1],[30.2,-116.0],[30.0,-115.9],[29.8,-115.8],
    [29.6,-115.7],[29.4,-115.5],[29.2,-115.3],[29.0,-115.2],[28.8,-115.0],
    [28.6,-114.8],[28.4,-114.5],[28.2,-114.3],[28.0,-114.1],[27.8,-113.9],
    [27.6,-113.7],[27.4,-113.5],[27.2,-113.3],[27.0,-113.1],[26.8,-112.9],
    [26.6,-112.7],[26.4,-112.5],[26.2,-112.3],[26.0,-112.1],[25.8,-111.9],
    [25.6,-111.7],[25.4,-111.5],[25.2,-111.3],[25.0,-111.1],[24.8,-110.9],
    [24.6,-110.7],[24.4,-110.6],[24.2,-110.5],[24.0,-110.4],[23.8,-110.3],
    [23.6,-110.3],[23.4,-110.2],[23.2,-110.2],[23.0,-110.2],[22.9,-110.2],
    // Baja California Peninsula (east coast / Sea of Cortez)
    [22.9,-109.9],[23.1,-109.8],[23.3,-109.7],[23.5,-109.6],[23.8,-109.4],
    [24.0,-109.2],[24.2,-109.1],[24.5,-109.0],[24.8,-108.9],[25.0,-108.7],
    [25.3,-108.5],[25.5,-108.4],[25.8,-108.3],[26.0,-108.1],[26.3,-108.0],
    [26.5,-107.8],[26.8,-107.6],[27.0,-107.4],[27.3,-107.2],[27.6,-107.0],
    [27.8,-106.8],[28.0,-106.6],[28.3,-106.4],[28.5,-106.2],[28.8,-106.0],
    [29.0,-105.8],[29.3,-105.6],[29.5,-105.4],[29.8,-105.2],[30.0,-105.0],
    [30.3,-104.8],[30.5,-104.6],[30.8,-104.4],[31.0,-104.2],[31.3,-104.0],
    [31.5,-103.8],[31.7,-103.6],[31.8,-103.5],
    // Mainland Pacific — Sinaloa to Nayarit
    [23.2,-106.5],[23.4,-106.4],[23.6,-106.3],[23.8,-106.3],[24.0,-106.3],
    [24.2,-106.4],[24.4,-106.5],[24.6,-106.5],[24.8,-106.5],[25.0,-106.5],
    [25.2,-106.6],[25.4,-106.8],[25.6,-106.9],[25.8,-107.1],[26.0,-107.3],
    [26.2,-107.5],[26.4,-107.7],[26.6,-107.9],[26.8,-108.1],[27.0,-108.3],
    [27.2,-108.5],[27.4,-108.7],[27.6,-108.9],[27.8,-109.1],[28.0,-109.3],
    // Nayarit / Jalisco coast
    [22.0,-105.6],[22.2,-105.5],[22.4,-105.4],[22.6,-105.4],[22.8,-105.4],
    [21.5,-105.3],[21.6,-105.2],[21.7,-105.2],[21.8,-105.2],[21.9,-105.3],
    // Bay of Banderas — very dense
    [20.80,-105.60],[20.80,-105.55],[20.80,-105.50],[20.80,-105.45],
    [20.80,-105.40],[20.80,-105.35],[20.80,-105.30],[20.80,-105.25],
    [20.75,-105.60],[20.75,-105.55],[20.75,-105.50],[20.75,-105.45],
    [20.75,-105.40],[20.75,-105.35],[20.75,-105.30],[20.75,-105.25],
    [20.75,-105.20],[20.75,-105.15],[20.75,-105.10],[20.75,-105.06],
    [20.70,-105.60],[20.70,-105.55],[20.70,-105.50],[20.70,-105.45],
    [20.70,-105.40],[20.70,-105.35],[20.70,-105.30],[20.70,-105.25],
    [20.70,-105.20],[20.70,-105.15],[20.70,-105.10],[20.70,-105.06],
    [20.65,-105.50],[20.65,-105.45],[20.65,-105.40],[20.65,-105.35],
    [20.65,-105.30],[20.65,-105.25],[20.65,-105.20],[20.65,-105.15],
    [20.65,-105.10],[20.65,-105.06],
    [20.60,-105.45],[20.60,-105.40],[20.60,-105.35],[20.60,-105.30],
    [20.60,-105.25],[20.60,-105.20],[20.60,-105.15],[20.60,-105.10],
    [20.55,-105.40],[20.55,-105.35],[20.55,-105.30],[20.55,-105.25],
    [20.55,-105.20],[20.55,-105.15],[20.55,-105.10],
    [20.50,-105.35],[20.50,-105.30],[20.50,-105.25],[20.50,-105.20],
    [20.50,-105.15],[20.50,-105.10],
    [20.45,-105.30],[20.45,-105.25],[20.45,-105.20],[20.45,-105.15],
    [20.40,-105.25],[20.40,-105.20],[20.40,-105.15],
    [20.35,-105.20],[20.35,-105.15],
    // Costa Careyes / Chamela
    [19.50,-105.10],[19.45,-105.10],[19.40,-105.10],[19.35,-105.05],
    [19.30,-105.00],[19.25,-104.95],[19.20,-104.90],[19.15,-104.85],
    // Michoacan / Guerrero coast
    [19.10,-104.80],[19.05,-104.70],[19.00,-104.55],[18.95,-104.40],
    [18.90,-104.30],[18.85,-104.20],[18.80,-104.10],[18.75,-103.95],
    [18.70,-103.85],[18.65,-103.75],[18.60,-103.65],[18.55,-103.55],
    [18.50,-103.45],[18.45,-103.35],[18.40,-103.30],[18.35,-103.25],
    [18.30,-103.20],[18.25,-103.15],[18.20,-103.10],[18.15,-103.05],
    [18.10,-103.00],[18.05,-102.95],[18.00,-102.90],[17.95,-102.85],
    [17.90,-102.80],[17.85,-102.75],[17.80,-102.70],[17.75,-102.65],
    [17.70,-102.60],[17.65,-102.55],[17.60,-102.50],[17.55,-102.45],
    [17.50,-102.40],[17.45,-102.35],[17.40,-102.30],[17.35,-102.25],
    [17.30,-102.20],[17.25,-102.15],[17.20,-102.10],[17.15,-102.05],
    [17.10,-102.00],[17.05,-101.95],[17.00,-101.90],[16.95,-101.85],
    [16.90,-101.80],[16.85,-101.75],[16.80,-101.70],[16.75,-101.65],
    [16.70,-101.60],[16.65,-101.55],[16.60,-101.50],[16.55,-101.45],
    [16.50,-101.40],[16.45,-101.35],[16.40,-101.30],[16.35,-101.25],
    [16.30,-101.20],[16.25,-101.15],[16.20,-101.10],[16.15,-101.05],
    [16.10,-101.00],[16.05,-100.95],[16.00,-100.90],[15.95,-100.85],
    [15.90,-100.80],[15.85,-100.75],[15.80,-100.70],[15.75,-100.65],
    [15.70,-100.60],[15.65,-100.55],[15.60,-100.50],[15.55,-100.45],
    [15.50,-100.40],[15.45,-100.35],[15.40,-100.30],[15.35,-100.25],
    [15.30,-100.20],[15.25,-100.15],[15.20,-100.10],[15.15,-100.05],
    // Oaxaca / Chiapas coast
    [15.10,-100.00],[15.05,-99.95],[15.00,-99.90],[14.95,-99.85],
    [14.90,-99.80],[14.85,-99.75],[14.80,-99.70],[14.75,-99.65],
    [14.70,-99.60],[14.65,-99.55],[14.60,-99.50],[14.55,-99.45],
    [14.50,-99.40],[14.45,-99.35],[14.40,-99.30],[14.35,-99.25],
    [14.30,-99.20],[14.25,-99.15],[14.20,-99.10],[14.15,-99.05],
    [14.10,-99.00],[14.05,-98.95],[14.00,-98.90],[13.95,-98.85],
    [13.90,-98.80],[13.85,-98.75],[13.80,-98.70],[13.75,-98.65],
    [13.70,-98.60],[13.65,-98.55],[13.60,-98.50],[13.55,-98.45],
    [13.50,-98.40],[13.45,-98.35],[13.40,-98.30],[13.35,-98.25],
    [13.30,-98.20],[13.25,-98.15],[13.20,-98.10],[13.15,-98.05],
    [13.10,-98.00],[13.05,-97.95],[13.00,-97.90],[12.95,-97.85],
    [12.90,-97.80],[12.85,-97.75],[12.80,-97.70],[12.75,-97.65],
    [12.70,-97.60],[12.65,-97.55],[12.60,-97.50],[12.55,-97.45],
    [12.50,-97.40],[12.45,-97.35],[12.40,-97.30],[12.35,-97.25],
    [12.30,-97.20],[12.25,-97.15],[12.20,-97.10],[12.15,-97.05],
    [12.10,-97.00],[12.05,-96.95],[12.00,-96.90],[11.95,-96.85],
    [11.90,-96.80],[11.85,-96.75],[11.80,-96.70],[11.75,-96.65],
    [11.70,-96.60],[11.65,-96.55],[11.60,-96.50],[11.55,-96.45],
    [11.50,-96.40],[11.45,-96.35],[11.40,-96.30],[11.35,-96.25],
    [11.30,-96.20],[11.25,-96.15],[11.20,-96.10],[11.15,-96.05],
    [11.10,-96.00],[11.05,-95.95],[11.00,-95.90],[10.95,-95.85],
    [10.90,-95.80],[10.85,-95.75],[10.80,-95.70],[10.75,-95.65],
    [10.70,-95.60],[10.65,-95.55],[10.60,-95.50],[10.55,-95.45],
    [10.50,-95.40],[10.45,-95.35],[10.40,-95.30],[10.35,-95.25],
    [10.30,-95.20],[10.25,-95.15],[10.20,-95.10],[10.15,-95.05],
    [10.10,-95.00],[10.05,-94.95],[10.00,-94.90],[9.95,-94.85],
    [9.90,-94.80],[9.85,-94.75],[9.80,-94.70],[9.75,-94.65],
    [9.70,-94.60],[9.65,-94.55],[9.60,-94.50],[9.55,-94.45],
    [9.50,-94.40],[9.45,-94.35],[9.40,-94.30],[9.35,-94.25],
    [9.30,-94.20],[9.25,-94.15],[9.20,-94.10],[9.15,-94.05],
    [9.10,-94.00],[9.05,-93.95],[9.00,-93.90],[8.95,-93.85],
    [8.90,-93.80],[8.85,-93.75],[8.80,-93.70],[8.75,-93.65],
    [8.70,-93.60],[8.65,-93.55],[8.60,-93.50],[8.55,-93.45],
    [8.50,-93.40],[8.45,-93.35],[8.40,-93.30],[8.35,-93.25],
    [8.30,-93.20],[8.25,-93.15],[8.20,-93.10],[8.15,-93.05],
    [8.10,-93.00],[8.05,-92.95],[8.00,-92.90],[7.95,-92.85],
    // Guatemala border
    [7.90,-92.80],[7.85,-92.75],[7.80,-92.70],[7.75,-92.65],
    // Revillagigedo Islands
    [18.7,-112.1],[18.5,-111.5],[19.0,-110.5],
];

const BEACH_RADIUS_KM = 0.01; // 10 meters — snap to coast

function checkCoast(lat, lon) {
    let closestName = null;
    let minDist = Infinity;
    let closestLat = null;
    let closestLon = null;

    for (const point of COAST_POINTS) {
        const clat = point[0], clon = point[1];
        const d = haversine(lat, lon, clat, clon);
        if (d < minDist) {
            minDist = d;
            closestName = `${clat.toFixed(2)},${clon.toFixed(2)}`;
            closestLat = clat;
            closestLon = clon;
        }
        // Beach if within 10m of coast point
        if (d < BEACH_RADIUS_KM) {
            return { beached: true, coast: closestName, distanceKm: minDist, coastLat: clat, coastLon: clon };
        }
    }

    return { beached: false, coast: closestName, distanceKm: minDist, approaching: minDist < 1, coastLat: closestLat, coastLon: closestLon };
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
            // Bottle hits land — snap to coast point
            const beachLat = coast.coastLat || newLat;
            const beachLon = coast.coastLon || newLon;
            await db.prepare(`
                UPDATE bottles SET status = 'beached', beached_at = datetime('now'),
                current_lat = ?, current_lon = ?, distance_km = ?,
                updated_at = datetime('now') WHERE id = ?
            `).bind(beachLat, beachLon, (bottle.distance_km || 0) + distKm, bottle.id).run();

            // Log beaching event
            try {
                await db.prepare(`
                    INSERT INTO bottle_events (id, bottle_id, event_type, lat, lon, description, created_at)
                    VALUES (?, ?, 'beached', ?, ?, ?, datetime('now'))
                `).bind(crypto.randomUUID(), bottle.id, beachLat, beachLon,
                    `Bottle beached at ${coast.coast} after ${((bottle.distance_km || 0) + distKm).toFixed(1)} km`).run();
            } catch (e) { /* bottle_events table may not exist in this DB */ }

            beached = true;
            updated.push({ id: bottle.id, beached: true, lat: beachLat.toFixed(4), lon: beachLon.toFixed(4), distance_km: ((bottle.distance_km || 0) + distKm).toFixed(1) });
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
