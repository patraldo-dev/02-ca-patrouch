import { json } from "@sveltejs/kit";
async function POST({ request, platform, getClientAddress }) {
  try {
    const db = platform?.env?.DB_book;
    if (!db) {
      return json({ error: "Database unavailable" }, { status: 503 });
    }
    const { eventType, entityId, metadata } = await request.json();
    const ipAddress = getClientAddress();
    const sessionHash = await hashString(ipAddress);
    const country = request.headers.get("cf-ipcountry") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    let device = "unknown";
    if (userAgent.includes("Mobile")) device = "mobile";
    else if (userAgent.includes("Tablet")) device = "tablet";
    else if (userAgent.includes("bot") || userAgent.includes("crawl")) device = "bot";
    else device = "desktop";
    await db.prepare(`
      INSERT INTO analytics_events (event_type, entity_id, session_hash, user_agent, device, country, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      eventType,
      entityId || null,
      sessionHash,
      userAgent,
      device,
      country,
      JSON.stringify(metadata || {})
    ).run();
    return json({ success: true });
  } catch (error) {
    console.error("Analytics error:", error);
    return json({ error: "Failed to record analytics" }, { status: 500 });
  }
}
async function GET({ url, platform }) {
  try {
    const db = platform?.env?.DB_book;
    if (!db) {
      return json({ error: "Database unavailable" }, { status: 503 });
    }
    const days = parseInt(url.searchParams.get("days") || "30");
    const eventType = url.searchParams.get("event");
    const overview = await db.prepare(`
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT session_hash) as unique_visitors,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      ${eventType ? "AND event_type = ?" : ""}
    `).bind(days, ...eventType ? [eventType] : []).all();
    const byType = await db.prepare(`
      SELECT event_type, COUNT(*) as count, COUNT(DISTINCT session_hash) as unique_visitors
      FROM analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY event_type
      ORDER BY count DESC
    `).bind(days).all();
    const countries = await db.prepare(`
      SELECT country, COUNT(DISTINCT session_hash) as visitors
      FROM analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      AND device != 'bot'
      GROUP BY country
      ORDER BY visitors DESC
      LIMIT 15
    `).bind(days).all();
    const devices = await db.prepare(`
      SELECT device, COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      AND device != 'bot'
      GROUP BY device
      ORDER BY count DESC
    `).bind(days).all();
    const daily = await db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as events, COUNT(DISTINCT session_hash) as visitors
      FROM analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).bind(days).all();
    const topWritings = await db.prepare(`
      SELECT e.entity_id, w.title, COUNT(*) as views, COUNT(DISTINCT e.session_hash) as unique_visitors
      FROM analytics_events e
      LEFT JOIN writings w ON e.entity_id = w.id
      WHERE e.event_type = 'view_writing'
        AND e.created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY e.entity_id
      ORDER BY views DESC
      LIMIT 10
    `).bind(days).all();
    return json({
      overview: overview.results?.[0] || {},
      byType: byType.results || [],
      countries: countries.results || [],
      devices: devices.results || [],
      daily: daily.results || [],
      topWritings: topWritings.results || []
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
export {
  GET,
  POST
};
