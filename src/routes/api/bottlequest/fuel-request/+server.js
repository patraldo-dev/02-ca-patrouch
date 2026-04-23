import { json } from '@sveltejs/kit';
import { logTransaction } from '$lib/server/bottlequest-logger';

// POST: create fuel request
// GET: list open requests
// PATCH: fulfill a request

export async function POST({ request, locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { amount, message } = await request.json();
        if (!amount || amount < 1 || amount > 50) {
            return json({ error: 'Amount must be 1-50' }, { status: 400 });
        }

        const player = await db.prepare('SELECT id FROM bq_players WHERE username = ?').bind(locals.user.username).first();
        if (!player) return json({ error: 'No player found' }, { status: 404 });

        // Max 1 open request per day
        const today = new Date().toISOString().split('T')[0];
        const existing = await db.prepare(
            `SELECT id FROM bq_fuel_requests WHERE player_id = ? AND status = 'open' AND date(created_at) = ?`
        ).bind(player.id, today).first();
        if (existing) return json({ error: 'Already have an open request today' }, { status: 429 });

        const id = crypto.randomUUID();
        await db.prepare(
            `INSERT INTO bq_fuel_requests (id, player_id, amount, message) VALUES (?, ?, ?, ?)`
        ).bind(id, player.id, amount, (message || '').slice(0, 140)).run();

        return json({ success: true, id });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

export async function GET({ platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ requests: [] });

    try {
        const { results } = await db.prepare(`
            SELECT r.*, p.display_name, p.username, p.port_id as port_name, p.type
            FROM bq_fuel_requests r
            JOIN bq_players p ON r.player_id = p.id
            WHERE r.status = 'open'
            ORDER BY r.created_at DESC LIMIT 20
        `).all();
        return json({ requests: results || [] });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH({ request, locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { request_id } = await request.json();
        if (!request_id) return json({ error: 'Missing request_id' }, { status: 400 });

        const donor = await db.prepare('SELECT id, fuel FROM bq_players WHERE username = ?').bind(locals.user.username).first();
        if (!donor) return json({ error: 'No player found' }, { status: 404 });

        const req = await db.prepare(`SELECT * FROM bq_fuel_requests WHERE id = ? AND status = 'open'`).bind(request_id).first();
        if (!req) return json({ error: 'Request not found or already fulfilled' }, { status: 404 });
        if (req.player_id === donor.id) return json({ error: "Can't fulfill your own request" }, { status: 400 });

        if (donor.fuel < req.amount) return json({ error: `Insufficient beans. Need ${req.amount}, have ${donor.fuel}` }, { status: 400 });

        await db.prepare(`UPDATE bq_players SET fuel = fuel - ? WHERE id = ?`).bind(req.amount, donor.id).run();
        await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(req.amount, req.player_id).run();
        await db.prepare(`UPDATE bq_fuel_requests SET status = 'fulfilled', fulfilled_by = ?, fulfilled_at = datetime('now') WHERE id = ?`).bind(donor.id, request_id).run();

    await logTransaction(db, { player_id: player.id, type: 'fuel_request', amount: 0, detail: `Requested ${amount} beans` });
        return json({ success: true, sent: req.amount });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
