import { json } from '@sveltejs/kit';
import { logTransaction } from '$lib/server/bottlequest-logger';

const CST_OFFSET = -6;

function getTodayCST() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const cst = new Date(utc + CST_OFFSET * 3600000);
    return cst.toISOString().slice(0, 10);
}

// Expire checkin_fuel if last checkin was before today
async function expireCheckinFuel(db, playerId) {
    const today = getTodayCST();
    await db.prepare(`
        UPDATE bq_players SET checkin_fuel = 0 WHERE id = ? AND (checkin_date IS NULL OR checkin_date < ?)
    `).bind(playerId, today).run();
}

export async function GET({ locals, platform }) {
    const db = platform?.env?.DB_book;
    const user = locals.user;
    if (!user || !db) return json({ checkedIn: false, streak: 0, checkinFuel: 0 });

    const today = getTodayCST();
    const player = await db.prepare('SELECT id, checkin_fuel FROM bq_players WHERE username = ? AND type = ?').bind(user.username, 'human').first();

    if (!player) return json({ checkedIn: false, streak: 0, checkinFuel: 0 });

    await expireCheckinFuel(db, player.id);

    const checkin = await db.prepare('SELECT checkin_date FROM bq_checkins WHERE player_id = ? AND checkin_date = ?').bind(player.id, today).first();
    const checkedIn = !!checkin;

    // Calculate streak
    const streaks = await db.prepare(`
        SELECT checkin_date FROM bq_checkins WHERE player_id = ? ORDER BY checkin_date DESC LIMIT 30
    `).bind(player.id).all();

    let streak = 0;
    for (const row of streaks.results) {
        const diffDays = Math.floor((new Date(today) - new Date(row.checkin_date)) / 86400000);
        if (diffDays === streak) streak++;
        else break;
    }

    // Refresh checkin_fuel after expiry
    const updated = await db.prepare('SELECT checkin_fuel FROM bq_players WHERE id = ?').bind(player.id).first();

    return json({ checkedIn, streak, checkinFuel: updated?.checkin_fuel || 0 });
}

export async function POST({ locals, platform }) {
    const db = platform?.env?.DB_book;
    const user = locals.user;
    if (!user || !db) return json({ success: false, message: 'Not authenticated' }, { status: 401 });

    const player = await db.prepare('SELECT id, paralyzed_until FROM bq_players WHERE username = ? AND type = ?').bind(user.username, 'human').first();
    if (!player) return json({ success: false, message: 'Not a player' }, { status: 403 });
    if (player.paralyzed_until && new Date(player.paralyzed_until.replace(' ', 'T') + 'Z') > new Date()) {
        return json({ success: false, message: 'Paralyzed by El Narrador', paralyzed_until: player.paralyzed_until });
    }

    const today = getTodayCST();

    const existing = await db.prepare('SELECT checkin_date FROM bq_checkins WHERE player_id = ? AND checkin_date = ?').bind(player.id, today).first();
    if (existing) return json({ success: false, message: 'Already checked in today', checkedIn: true, streak: 0 });

    await db.prepare('INSERT INTO bq_checkins (player_id, checkin_date, fuel_awarded) VALUES (?, ?, ?)').bind(player.id, today, 10).run();
    await db.prepare(`UPDATE bq_players SET checkin_fuel = checkin_fuel + 10, checkin_date = ? WHERE id = ?`).bind(today, player.id).run();
    await db.prepare(`UPDATE bq_bean_inventory SET amount = amount + 10 WHERE player_id = ? AND bean_type = 'lemon'`).bind(player.id).run();

    // Calculate new streak
    const streaks = await db.prepare(`
        SELECT checkin_date FROM bq_checkins WHERE player_id = ? ORDER BY checkin_date DESC LIMIT 30
    `).bind(player.id).all();
    let streak = 1;
    for (let i = 1; i < streaks.results.length; i++) {
        const diffDays = Math.floor((new Date(streaks.results[i - 1].checkin_date) - new Date(streaks.results[i].checkin_date)) / 86400000);
        if (diffDays === 1) streak++;
        else break;
    }

    await logTransaction(db, { player_id: player.id, type: "checkin", amount: 10, detail: `Daily check-in (streak ${streak})` });
    return json({ success: true, message: "+10 🟡" + (streak > 1 ? " (" + streak + "🔥)" : ""), streak, bean: { type: "lemon", amount: 10 } });
}
