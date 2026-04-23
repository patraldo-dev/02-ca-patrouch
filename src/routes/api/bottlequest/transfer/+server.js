import { json } from '@sveltejs/kit';
import { logTransaction } from '$lib/server/bottlequest-logger';

export async function POST({ request, locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { to_player_id, amount, note } = await request.json();
        if (!to_player_id || !amount || amount < 0.01) {
            return json({ error: 'Invalid transfer' }, { status: 400 });
        }

        const sender = await db.prepare(
            `SELECT id, fuel, type, paralyzed_until FROM bq_players WHERE username = ?`
        ).bind(locals.user.username).first();
        if (!sender) return json({ error: 'No player found' }, { status: 404 });
        if (sender.paralyzed_until && new Date(sender.paralyzed_until.replace(' ', 'T') + 'Z') > new Date()) {
            return json({ error: 'Paralyzed by El Narrador', paralyzed_until: sender.paralyzed_until }, { status: 403 });
        }

        if (sender.id === to_player_id) {
            return json({ error: "Can't transfer to yourself" }, { status: 400 });
        }

        const recipient = await db.prepare(`SELECT id FROM bq_players WHERE id = ?`).bind(to_player_id).first();
        if (!recipient) return json({ error: 'Recipient not found' }, { status: 404 });

        const today = new Date().toISOString().split('T')[0];
        const { results: todayTransfers } = await db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total FROM bq_transfers WHERE from_player_id = ? AND date(created_at) = ?`
        ).bind(sender.id, today).all();
        const todayTotal = todayTransfers?.[0]?.total || 0;
        const maxTransfer = Math.floor(sender.fuel * 0.5);

        if (todayTotal + amount > maxTransfer) {
            return json({ error: `Daily limit: can only send ${maxTransfer - todayTotal} more fuel today (50% cap)` }, { status: 429 });
        }

        if (sender.fuel < amount) {
            return json({ error: `Insufficient fuel. You have ${sender.fuel}` }, { status: 400 });
        }

        const fee = Math.round(amount * 0.03 * 100) / 100;
        const received = Math.round((amount - fee) * 100) / 100;

        await db.prepare(`UPDATE bq_players SET fuel = fuel - ? WHERE id = ?`).bind(amount, sender.id).run();
        await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(received, to_player_id).run();

        const { results: bots } = await db.prepare(`SELECT id FROM bq_players WHERE type = 'ai'`).all();
        const botShare = bots?.length ? Math.ceil(fee / bots.length) : fee;
        for (const bot of bots) {
            await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(botShare, bot.id).run();
        }

        await db.prepare(`UPDATE bq_bank SET total_fees_collected = total_fees_collected + ?, last_updated = datetime('now') WHERE id = 'the-bank'`).bind(fee).run();

        await db.prepare(
            `INSERT INTO bq_transfers (id, from_player_id, to_player_id, amount, note) VALUES (?, ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), sender.id, to_player_id, amount, (note || '').slice(0, 100)).run();

        const updated = await db.prepare(`SELECT fuel FROM bq_players WHERE id = ?`).bind(sender.id).first();

        await logTransaction(db, { player_id: sender.id, type: 'transfer_send', amount: -amount, detail: `Transfer to ${recipient.username}: ${amount}` });
        await logTransaction(db, { player_id: recipient.id, type: 'transfer_receive', amount: received, detail: `Received from ${sender.username}: ${received}` });

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
