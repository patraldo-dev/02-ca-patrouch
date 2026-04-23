import { json } from '@sveltejs/kit';

/**
 * GET: List all Booty Bots (public)
 * POST: Execute bot AI decisions (cron only, auth required)
 * PATCH: Hijack a bot (member+, costs beans)
 */

const BOT_BEHAVIORS = {
    'bb-triste': {
        style: 'aggressive',
        moveChance: 0.8,
        hijackCost: 30,
        captureBonus: 2,
    },
    'bb-nemo': {
        style: 'saboteur',
        moveChance: 0.6,
        hijackCost: 40,
        captureBonus: 3,
    },
    'bb-garfio': {
        style: 'ambusher',
        moveChance: 0.9,
        hijackCost: 25,
        captureBonus: 1,
    }
};

export async function GET({ platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ bots: [] });

    try {
        const { results } = await db.prepare('SELECT * FROM bq_booty_bots ORDER BY name').all();
        return json({ bots: results || [] });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

export async function POST({ request, platform, locals }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    // Only admin or cron can trigger bot actions
    if (locals.user.role !== 'admin') return json({ error: 'Admin only' }, { status: 403 });

    try {
        const body = await request.json();
        const { botId, action, targetLat, targetLon, bottleId } = body;

        if (action === 'move') {
            const bot = await db.prepare('SELECT * FROM bq_booty_bots WHERE id = ?').bind(botId).first();
            if (!bot) return json({ error: 'Bot not found' }, { status: 404 });

            const behavior = BOT_BEHAVIORS[bot.username] || BOT_BEHAVIORS['capitan-garfio'];

            // Calculate move cost
            const latDiff = Math.abs(targetLat - bot.lat);
            const lonDiff = Math.abs(targetLon - bot.lon);
            const distDeg = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
            const distKm = distDeg * 111;

            // Get market data for cost
            const market = await db.prepare("SELECT brent_price FROM bq_market WHERE id = 'daily'").first();
            const brent = market?.brent_price || 73;
            const cost = Math.ceil(distKm * (brent / 100) * 0.5); // Bots pay half cost

            if (bot.beans < cost) return json({ error: 'Insufficient beans', bot: bot.username, cost });

            await db.prepare('UPDATE bq_booty_bots SET lat = ?, lon = ?, beans = beans - ? WHERE id = ?')
                .bind(targetLat, targetLon, cost, botId).run();

            return json({ success: true, bot: bot.username, moved: true, cost, newLat: targetLat, newLon: targetLon });
        }

        if (action === 'capture') {
            const bot = await db.prepare('SELECT * FROM bq_booty_bots WHERE id = ?').bind(botId).first();
            if (!bot) return json({ error: 'Bot not found' }, { status: 404 });

            await db.prepare('UPDATE bq_booty_bots SET captured_bottles = captured_bottles + 1, beans = beans + 50 WHERE id = ?')
                .bind(botId).run();

            return json({ success: true, bot: bot.username, captured: true, bottleId });
        }

        return json({ error: 'Unknown action' }, { status: 400 });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH({ request, locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { botId, hours } = await request.json();
        if (!botId || !hours || hours < 1 || hours > 12) {
            return json({ error: 'Provide botId and hours (1-12)' }, { status: 400 });
        }

        const bot = await db.prepare('SELECT * FROM bq_booty_bots WHERE id = ?').bind(botId).first();
        if (!bot) return json({ error: 'Bot not found' }, { status: 404 });

        // Check if already hijacked
        if (bot.hijacked_by && bot.hijacked_until && new Date(bot.hijacked_until) > new Date()) {
            return json({ error: `Already hijacked by ${bot.hijacked_by} until ${bot.hijacked_until}` }, { status: 409 });
        }

        const behavior = BOT_BEHAVIORS[bot.username] || BOT_BEHAVIORS['capitan-garfio'];
        const cost = behavior.hijackCost * hours;

        // Check player beans
        const player = await db.prepare('SELECT fuel FROM bq_players WHERE username = ?').bind(locals.user.username).first();
        if (!player || player.fuel < cost) {
            return json({ error: `Need ${cost} beans to hijack for ${hours}h. You have ${player?.fuel || 0}.` }, { status: 400 });
        }

        const until = new Date(Date.now() + hours * 3600000).toISOString();

        await db.prepare('UPDATE bq_players SET fuel = fuel - ? WHERE username = ?').bind(cost, locals.user.username).run();
        await db.prepare('UPDATE bq_booty_bots SET hijacked_by = ?, hijacked_until = ? WHERE id = ?')
            .bind(locals.user.username, until, botId).run();

        return json({ success: true, hijacked: bot.name, by: locals.user.username, hours, cost, until });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
