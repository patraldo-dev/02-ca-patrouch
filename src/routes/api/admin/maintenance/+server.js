// src/routes/api/admin/maintenance/+server.js
// Maintenance & cleanup actions for the admin panel.
// GET  → read-only report (what each action WOULD affect, no changes)
// POST → execute one action; destructive ones skip rows they can't handle
//        safely (e.g. duplicate writings that carry comments).
import { json, error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

async function requireAdmin(locals) {
    if (!locals.user || locals.user.role !== 'admin') {
        throw error(403, 'Admin access required');
    }
}

// ── helpers ──

async function count(db, sql, ...binds) {
    const row = await db.prepare(sql).bind(...binds).first();
    return row?.c ?? row?.count ?? 0;
}

// The comments table differs across environments (prod: writing_id; older
// migration-built DBs: review_id). Detect once per request and degrade
// gracefully when neither exists.
async function commentsWritingColumn(db) {
    try {
        const { results } = await db.prepare("SELECT name FROM pragma_table_info('comments')").all();
        const cols = new Set((results || []).map((r) => r.name));
        if (cols.has('writing_id')) return 'writing_id';
        if (cols.has('review_id')) return 'review_id';
    } catch {}
    return null;
}

// Find duplicate writings: same (user_id, prompt_id), prompt not null.
// Keeper per group: published beats draft, then most recently updated.
// A duplicate is only deletable when nothing references it (comments etc.).
const WRITING_CHILD_TABLES = ['comments', 'challenge_entries', 'feedback_requests', 'writer_of_the_week'];

async function duplicateGroups(db) {
    const { results } = await db.prepare(`
        SELECT user_id, prompt_id, COUNT(*) AS c
        FROM writings WHERE prompt_id IS NOT NULL
        GROUP BY user_id, prompt_id HAVING c > 1
    `).all();
    return results || [];
}

async function groupRows(db, userId, promptId) {
    const ccol = await commentsWritingColumn(db);
    const commentJoin = ccol
        ? `(SELECT COUNT(*) FROM comments WHERE comments.${ccol} = writings.id) AS comments`
        : '0 AS comments';
    const { results } = await db.prepare(`
        SELECT id, status, updated_at, ${commentJoin}
        FROM writings WHERE user_id = ? AND prompt_id = ?
        ORDER BY (status = 'published') DESC, updated_at DESC
    `).bind(userId, promptId).all();
    return results || [];
}

async function deleteWritings(db, ids) {
    let vectorizeIds = [];
    const ccol = await commentsWritingColumn(db);
    for (const id of ids) {
        for (const table of WRITING_CHILD_TABLES) {
            try {
                const col = table === 'comments' ? ccol : 'writing_id';
                if (!col) continue;
                await db.prepare(`DELETE FROM ${table} WHERE ${col} = ?`).bind(id).run();
            } catch {}
        }
        try {
            await db.prepare('DELETE FROM writings WHERE id = ?').bind(id).run();
        } catch {}
        try {
            await db.prepare('DELETE FROM bq_keyword_proposals WHERE last_matched_writing_id = ?').bind(id).run();
        } catch {}
        vectorizeIds.push(id);
    }
    try {
        if (env?.VECTORIZE && vectorizeIds.length) {
            await env.VECTORIZE.deleteByIds(vectorizeIds);
        }
    } catch {}
}

// Full user removal — every table we know references users.
const USER_TABLES = [
    ['account', 'userId'],
    ['session', 'userId'],
    ['notifications', 'user_id'],
    ['daily_prompt_log', 'user_id'],
    ['dictation_attempts', 'user_id'],
    ['user_writing_stats', 'user_id'],
    ['profiles', 'user_id'],
    ['feedback_requests', 'user_id'],
    ['challenge_entries', 'user_id'],
];

async function deleteUserCascade(db, user) {
    const details = {};
    // their comments on other writings
    details.comments = await db.prepare('DELETE FROM comments WHERE user_id = ?').bind(user.id).run()
        .then((r) => r.meta.changes).catch(() => 0);
    const { results: writings } = await db.prepare('SELECT id FROM writings WHERE user_id = ?').bind(user.id).all();
    if (writings?.length) {
        await deleteWritings(db, writings.map((w) => w.id));
        details.writings = writings.length;
    }
    for (const [table, col] of USER_TABLES) {
        details[table] = await db.prepare(`DELETE FROM ${table} WHERE ${col} = ?`).bind(user.id).run()
            .then((r) => r.meta.changes).catch(() => 0);
    }
    details.users = await db.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run()
        .then((r) => r.meta.changes).catch(() => 0);
    return details;
}

// ── GET: dry-run report ──

export async function GET({ locals }) {
    await requireAdmin(locals);
    const db = locals.db;

    const expiredSessions = await count(
        db, `SELECT COUNT(*) AS c FROM session WHERE CAST(expiresAt AS INTEGER) < strftime('%s','now')`);

    const oldNotifications = await count(
        db, `SELECT COUNT(*) AS c FROM notifications WHERE read = 1 AND created_at < datetime('now', '-30 days')`);

    const groups = await duplicateGroups(db);
    let duplicateRows = 0;
    let duplicateBlocked = 0; // dups carrying comments — never auto-deleted
    for (const g of groups) {
        const rows = await groupRows(db, g.user_id, g.prompt_id);
        const losers = rows.slice(1);
        duplicateRows += losers.length;
        duplicateBlocked += losers.filter((r) => r.comments > 0).length;
    }

    const testPrompts = await count(
        db, `SELECT COUNT(*) AS c FROM writing_prompts WHERE (id LIKE 'test-%' OR category = 'test') AND id NOT IN (SELECT DISTINCT prompt_id FROM writings WHERE prompt_id IS NOT NULL)`);
    const testPromptsBlocked = await count(
        db, `SELECT COUNT(*) AS c FROM writing_prompts WHERE (id LIKE 'test-%' OR category = 'test') AND id IN (SELECT DISTINCT prompt_id FROM writings WHERE prompt_id IS NOT NULL)`);

    let statsDrift = 0;
    try {
        const { results } = await db.prepare(`
            SELECT s.user_id FROM user_writing_stats s
            LEFT JOIN (SELECT user_id, COUNT(*) AS n, SUM(word_count) AS words FROM writings GROUP BY user_id) w
              ON w.user_id = s.user_id
            WHERE s.total_writings != COALESCE(w.n, 0) OR s.total_words != COALESCE(w.words, 0)
        `).all();
        statsDrift = (results || []).length;
    } catch {}

    return json({
        expiredSessions,
        oldNotifications,
        duplicateGroups: groups.length,
        duplicateRows,
        duplicateBlocked,
        testPrompts,
        testPromptsBlocked,
        statsDrift,
    });
}

// ── POST: execute an action ──

export async function POST({ locals, request }) {
    await requireAdmin(locals);
    const db = locals.db;
    const body = await request.json().catch(() => ({}));
    const action = body.action;

    try {
        switch (action) {
            case 'purge_sessions': {
                const r = await db.prepare(
                    `DELETE FROM session WHERE CAST(expiresAt AS INTEGER) < strftime('%s','now')`
                ).run();
                return json({ action, deleted: r.meta.changes });
            }

            case 'purge_notifications': {
                const r = await db.prepare(
                    `DELETE FROM notifications WHERE read = 1 AND created_at < datetime('now', '-30 days')`
                ).run();
                return json({ action, deleted: r.meta.changes });
            }

            case 'purge_test_prompts': {
                let logRows = 0;
                try {
                    const r = await db.prepare(
                        `DELETE FROM daily_prompt_log WHERE prompt_id IN (SELECT id FROM writing_prompts WHERE id LIKE 'test-%' OR category = 'test')`
                    ).run();
                    logRows = r.meta.changes;
                } catch {}
                const r = await db.prepare(
                    `DELETE FROM writing_prompts WHERE (id LIKE 'test-%' OR category = 'test')
                     AND id NOT IN (SELECT DISTINCT prompt_id FROM writings WHERE prompt_id IS NOT NULL)`
                ).run();
                const blocked = await count(
                    db, `SELECT COUNT(*) AS c FROM writing_prompts WHERE (id LIKE 'test-%' OR category = 'test') AND id IN (SELECT DISTINCT prompt_id FROM writings WHERE prompt_id IS NOT NULL)`);
                return json({ action, deleted: r.meta.changes, logRows, blocked });
            }

            case 'delete_user': {
                const email = String(body.email || '').trim().toLowerCase();
                if (!email || !email.includes('@')) throw error(400, 'Valid email required');
                if (email === locals.user.email?.toLowerCase()) {
                    throw error(400, 'Refusing to delete the account you are signed in with');
                }
                const target = await db.prepare('SELECT id, email, role FROM users WHERE lower(email) = ?').bind(email).first();
                if (!target) throw error(404, 'No user with that email');
                if (target.role === 'admin') throw error(400, 'Refusing to delete an admin account');
                const details = await deleteUserCascade(db, target);
                return json({ action, email, deleted: details.users, details });
            }

            case 'dedupe_writings': {
                const groups = await duplicateGroups(db);
                let deleted = 0, skipped = 0;
                const toDelete = [];
                for (const g of groups) {
                    const rows = await groupRows(db, g.user_id, g.prompt_id);
                    for (const loser of rows.slice(1)) {
                        if (loser.comments > 0) { skipped++; continue; }
                        toDelete.push(loser.id);
                    }
                }
                if (toDelete.length) await deleteWritings(db, toDelete);
                deleted = toDelete.length;
                return json({ action, groups: groups.length, deleted, skipped });
            }

            case 'recompute_stats': {
                const { results } = await db.prepare(`
                    SELECT s.user_id,
                           COALESCE(w.n, 0) AS n, COALESCE(w.words, 0) AS words,
                           s.total_writings, s.total_words
                    FROM user_writing_stats s
                    LEFT JOIN (SELECT user_id, COUNT(*) AS n, SUM(word_count) AS words FROM writings GROUP BY user_id) w
                      ON w.user_id = s.user_id
                    WHERE s.total_writings != COALESCE(w.n, 0) OR s.total_words != COALESCE(w.words, 0)
                `).all();
                let corrected = 0;
                for (const row of results || []) {
                    await db.prepare(
                        'UPDATE user_writing_stats SET total_writings = ?, total_words = ? WHERE user_id = ?'
                    ).bind(row.n, row.words, row.user_id).run();
                    corrected++;
                }
                return json({ action, corrected });
            }

            default:
                throw error(400, `Unknown action: ${action}`);
        }
    } catch (e) {
        if (e?.status) throw e;
        console.error('[maintenance]', action, e);
        throw error(500, e.message || 'Maintenance action failed');
    }
}
