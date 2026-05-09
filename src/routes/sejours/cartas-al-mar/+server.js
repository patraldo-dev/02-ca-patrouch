import { json } from '@sveltejs/kit';

// Cartas al Mar — ocean drift simulation endpoint
// Calculates trajectory from launch point to destination using real current data

const CURRENT_ZONES = {
    'california-current': { lat: 30, lon: -120, speedMs: 0.15, dirDeg: 220, tempC: 16 },
    'north-equatorial': { lat: 15, lon: -115, speedMs: 0.25, dirDeg: 260, tempC: 26 },
    'north-pacific': { lat: 35, lon: -150, speedMs: 0.20, dirDeg: 270, tempC: 18 },
    'equatorial-counter': { lat: 5, lon: -130, speedMs: 0.30, dirDeg: 80, tempC: 27 },
};

const LAUNCH_POINTS = {
    'bahia-banderas': { lat: 20.65, lon: -105.35, name: 'Bahía de Banderas, MX' },
    'ensenada': { lat: 31.87, lon: -116.60, name: 'Ensenada, MX' },
    'santa-monica': { lat: 34.01, lon: -118.50, name: 'Santa Monica, CA' },
    'cabo-san-lucas': { lat: 22.89, lon: -109.92, name: 'Cabo San Lucas, MX' },
};

const DESTINATIONS = {
    'hawaii': { lat: 21.31, lon: -157.86, name: 'Hawaiʻi' },
    'galapagos': { lat: -0.74, lon: -90.31, name: 'Galápagos' },
    'tahiti': { lat: -17.53, lon: -149.57, name: 'Tahití' },
    'tokyo': { lat: 35.68, lon: 139.69, name: 'Tokyo' },
};

function getZone(lat, lon) {
    // Simplified zone detection based on position
    if (lat > 25 && lon > -125) return 'california-current';
    if (lat > 25 && lon < -125) return 'north-pacific';
    if (lat >= 5 && lon > -130) return 'north-equatorial';
    if (lat < 10 && lon < -130) return 'equatorial-counter';
    return 'north-equatorial';
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Simulate drift with daily steps
function simulateDrift(startLat, startLon, endLat, endLon, daysMax = 60) {
    const positions = [{ lat: startLat, lon: startLon, day: 0 }];
    let lat = startLat, lon = startLon;

    for (let day = 1; day <= daysMax; day++) {
        const zone = getZone(lat, lon);
        const current = CURRENT_ZONES[zone];

        // Daily drift: speed * 86400 seconds, with some randomness
        const dailyDistKm = (current.speedMs + (Math.random() - 0.5) * 0.05) * 86400 / 1000;
        const baseDir = current.dirDeg * Math.PI / 180;

        // Bias toward destination
        const destDir = Math.atan2(endLat - lat, endLon - lon);
        const dir = baseDir * 0.7 + destDir * 0.3 + (Math.random() - 0.5) * 0.3;

        lat += Math.sin(dir) * dailyDistKm / 111;
        lon += Math.cos(dir) * dailyDistKm / (111 * Math.cos(lat * Math.PI / 180));

        positions.push({ lat: +lat.toFixed(4), lon: +lon.toFixed(4), day, zone, tempC: current.tempC });

        // Check if arrived within ~50km
        if (haversineKm(lat, lon, endLat, endLon) < 50) {
            positions.push({ lat: endLat, lon: endLon, day, arrived: true });
            break;
        }
    }

    return positions;
}

export async function GET({ url }) {
    const launch = url.searchParams.get('launch') || 'bahia-banderas';
    const dest = url.searchParams.get('dest') || 'hawaii';

    const start = LAUNCH_POINTS[launch];
    const end = DESTINATIONS[dest];

    if (!start || !end) return json({ error: 'Invalid launch/destination' }, { status: 400 });

    const trajectory = simulateDrift(start.lat, start.lon, end.lat, end.lon);
    const totalDays = trajectory[trajectory.length - 1].day;
    const arrived = trajectory[trajectory.length - 1]?.arrived || false;
    const totalKm = haversineKm(start.lat, start.lon, end.lat, end.lon);

    return json({
        launch: { ...start, id: launch },
        destination: { ...end, id: dest },
        trajectory,
        totalDays,
        arrived,
        totalKm: Math.round(totalKm),
        estimatedWeeks: Math.ceil(totalDays / 7),
    });
}

export async function POST({ request, platform }) {
    // Create a new Carta al Mar (future: save to D1)
    const { letter, launchPoint, destination, senderName } = await request.json();

    if (!letter || !launchPoint || !destination) {
        return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For now, return the simulation
    const start = LAUNCH_POINTS[launchPoint];
    const end = DESTINATIONS[destination];

    if (!start || !end) return json({ error: 'Invalid points' }, { status: 400 });

    const trajectory = simulateDrift(start.lat, start.lon, end.lat, end.lon);

    return json({
        id: crypto.randomUUID(),
        letter,
        senderName: senderName || 'Anónimo',
        launch: { ...start, id: launchPoint },
        destination: { ...end, id: destination },
        trajectory,
        totalDays: trajectory[trajectory.length - 1].day,
        arrived: trajectory[trajectory.length - 1]?.arrived || false,
        createdAt: new Date().toISOString(),
    });
}
