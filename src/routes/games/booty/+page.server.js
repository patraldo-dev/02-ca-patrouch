export async function load({ locals, url, platform }) {
  const db = platform?.env?.DB_book;
  let bottles = [];
  let players = [];
  let playersInPursuit = 0;
  let myPlayer = null;

  if (db) {
    try {
      const { results } = await db.prepare(`
        SELECT b.* FROM bottles b WHERE b.status IN ('launched', 'sailing', 'beached', 'found')
        ORDER BY b.created_at DESC
      `).all();
      bottles = results || [];

      for (const bottle of bottles) {
        const pos = await db.prepare(`
          SELECT lat, lon, recorded_at FROM bottle_positions WHERE bottle_id = ? ORDER BY recorded_at ASC
        `).bind(bottle.id).all();
        bottle.positions = pos.results || [];
      }
    } catch (e) {
      console.error('Bottles page load error:', e);
    }

    // Players
    try {
      const { results: pr } = await db.prepare(`
        SELECT p.id, p.username, p.display_name, p.lat, p.lon, p.port_id,
               p.type, p.points, p.fuel, p.solo, p.avatar_url, p.arbooty_points, p.booty_points, p.games,
               t.name as team_name, t.color as team_color, pt.name as port_name
        FROM bq_players p
        LEFT JOIN bq_teams t ON p.team_id = t.id
        LEFT JOIN bq_ports pt ON p.port_id = pt.id
      `).all();
      players = pr || [];
      const { results: pip } = await db.prepare(`
        SELECT COUNT(*) as cnt FROM bq_players WHERE type = 'human'
      `).all();
      playersInPursuit = pip?.[0]?.cnt || 0;
    } catch (e) {
      console.error('Players load error:', e);
    }

    // Market
    let market = { brent_price: 73, fed_rate: 5.25, cost_per_km: 0.73, brent_change: 0, fed_change: 0 };
    try {
      market = await db.prepare(`SELECT * FROM bq_market WHERE id = 'daily'`).first() || market;
    } catch {}

    if (locals.user) {
      try {
        myPlayer = await db.prepare('SELECT id FROM bq_players WHERE username = ? OR display_name = ?').bind(locals.user.username, locals.user.username).first();
        if (myPlayer) {
          const { results: beans } = await db.prepare(`SELECT bean_type, amount FROM bq_bean_inventory WHERE player_id = ?`).bind(myPlayer.id).all();
          myPlayer.beans = {};
          for (const b of (beans || [])) myPlayer.beans[b.bean_type] = b.amount;
        }
 } catch {}
    }

    // Betting odds
    let odds = [];
    try {
      const activeBottles = bottles.filter(b => b.status === 'launched' || b.status === 'sailing');
      for (const bottle of activeBottles) {
        if (!bottle.positions?.length) continue;
        const bLat = bottle.positions[bottle.positions.length - 1].lat;
        const bLon = bottle.positions[bottle.positions.length - 1].lon;
        const humanPlayers = players.filter(p => p.type === 'human');
        const bottleOdds = humanPlayers.map(p => {
          const dLat = p.lat - bLat;
          const dLon = p.lon - bLon;
          const dist = Math.sqrt(dLat * dLat + dLon * dLon);
          return { player: p, distance: dist, odds: Math.max(1.1, Math.ceil(dist * 20) / 10) };
        }).sort((a, b) => a.odds - b.odds).slice(0, 4);
        odds.push({ bottle_id: bottle.id, title: bottle.title, odds: bottleOdds });
      }
    } catch {}

    // Booty Bots
    let bots = [];
    try {
      const { results: br } = await db.prepare('SELECT * FROM bq_booty_bots').all();
      bots = br || [];
    } catch {}

    return {
      serverLocale: locals.locale || "es",
      user: locals.user || null,
      bottles,
      players,
      playersInPursuit,
      bots,
      market,
      myPlayer,
      odds
    };
  }

    return {
      serverLocale: locals.locale || "es",
      user: locals.user || null,
      bottles,
      players: [],
      playersInPursuit: 0,
      bots: [],
      myPlayer: null,
      market: { brent_price: 73, fed_rate: 5.25, cost_per_km: 0.73, brent_change: 0, fed_change: 0 }
    };
}
