// src/routes/dictation/+page.server.js — Dictée: listen-and-write practice
// Text source: Sappho's most recent published writing in the user's locale.
import { redirect } from '@sveltejs/kit';
import { requireRole } from '#lib/server/require-role.js';

const SAPPHO_USER_ID = 'sappho-agent-001';

// Split into dictation phrases: sentences merged/broken to ~4–14 words,
// capped at ~180 words total (classic dictée length) at a sentence boundary.
function splitPhrases(text, maxWords = 14, totalCap = 180) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    const sentences = clean.match(/[^.!?…]+[.!?…]*/g) || [clean];

    // Break over-long sentences at commas so each phrase stays writable.
    const segments = [];
    for (const s of sentences) {
        const words = s.trim().split(' ');
        if (words.length <= maxWords) {
            if (words.length) segments.push(s.trim());
            continue;
        }
        let buf = [];
        for (const w of words) {
            buf.push(w);
            if (buf.length >= maxWords && /[,;:]$/.test(w)) {
                segments.push(buf.join(' '));
                buf = [];
            }
        }
        if (buf.length) segments.push(buf.join(' '));
    }

    const phrases = [];
    let count = 0;
    let truncated = false;
    for (const seg of segments) {
        const n = seg.split(' ').length;
        if (count + n > totalCap) {
            truncated = true;
            break;
        }
        phrases.push(seg);
        count += n;
    }
    return { phrases, truncated, wordCount: count };
}

export async function load({ locals, url }) {
    await requireRole(locals, ['member', 'admin'], url);

    const db = locals.db;
    const locale = ['en', 'es', 'fr'].includes(locals.locale) ? locals.locale : 'es';
    // Sappho's latest in the user's locale; fall back to her latest in any
    // language. Some environments' writings tables lack the `locale` column
    // (schema drift) — the unfiltered fallback covers those too.
    let writing = null;
    let usedLocale = locale;
    try {
        writing = await db
            .prepare(
                `SELECT id, title, content, word_count, locale, created_at
                 FROM writings
                 WHERE user_id = ? AND status = 'published' AND visibility = 'public' AND locale = ?
                 ORDER BY created_at DESC LIMIT 1`
            )
            .bind(SAPPHO_USER_ID, locale)
            .first();
    } catch {}
    if (!writing) {
        try {
            writing = await db
                .prepare(
                    `SELECT id, title, content, word_count, created_at
                     FROM writings
                     WHERE user_id = ? AND status = 'published' AND visibility = 'public'
                     ORDER BY created_at DESC LIMIT 1`
                )
                .bind(SAPPHO_USER_ID)
                .first();
        } catch (e) {
            console.error('[dictation] load failed:', e.message);
        }
    }
    usedLocale = writing?.locale || locale;

    if (!writing) {
        return {
            user: locals.user,
            serverLocale: locale,
            writing: null,
            phrases: [],
            truncated: false,
            ...(await loadProgress(db, locals.user.id))
        };
    }

    const { phrases, truncated, wordCount } = splitPhrases(writing.content);
    return {
        user: locals.user,
        serverLocale: locale,
        writing: {
            id: writing.id,
            title: writing.title,
            locale: usedLocale,
            fullWordCount: writing.word_count,
            created_at: writing.created_at
        },
        phrases,
        truncated,
        wordCount,
        ...(await loadProgress(db, locals.user.id))
    };
}

// Attempt history + aggregates for the progress card. Separate so a stats
// hiccup never blocks the dictée itself.
async function loadProgress(db, userId) {
    try {
        const attempts = await db
            .prepare(
                `SELECT id, mode, accuracy, faults, word_count, manuscript_url, created_at
                 FROM dictation_attempts WHERE user_id = ?
                 ORDER BY created_at DESC, rowid DESC LIMIT 100`
            )
            .bind(userId)
            .all();
        const stats = await db
            .prepare(
                `SELECT COUNT(*) AS total,
                        ROUND(AVG(accuracy), 1) AS avg_accuracy,
                        MAX(accuracy) AS best_accuracy,
                        SUM(CASE WHEN mode = 'handwritten' THEN 1 ELSE 0 END) AS handwritten
                 FROM dictation_attempts WHERE user_id = ?`
            )
            .bind(userId)
            .first();
        return { attempts: attempts.results || [], stats: stats || null };
    } catch (e) {
        console.error('[dictation] progress load failed:', e.message);
        return { attempts: [], stats: null };
    }
}
