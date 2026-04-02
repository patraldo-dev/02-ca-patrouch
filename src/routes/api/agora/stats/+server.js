// src/routes/api/agora/stats/+server.js
import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
    const db = locals.db;
    if (!db) return json({ error: 'No database' }, { status: 503 });

    // Get total reveals from analytics
    const reveals = await db.prepare(`
        SELECT metadata FROM analytics_events WHERE event_type = 'agora_reveal'
    `).all();

    const events = reveals.results || [];
    const totalReveals = events.length;
    let aiCount = 0;
    let humanCount = 0;

    for (const e of events) {
        try {
            const meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
            if (meta.role === 'agent') aiCount++;
            else humanCount++;
        } catch {}
    }

    // Unique players = unique session_hash
    const players = await db.prepare(`
        SELECT COUNT(DISTINCT session_hash) as count FROM analytics_events WHERE event_type = 'agora_reveal'
    `).first();

    return json({
        totalReveals,
        aiCount,
        humanCount,
        accuracy: totalReveals > 0 ? Math.round((humanCount / totalReveals) * 100) : 0,
        uniquePlayers: players?.count || 0
    });
}
