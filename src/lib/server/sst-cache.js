// src/lib/server/sst-cache.js
// Fetches Sea Surface Temperature from NOAA OI v2.1 via ERDDAP
// Caches per-zone averages in D1 for drift model + narrator events

const ERDDAP_BASE = 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg_LonPM180.csv';

// Booty Quest ocean zones — mapped to drift model zones
const SST_ZONES = [
    { id: 'north-equatorial', name: 'N. Equatorial Current', min_lat: 8, max_lat: 20, min_lon: -130, max_lon: -100 },
    { id: 'equatorial-counter', name: 'Equatorial Counter Current', min_lat: 0, max_lat: 8, min_lon: -130, max_lon: -100 },
    { id: 'california-current', name: 'California Current', min_lat: 25, max_lat: 45, min_lon: -130, max_lon: -115 },
    { id: 'mexican-coastal', name: 'Mexican Coastal', min_lat: 15, max_lat: 23, min_lon: -110, max_lon: -100 },
    { id: 'open-ocean-pacific', name: 'Open Ocean Pacific', min_lat: 10, max_lat: 30, min_lon: -140, max_lon: -120 },
    { id: 'bahia-banderas', name: 'Bahía de Banderas', min_lat: 20.0, max_lat: 21.0, min_lon: -106.0, max_lon: -105.0 },
];

// Historical baseline temps per zone (°C) — approximate seasonal averages
const BASELINE_TEMPS = {
    'north-equatorial': 26,
    'equatorial-counter': 27,
    'california-current': 18,
    'mexican-coastal': 26,
    'open-ocean-pacific': 22,
    'bahia-banderas': 27,
};

/**
 * Fetch SST from NOAA ERDDAP and compute zone averages
 * Returns array of { zone_id, avg_sst, anomaly, data_points }
 */
export async function fetchSSTData() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2); // 2-day lag for final data
    const dateStr = yesterday.toISOString().split('T')[0] + 'T12:00:00Z';

    const allResults = [];

    for (const zone of SST_ZONES) {
        try {
            const url = `${ERDDAP_BASE}?sst[(${dateStr})][(0.0)][(${zone.min_lat}):(${zone.max_lat})][(${zone.min_lon}):(${zone.max_lon})]`;
            const resp = await fetch(url);
            if (!resp.ok) {
                console.error(`[SST] Failed for ${zone.id}: ${resp.status}`);
                allResults.push({ zone_id: zone.id, name: zone.name, avg_sst: null, anomaly: 0, data_points: 0 });
                continue;
            }

            const text = await resp.text();
            const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('time,')); // skip header

            let sum = 0, count = 0;
            for (const line of lines) {
                const parts = line.split(',');
                const val = parseFloat(parts[4]);
                if (!isNaN(val)) {
                    sum += val;
                    count++;
                }
            }

            const avgSST = count > 0 ? parseFloat((sum / count).toFixed(2)) : null;
            const baseline = BASELINE_TEMPS[zone.id] || 24;
            const anomaly = avgSST ? parseFloat((avgSST - baseline).toFixed(2)) : 0;

            allResults.push({
                zone_id: zone.id,
                name: zone.name,
                avg_sst: avgSST,
                anomaly,
                data_points: count,
                fetched_at: new Date().toISOString(),
            });
        } catch (err) {
            console.error(`[SST] Error for ${zone.id}:`, err.message);
            allResults.push({ zone_id: zone.id, name: zone.name, avg_sst: null, anomaly: 0, data_points: 0 });
        }
    }

    return allResults;
}

/**
 * Save SST data to D1 for drift model to use
 */
export async function cacheSSTData(db, sstData) {
    for (const zone of sstData) {
        if (zone.avg_sst === null) continue;
        await db.prepare(`
            INSERT INTO sst_cache (zone_id, zone_name, avg_sst, anomaly, data_points, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(zone_id) DO UPDATE SET
                zone_name = excluded.zone_name,
                avg_sst = excluded.avg_sst,
                anomaly = excluded.anomaly,
                data_points = excluded.data_points,
                updated_at = excluded.updated_at
        `).bind(zone.zone_id, zone.name, zone.avg_sst, zone.anomaly, zone.data_points).run();
    }
}

/**
 * Get SST multiplier for drift model
 * Warmer = faster currents, colder = slower
 * Returns speed multiplier (0.6 - 1.5)
 */
export function sstDriftMultiplier(sst, baseline) {
    if (!sst || !baseline) return 1.0;
    const diff = sst - baseline;
    // +3°C → 1.5x, -3°C → 0.6x, 0°C diff → 1.0x
    return Math.max(0.6, Math.min(1.5, 1.0 + diff * 0.17));
}

/**
 * Generate narrator event context based on SST anomalies
 * Returns array of narrative seeds for the narrator AI
 */
export function generateSSTNarrativeContext(sstData) {
    const events = [];

    for (const zone of sstData) {
        if (zone.avg_sst === null) continue;

        const abs = Math.abs(zone.anomaly);
        if (abs < 1.0) continue; // Skip minor fluctuations

        if (zone.anomaly > 2.5) {
            events.push({
                type: 'weather',
                severity: 'extreme',
                zone: zone.name,
                message: `Aguas inusualmente cálidas (${zone.avg_sst}°C, +${zone.anomaly}°C sobre lo normal) en ${zone.name}. Corrientes aceleradas — las botellas corren. Los pescadores antiguos recuerdan años así: años de tormentas.`,
                effects: { drift_speed_mult: 1.5, fuel_bonus: 30 },
            });
        } else if (zone.anomaly > 1.0) {
            events.push({
                type: 'weather',
                severity: 'moderate',
                zone: zone.name,
                message: `Corrientes cálidas al acecho en ${zone.name} — ${zone.avg_sst}°C, ${zone.anomaly > 0 ? '+' : ''}${zone.anomaly}°C de lo habitual. Los que naveguen hoy encontrarán viento a favor.`,
                effects: { drift_speed_mult: 1.2 },
            });
        } else if (zone.anomaly < -2.0) {
            events.push({
                type: 'weather',
                severity: 'extreme',
                zone: zone.name,
                message: `Aguas frías anómalas (${zone.avg_sst}°C, ${zone.anomaly}°C) invaden ${zone.name}. Las corrientes se arrastra. Los mariscos huyen al sur — y las botellas también, lentamente.`,
                effects: { drift_speed_mult: 0.6 },
            });
        } else if (zone.anomaly < -1.0) {
            events.push({
                type: 'weather',
                severity: 'moderate',
                zone: zone.name,
                message: `Un escalofrío oceánico en ${zone.name}: ${zone.avg_sst}°C. Las corrientes se ralentizan. Paciencia, navegantes — la velocidad no es todo.`,
                effects: { drift_speed_mult: 0.8 },
            });
        }
    }

    return events;
}
