import { json } from '@sveltejs/kit';

// POST: transfer fuel between players
// GET: transfer history for a player

export async function POST({ request, locals }) {
    const db = locals.db;
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { to_player_id, amount, note } = await request.json();
        if (!to_player_id || !amount || amount < 1) {
            return json({ error: 'Invalid transfer' }, { status: 400 });
        }

        // Find sender's player record
        const sender = await db.prepare(
            `SELECT id, fuel, type FROM bq_players WHERE user_id = ?`
        ).bind(locals.user.id).first();
        if (!sender) return json({ error: 'No player found' }, { status: 404 });

        // Can't send to self
        if (sender.id === to_player_id) {
            return json({ error: "Can't transfer to yourself" }, { status: 400 });
        }

        // Verify recipient exists
        const recipient = await db.prepare(
            `SELECT id FROM bq_players WHERE id = ?`
        ).bind(to_player_id).first();
        if (!recipient) return json({ error: 'Recipient not found' }, { status: 404 });

        // Max 50% of current fuel per day
        const today = new Date().toISOString().split('T')[0];
        const { results: todayTransfers } = await db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total FROM bq_transfers WHERE from_player_id = ? AND date(created_at) = ?`
        ).bind(sender.id, today).all();
        const todayTotal = todayTransfers?.[0]?.total || 0;
        const maxTransfer = Math.floor(sender.fuel * 0.5);

        if (todayTotal + amount > maxTransfer) {
            return json({ error: `Daily limit: can only send ${maxTransfer - todayTotal} more fuel today (50% cap)` }, { status: 429 });
        }

        // Check sufficient fuel
        if (sender.fuel < amount) {
            return json({ error: `Insufficient fuel. You have ${sender.fuel}` }, { status: 400 });
        }

        // Execute transfer with 3% bot bank commission
        const fee = Math.ceil(amount * 0.03);
        const received = amount - fee;

        await db.prepare(`UPDATE bq_players SET fuel = fuel - ? WHERE id = ?`).bind(amount, sender.id).run();
        await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(received, to_player_id).run();

        // Commission goes to bot players (split equally)
        const { results: bots } = await db.prepare(`SELECT id FROM bq_players WHERE type = 'ai'`).all();
        const botShare = bots?.length ? Math.ceil(fee / bots.length) : fee;
        for (const bot of bots) {
            await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(botShare, bot.id).run();
        }

        // Track total fees collected
        await db.prepare(`UPDATE bq_bank SET total_fees_collected = total_fees_collected + ?, last_updated = datetime('now') WHERE id = 'the-bank'`).bind(fee).run();

        await db.prepare(
            `INSERT INTO bq_transfers (id, from_player_id, to_player_id, amount, note) VALUES (?, ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), sender.id, to_player_id, amount, (note || '').slice(0, 100)).run();

        // Get updated sender fuel
        const updated = await db.prepare(`SELECT fuel FROM bq_players WHERE id = ?`).bind(sender.id).first();

        return json({
            message: `Transferred ${received} fuel (fee: ${fee})`,
            remaining_fuel: updated?.fuel || 0,
            daily_used: todayTotal + amount,
            daily_max: maxTransfer,
            fee,
            received
        });

    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

export async function GET({ url, locals }) {
    const db = locals.db;
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const player = await db.prepare(
            `SELECT id FROM bq_players WHERE user_id = ?`
        ).bind(locals.user.id).first();
        if (!player) return json({ transfers: [] });

        const { results: transfers } = await db.prepare(`
            SELECT t.id, t.amount, t.note, t.created_at,
                   fp.display_name as from_name, fp.username as from_username,
                   tp.display_name as to_name, tp.username as to_username
            FROM bq_transfers t
            LEFT JOIN bq_players fp ON t.from_player_id = fp.id
            LEFT JOIN bq_players tp ON t.to_player_id = tp.id
            WHERE t.from_player_id = ? OR t.to_player_id = ?
            ORDER BY t.created_at DESC LIMIT 50
        `).bind(player.id, player.id).all();

        return json({ transfers: transfers || [] });

    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
