import { json } from '@sveltejs/kit';
import { logTransaction } from '$lib/server/bottlequest-logger.js';

export async function GET({ platform, locals }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'No DB' }, { status: 500 });
  const user = locals.user;
  if (!user) return json({ checkedIn: false, streak: 0, error: 'Not logged in' });

  const playerId = user.id;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

  const todayRow = await db.prepare(
    `SELECT fuel_awarded FROM bq_checkins WHERE player_id = ? AND checkin_date = ?`
  ).bind(playerId, today).first();

  // Streak calculation
  const { results: streakRows } = await db.prepare(`
    SELECT DISTINCT checkin_date FROM bq_checkins
    WHERE player_id = ? AND checkin_date < ?
    ORDER BY checkin_date DESC
  `).bind(playerId, today).all();

  let streak = 0;
  const checkDate = new Date(today);
  for (const row of streakRows) {
    checkDate.setDate(checkDate.getDate() - 1);
    const expected = checkDate.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
    if (row.checkin_date === expected) {
      streak++;
    } else {
      break;
    }
  }
  if (todayRow) streak++;

  return json({ checkedIn: !!todayRow, streak, fuel: todayRow?.fuel_awarded || 10 });
}

export async function POST({ platform, locals }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'No DB' }, { status: 500 });
  const user = locals.user;
  if (!user) return json({ error: 'Not logged in' }, { status: 401 });

  const playerId = user.id;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

  const existing = await db.prepare(
    `SELECT fuel_awarded FROM bq_checkins WHERE player_id = ? AND checkin_date = ?`
  ).bind(playerId, today).first();

  if (existing) {
    return json({ error: 'Already checked in today', checkedIn: true });
  }

  const fuel = 10;

  try {
    await db.prepare(
      `INSERT INTO bq_checkins (player_id, checkin_date, fuel_awarded) VALUES (?, ?, ?)`
    ).bind(playerId, today, fuel).run();

    await db.prepare(
      `UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`
    ).bind(fuel, playerId).run();

    await logTransaction(db, playerId, 'checkin', fuel, 'Daily check-in');
    return json({ success: true, fuel, message: '+10 ⛽' });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
