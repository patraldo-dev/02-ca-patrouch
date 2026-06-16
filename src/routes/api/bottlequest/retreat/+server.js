// src/routes/api/bottlequest/retreat/+server.js
// Retreat to Los Muertos Pier — strategic home base

import { json } from '@sveltejs/kit';
import { retreatToPier } from '$lib/server/pier.js';

export async function POST({ locals, platform }) {
    const db = platform?.env?.DB_book;
    const user = locals.user;
    if (!user || !db) return json({ error: 'Not authenticated' }, { status: 401 });

    try {
        const player = await db.prepare(`
            SELECT id, username, lat, lon, fuel, checkin_fuel, paralyzed_until, retreat_until, type
            FROM bq_players WHERE username = ? AND type = 'human'
        `).bind(user.username).first();

        if (!player) return json({ error: 'Not a player' }, { status: 403 });

        // Rank check — First Mate+ required to retreat
        const { hasRank, RANK_GATES, getRank } = await import('$lib/ranks.js');
        const playerPoints = player.booty_points || player.points || 0;
        if (!hasRank(playerPoints, RANK_GATES.pierRetreat)) {
            const rank = getRank(playerPoints);
            return json({ error: `Retreat requires First Mate rank. You are ${rank.title}.`, rank: rank.id }, { status: 403 });
        }

        // Can't retreat while paralyzed (unless already at pier)
        if (player.paralyzed_until) {
            const pUntil = new Date(player.paralyzed_until.replace(' ', 'T') + 'Z');
            if (pUntil > new Date()) {
                return json({ error: 'Paralyzed by El Narrador — cannot retreat', paralyzed_until: player.paralyzed_until }, { status: 403 });
            }
        }

        // Get market for cost calculation
        const market = await db.prepare("SELECT cost_per_km FROM bq_market WHERE id = 'daily'").first();
        const costPerKm = market?.cost_per_km || 0.73;

        const result = await retreatToPier(db, player, costPerKm);
        return json(result, { status: result.success ? 200 : 400 });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
