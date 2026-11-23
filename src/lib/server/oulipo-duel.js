// src/lib/server/oulipo-duel.js
// The solitaire duel.
//
// Sappho drafts one hidden piece per language for the day's community
// prompt. A member writes a piece of their own, sends some of its words
// against hers, and scores the ones her draft actually used. She then
// rewrites her piece without the sent words.
//
// Everything here takes `db` and `ai` as arguments and imports nothing from
// the runtime, so the whole flow runs under node:test against SQLite.
// The hidden draft is only ever returned by roundView(), after a lock.
// How Sappho herself is asked to write lives next door (oulipo-sappho.js).
/** @typedef {import('#lib/oulipo/types.js').Lang} Lang */
/** @typedef {import('#lib/oulipo/types.js').Policy} Policy */
/** @typedef {import('#lib/oulipo/types.js').Rope} Rope */
/** @typedef {import('#lib/oulipo/types.js').Row} Row */
/** @typedef {import('#lib/oulipo/types.js').Db} Db */
/** @typedef {import('#lib/oulipo/types.js').Engine} Engine */
/** @typedef {import('#lib/oulipo/types.js').RoundView} RoundView */
/** @typedef {import('#lib/oulipo/types.js').BoardRow} BoardRow */

import {
    analyze,
    countWords,
    defaultPolicy,
    isLang,
    judge,
    markText,
    normalizeText,
    tierFor
} from '#lib/oulipo/engine.js';
import { DUEL } from '#lib/oulipo/duel-rules.js';
import { getOrCreateCommunityPrompt } from './prompt-generator.js';
import { betterAttempt, generateDraft, rewritePass } from './oulipo-sappho.js';
import { SAPPHO_MODEL } from './sappho-persona.js';
import { getToday } from './writing-stats.js';

/** Thrown for anything the API turns into an error response. */
export class DuelError extends Error {
    /**
     * @param {number} status
     * @param {string} code
     * @param {string | null} [detail]
     */
    constructor(status, code, detail) {
        super(detail ? `${code}: ${detail}` : code);
        this.name = 'DuelError';
        this.status = status;
        this.code = code;
        this.detail = detail || null;
    }
}

// The duel rides on the prompt the writers see, so it shares their day:
// the Mexico City date (writing-stats.js getToday).
export const duelDay = getToday;

/**
 * A stored JSON column, or `fallback` when it is missing or damaged.
 * @template T
 * @param {unknown} text
 * @param {T} fallback
 * @returns {T}
 */
