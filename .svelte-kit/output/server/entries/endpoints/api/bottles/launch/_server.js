import { json } from "@sveltejs/kit";
const COAST_POINTS = [
  [23, -110],
  [22.5, -110],
  [22, -110.5],
  [21, -111],
  [20.5, -105.5],
  [19, -104.5],
  [18.5, -103.5],
  [17.5, -101.5],
  [16.5, -99.5],
  [15.5, -97.5],
  [14.5, -95],
  [13.5, -92],
  [12, -87],
  [11, -85],
  [10, -84],
  [9, -80],
  [8, -79],
  [7, -78],
  [6, -77],
  [5, -76],
  [4, -77.5],
  [3, -77.5],
  [2, -78],
  [1, -79.5],
  [0, -80],
  [-1, -80.5],
  [-2, -81],
  [-3, -80.5],
  [-4, -80.5],
  [-5, -81],
  [-6, -81],
  [-7, -79.5],
  [-8, -79],
  [-9, -79.5],
  [-10, -78.5],
  [-11, -77.5],
  [-12, -77],
  [-13, -76.5],
  [-14, -76],
  [-15, -75.5],
  [-16, -74],
  [-17, -72],
  [-18, -70.5]
];
function isNearCoast(lat, lon, threshold = 0.5) {
  for (const [clat, clon] of COAST_POINTS) {
    const dist = Math.sqrt((lat - clat) ** 2 + (lon - clon) ** 2);
    if (dist < threshold) return true;
  }
  return false;
}
function driftBottle(bottle) {
  const bottleFactors = {
    glass: { speedMult: 0.8, dirVariation: 0.1 },
    // deep current
    plastic: { speedMult: 1.3, dirVariation: 0.3 },
    // surface wind
    cork: { speedMult: 1, dirVariation: 0.2 }
    // medium
  };
  const factor = bottleFactors[bottle.bottle_type] || bottleFactors.glass;
  const baseSpeed = 0.5;
  const speed = baseSpeed * factor.speedMult * (0.8 + Math.random() * 0.4);
  const hoursPerTick = 6;
  const distDeg = speed * hoursPerTick * 5e-4;
  const baseHeading = 245;
  const variation = (Math.random() - 0.5) * factor.dirVariation * 360;
  const heading = baseHeading + variation;
  const rad = heading * Math.PI / 180;
  const dLat = Math.cos(rad) * distDeg;
  const dLon = Math.sin(rad) * distDeg / Math.cos(bottle.current_lat * Math.PI / 180);
  const newLat = bottle.current_lat + dLat;
  const newLon = bottle.current_lon + dLon;
  const distKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
  return {
    lat: newLat,
    lon: newLon,
    heading,
    speed_knots: speed,
    distKm,
    beached: isNearCoast(newLat, newLon)
  };
}
async function POST({ platform, request }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: "Database not available" }, { status: 500 });
  const body = await request.json();
  const { bottle_id } = body;
  if (!bottle_id) return json({ error: "bottle_id required" }, { status: 400 });
  const bottle = await db.prepare("SELECT * FROM bottles WHERE id = ?").bind(bottle_id).first();
  if (!bottle) return json({ error: "Not found" }, { status: 404 });
  if (!["launched", "sailing"].includes(bottle.status)) {
    return json({ error: "Bottle is not sailing" }, { status: 400 });
  }
  const result = driftBottle(bottle);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newStatus = result.beached ? "beached" : "sailing";
  const updates = [
    "status = ?",
    "current_lat = ?",
    "current_lon = ?",
    "distance_km = distance_km + ?",
    "updated_at = datetime('now')"
  ];
  const values = [newStatus, result.lat, result.lon, result.distKm, bottle_id];
  if (result.beached) {
    updates.push("beached_at = ?");
    values.splice(values.length - 1, 0, now);
  }
  await db.prepare(`UPDATE bottles SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
  await db.prepare(`
    INSERT INTO bottle_positions (id, bottle_id, lat, lon, heading, speed_knots, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), bottle_id, result.lat, result.lon, result.heading, result.speed_knots, now).run();
  return json({
    status: newStatus,
    lat: result.lat,
    lon: result.lon,
    distance_km: (bottle.distance_km || 0) + result.distKm,
    beached: result.beached
  });
}
export {
  POST
};
