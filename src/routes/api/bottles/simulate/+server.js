import { json } from '@sveltejs/kit';

export async function POST({ platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  try {
    const { results: bottles } = await db.prepare(`
      SELECT * FROM bottles WHERE status IN ('launched', 'sailing')
    `).all();

    if (!bottles.length) return json({ simulated: 0 });

    let drifted = 0;
    for (const bottle of bottles) {
      // Call the drift logic inline
      const bottleFactors = {
        glass: { speedMult: 0.8, dirVariation: 0.1 },
        plastic: { speedMult: 1.3, dirVariation: 0.3 },
        cork: { speedMult: 1.0, dirVariation: 0.2 },
      };
      const factor = bottleFactors[bottle.bottle_type] || bottleFactors.glass;
      const speed = 0.5 * factor.speedMult * (0.8 + Math.random() * 0.4);
      const hoursPerTick = 6;
      const distDeg = speed * hoursPerTick * 0.0005;
      const baseHeading = 245;
      const variation = (Math.random() - 0.5) * factor.dirVariation * 360;
      const heading = baseHeading + variation;
      const rad = heading * Math.PI / 180;
      const dLat = Math.cos(rad) * distDeg;
      const dLon = Math.sin(rad) * distDeg / Math.cos(bottle.current_lat * Math.PI / 180);
      const newLat = bottle.current_lat + dLat;
      const newLon = bottle.current_lon + dLon;
      const distKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111;

      // Simple coast check
      const coastPoints = [
        [20.5, -105.5], [19.0, -104.5], [17.5, -101.5], [15.5, -97.5],
        [12.0, -87.0], [9.0, -80.0], [5.0, -76.0], [0.0, -80.0],
        [-5.0, -81.0], [-12.0, -77.0], [-18.0, -70.5],
      ];
      let beached = false;
      for (const [clat, clon] of coastPoints) {
        if (Math.sqrt((newLat - clat) ** 2 + (newLon - clon) ** 2) < 0.5) {
          beached = true;
          break;
        }
      }

      const now = new Date().toISOString();
      const newStatus = beached ? 'beached' : 'sailing';

      const updates = ["status = ?", "current_lat = ?", "current_lon = ?",
        "distance_km = distance_km + ?", "updated_at = datetime('now')"];
      const vals = [newStatus, newLat, newLon, distKm, bottle.id];

      if (beached) {
        updates.push("beached_at = ?");
        vals.splice(vals.length - 1, 0, now);
      }

      await db.prepare(`UPDATE bottles SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
      await db.prepare(`
        INSERT INTO bottle_positions (id, bottle_id, lat, lon, heading, speed_knots, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), bottle.id, newLat, newLon, heading, speed, now).run();

      drifted++;
    }

    return json({ simulated: drifted });
  } catch (e) {
    console.error('Simulation error:', e);
    return json({ error: 'Simulation failed' }, { status: 500 });
  }
}