function parseJson(text, fallback) {
    try {
        const value = JSON.parse(/** @type {string} */ (text));
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

/** @param {unknown} error */
const reason = (error) => (error instanceof Error ? error.message : String(error));

// ── Reads ──────────────────────────────────────────────────────────────

/** @param {Db} db @param {string} locale @param {string} day @returns {Promise<Row | null>} */
export function readDraft(db, locale, day) {
    return db
        .prepare('SELECT * FROM oulipo_duel_drafts WHERE locale = ? AND duel_date = ?')
        .bind(locale, day)
        .first();
}

/** @param {Db} db @param {string} userId @param {string} day @returns {Promise<Row | null>} */
export function readRound(db, userId, day) {
    return db
        .prepare('SELECT * FROM oulipo_duel_rounds WHERE user_id = ? AND duel_date = ?')
        .bind(userId, day)
        .first();
}

/**
 * Today's community prompt, if somebody has already brought it into being.
 * @param {Db} db @param {string} day @param {string} locale
 * @returns {Promise<{ id: string, prompt_text: string, category: string } | null>}
 */
export function readPrompt(db, day, locale) {
    return /** @type {Promise<{ id: string, prompt_text: string, category: string } | null>} */ (
        db
            .prepare(
                `SELECT id, prompt_text, category FROM writing_prompts
                 WHERE prompt_date = ? AND locale = ? AND category = 'daily-community' LIMIT 1`
            )
            .bind(day, locale)
            .first()
    );
}

// ── The hidden draft ───────────────────────────────────────────────────

/**
 * The day's hidden draft for a language, written the first time it is asked for.
 * @param {Db} db @param {Engine} ai @param {Lang} locale @param {string} day
 * @returns {Promise<Row>}
 */
export async function ensureDraft(db, ai, locale, day) {
    const existing = await readDraft(db, locale, day);
    if (existing) return existing;

    const prompt = await getOrCreateCommunityPrompt(db, ai, day, locale);
    const content = await generateDraft(ai, locale, prompt.prompt_text);
    /** @type {Row} */
    const row = {
        id: crypto.randomUUID(),
        locale,
        duel_date: day,
        prompt_id: prompt.id,
        prompt_text: prompt.prompt_text,
        content,
        model: SAPPHO_MODEL
    };
    try {
        await db
            .prepare(
                `INSERT INTO oulipo_duel_drafts (id, locale, duel_date, prompt_id, prompt_text, content, model)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(row.id, row.locale, row.duel_date, row.prompt_id, row.prompt_text, row.content, row.model)
            .run();
        return row;
    } catch (error) {
        // Two players asked at once: the draft that won the race is the day's.
        const winner = await readDraft(db, locale, day);
        if (winner) return winner;
        throw error;
    }
}

/**
 * Make sure the prompt and the hidden draft exist. Returns what a player may
 * know before locking: the prompt, and the fact that the draft is ready.
 * @param {Db} db
 * @param {Engine | null | undefined} ai
 * @param {unknown} locale
 * @param {string} day
 * @returns {Promise<{ prompt: { id: string | null, text: string }, draftReady: boolean }>}
 */
export async function prepareDuel(db, ai, locale, day) {
    if (!isLang(locale)) throw new DuelError(400, 'bad_language', String(locale));
    if (!ai) throw new DuelError(503, 'no_engine');
    try {
        const draft = await ensureDraft(db, ai, locale, day);
        return { prompt: { id: draft.prompt_id ?? null, text: draft.prompt_text }, draftReady: true };
    } catch (error) {
        if (error instanceof DuelError) throw error;
        console.error('[duel] draft failed:', reason(error));
        throw new DuelError(503, 'draft_failed', reason(error));
    }
}

// ── Locking a duel ─────────────────────────────────────────────────────

/** @param {unknown} story */
function validateStory(story) {
    if (typeof story !== 'string' || !story.trim()) {
        throw new DuelError(400, 'story_missing');
    }
    if (story.length > DUEL.maxStoryChars) {
        throw new DuelError(400, 'story_too_long', `${story.length} chars`);
    }
    const words = countWords(story);
    if (words < DUEL.minStoryWords) {
        throw new DuelError(400, 'story_too_short', `${words} words`);
    }
    if (words > DUEL.maxStoryWords) {
        throw new DuelError(400, 'story_too_long', `${words} words`);
    }
}

/**
 * A round as the player sees it after locking — the only place the draft
 * leaves the server. Texts come back in the exact form the spans index.
 * @param {Row} row @param {Row} draft @returns {RoundView}
 */
export function roundView(row, draft) {
    const locale = /** @type {Lang} */ (row.locale);
    const policy = /** @type {Policy} */ (parseJson(row.policy, { verbs: 'strict' }));
    const draftText = normalizeText(draft.content);
    const rewriteText = normalizeText(row.rewrite);
    const ropes = /** @type {Rope[]} */ (parseJson(row.ropes, []));
    const ropeKeys = ropes.map((rope) => rope.key);
    return {
        id: row.id,
        date: row.duel_date,
        locale,
        policy,
        story: row.story,
        ropes,
        ropeCount: row.rope_count,
        storyTypes: row.story_types,
        hits: row.hits,
        misses: row.misses,
        score: row.score,
        muzzlePct: row.muzzle_pct,
        tier: tierFor(locale, row.rope_count, row.story_types),
        draft: {
            text: draftText,
            tokens: row.draft_tokens,
            spans: markText(draftText, ropeKeys, locale, policy)
        },
        rewrite: {
            status: row.rewrite_status,
            attempts: row.rewrite_attempts,
            violations: /** @type {string[]} */ (parseJson(row.rewrite_violations, [])),
            text: rewriteText,
            spans: rewriteText ? markText(rewriteText, ropeKeys, locale, policy) : []
        }
    };
}

/**
 * Lock a player's duel for the day. The story is re-analysed here — the
 * browser's list is a convenience, never a source of truth — and every
 * rope must be one of its words.
 * @param {Db} db
 * @param {Engine | null | undefined} ai
 * @param {{ userId: string, locale: unknown, day: string, story: unknown, ropes: unknown }} input
 * @returns {Promise<RoundView>}
 */
export async function lockDuel(db, ai, { userId, locale, day, story, ropes }) {
    if (!isLang(locale)) throw new DuelError(400, 'bad_language', String(locale));
    validateStory(story);
    if (!Array.isArray(ropes)) throw new DuelError(400, 'ropes_missing');

    const policy = defaultPolicy(locale);
    const storyAnalysis = analyze(story, locale, policy);
    const available = new Set(storyAnalysis.types.map((type) => type.key));
    const wanted = [...new Set(ropes)];
    const invalid = wanted.filter((key) => typeof key !== 'string' || !available.has(key));
    if (invalid.length) {
        throw new DuelError(400, 'rope_not_in_story', invalid.slice(0, 10).join(', '));
    }
    if (!wanted.length) throw new DuelError(400, 'ropes_missing');

    const earlier = await readRound(db, userId, day);
    if (earlier) throw new DuelError(409, 'already_locked');

    let draft;
    try {
        draft = await ensureDraft(db, /** @type {Engine} */ (ai), locale, day);
    } catch (error) {
        console.error('[duel] draft failed:', reason(error));
        throw new DuelError(503, 'draft_failed', reason(error));
    }

    const verdict = judge(story, draft.content, locale, policy, wanted);
    /** @type {Row} */
    const row = {
        id: crypto.randomUUID(),
        user_id: userId,
        locale,
        duel_date: day,
        draft_id: draft.id,
        story,
        policy: JSON.stringify(policy),
        ropes: JSON.stringify(verdict.ropes),
        rope_count: verdict.ropes.length,
        story_types: verdict.storyTypes,
        hits: verdict.hits,
        misses: verdict.misses,
        score: verdict.score,
        muzzle_pct: verdict.muzzlePct,
        draft_tokens: verdict.draftTokens
    };
    try {
        await db
            .prepare(
                `INSERT INTO oulipo_duel_rounds
                   (id, user_id, locale, duel_date, draft_id, story, policy, ropes, rope_count,
                    story_types, hits, misses, score, muzzle_pct, draft_tokens)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
                row.id, row.user_id, row.locale, row.duel_date, row.draft_id, row.story, row.policy,
                row.ropes, row.rope_count, row.story_types, row.hits, row.misses, row.score,
                row.muzzle_pct, row.draft_tokens
            )
            .run();
    } catch (error) {
        if (await readRound(db, userId, day)) throw new DuelError(409, 'already_locked');
        throw error;
    }
    // The stored row is the truth: it carries the rewrite defaults too.
    return roundView((await readRound(db, userId, day)) ?? row, draft);
}

// ── The rewrite ────────────────────────────────────────────────────────

/** How long a claim may stay held before another request may take it over. */
const CLAIM_MINUTES = 5;
/** How long a request that lost the claim gives the holder before reporting. */
const LOOK_MS = 1500;

/** @param {Row} row */
const isSettled = (row) => row.rewrite_status !== 'pending' && row.rewrite_status !== 'writing';

/** @param {number} ms */
const defaultPause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Give a claim back so the next pass can be asked for. @param {Db} db @param {string} id */
function releaseClaim(db, id) {
    return db
        .prepare(
            `UPDATE oulipo_duel_rounds SET rewrite_status = 'pending' WHERE id = ? AND rewrite_status = 'writing'`
        )
        .bind(id)
        .run();
}

/**
 * Make one pass at the rewrite of a locked duel, or return the finished one.
 *
 * A request makes at most one pass, so none stays open for longer than one
 * call to the model, and the page can tell the player how far she has got.
 * Exactly one request holds the pen: the first to claim the round makes the
 * pass, and any request arriving meanwhile reports where things stand.
 * Progress is stored after every pass, so a closed tab, a dropped connection
 * or a crashed request loses nothing. A claim left hanging by a crashed
 * request may be taken over after CLAIM_MINUTES.
 * @param {Db} db
 * @param {Engine | null | undefined} ai
 * @param {{ userId: string, day: string, pause?: (ms: number) => Promise<void> }} input
 * @returns {Promise<RoundView>}
 */
export async function rewriteDuel(db, ai, { userId, day, pause = defaultPause }) {
    const row = await readRound(db, userId, day);
    if (!row) throw new DuelError(404, 'no_round');
    const draft = await readDraft(db, row.locale, row.duel_date);
    if (!draft) throw new DuelError(503, 'draft_missing');
    if (isSettled(row)) return roundView(row, draft);
    const again = async () => roundView((await readRound(db, userId, day)) ?? row, draft);

    const claim = await db
        .prepare(
            `UPDATE oulipo_duel_rounds
                SET rewrite_status = 'writing', updated_at = datetime('now')
              WHERE id = ?
                AND (rewrite_status = 'pending'
                     OR (rewrite_status = 'writing' AND updated_at < datetime('now', ?)))`
        )
        .bind(row.id, `-${CLAIM_MINUTES} minutes`)
        .run();
    if (claim.meta?.changes !== 1) {
        // Someone else holds the pen: give their pass a moment, then report.
        await pause(LOOK_MS);
        return again();
    }
    if (!ai) {
        await releaseClaim(db, row.id);
        throw new DuelError(503, 'no_engine');
    }

    const locale = /** @type {Lang} */ (row.locale);
    const policy = /** @type {Policy} */ (parseJson(row.policy, { verbs: 'strict' }));
    const ropes = /** @type {Rope[]} */ (parseJson(row.ropes, []));
    const forbidden = [...new Set(ropes.flatMap((rope) => [...(rope.forms || []), ...(rope.draftForms || [])]))];
    const attempt = await rewritePass(ai, locale, draft.content, forbidden, {
        policy,
        slipped: /** @type {string[]} */ (parseJson(row.rewrite_slipped, [])),
        bannedKeys: ropes.map((rope) => rope.key)
    });

    const best =
        betterAttempt(
            { content: row.rewrite || '', violations: /** @type {string[]} */ (parseJson(row.rewrite_violations, [])) },
            attempt
        ) ?? attempt;
    // Nothing has come back yet, in any pass: the round stays as it was,
    // the claim goes back, and the player can ask again. A silent engine
    // never uses up a pass.
    if (!best.content) {
        await releaseClaim(db, row.id);
        throw new DuelError(503, 'rewrite_failed');
    }
    const pass = (Number(row.rewrite_attempts) || 0) + 1;
    // What the next pass is told to avoid: what got through this one.
    const slipped = attempt.content ? attempt.violations : /** @type {string[]} */ (parseJson(row.rewrite_slipped, []));
    const clean = attempt.content !== '' && attempt.violations.length === 0;
    const last = pass >= DUEL.rewriteAttempts;

    // What slipped through is reported, never cleaned up and hidden.
    const status = clean || last ? (best.violations.length ? 'escaped' : 'clean') : 'pending';
    await db
        .prepare(
            `UPDATE oulipo_duel_rounds
                SET rewrite = ?, rewrite_status = ?, rewrite_attempts = ?, rewrite_violations = ?,
                    rewrite_slipped = ?, updated_at = datetime('now')
              WHERE id = ? AND rewrite_status = 'writing'`
        )
        .bind(best.content, status, pass, JSON.stringify(best.violations), status === 'pending' ? JSON.stringify(slipped) : null, row.id)
        .run();
    return again();
}

// ── The day's board ────────────────────────────────────────────────────

/**
 * The day's board for one language. A member whose active profile opts out
 * of scoreboards is left out entirely; one whose profile is not public is
 * listed without a name.
 * @param {Db} db
 * @param {unknown} locale
 * @param {string} day
 * @param {{ userId?: string | null }} [options]
 * @returns {Promise<BoardRow[]>}
 */
export async function getBoard(db, locale, day, { userId } = {}) {
    if (!isLang(locale)) return [];
    let rows;
    try {
        ({ results: rows } = await db
            .prepare(
                `SELECT r.id, r.user_id, r.score, r.muzzle_pct, r.hits, r.misses, r.rope_count,
                        u.username, u.show_profile, p.display_name
                   FROM oulipo_duel_rounds r
                   JOIN users u ON u.id = r.user_id
                   LEFT JOIN profiles p ON p.user_id = r.user_id AND p.is_active = 1
                  WHERE r.duel_date = ? AND r.locale = ?
                    AND COALESCE(p.show_in_scoreboard, 1) = 1
                  ORDER BY r.score DESC, r.muzzle_pct DESC, r.created_at ASC, r.id ASC
                  LIMIT ?`
            )
            .bind(day, locale, DUEL.boardSize)
            .all());
    } catch (error) {
        // Better an empty board than one that shows who asked not to be shown.
        console.error('[duel] board failed:', reason(error));
        return [];
    }
    return (rows || []).map(
        (row) =>
            /** @type {BoardRow} */ ({
                id: row.id,
                mine: Boolean(userId) && row.user_id === userId,
                name: row.show_profile ? row.display_name || row.username : null,
                score: row.score,
                muzzlePct: row.muzzle_pct,
                hits: row.hits,
                misses: row.misses,
                ropeCount: row.rope_count
            })
    );
}
