// src/lib/server/oulipo-sappho.js
// How Sappho is asked to write for the duel: the hidden draft, and the
// rewrite that must do without the words a player sent against it.
//
// Neither needs a database, so both run unchanged inside the live sample
// harness (tests/oulipo/live) against the real model.
/** @typedef {import('#lib/oulipo/types.js').Lang} Lang */
/** @typedef {import('#lib/oulipo/types.js').Policy} Policy */
/** @typedef {import('#lib/oulipo/types.js').Engine} Engine */
/** @typedef {{ role: string, content: string }} Message */
/** @typedef {{ content: string, violations: string[] }} Attempt */

import { findViolations } from '#lib/oulipo/engine.js';
import { DUEL } from '#lib/oulipo/duel-rules.js';
import { SAPPHO_DUEL_PERSONAS, SAPPHO_MODEL, SAPPHO_REWRITE } from './sappho-persona.js';

const persona = (/** @type {Lang} */ locale) => SAPPHO_DUEL_PERSONAS[locale] || SAPPHO_DUEL_PERSONAS.en;
const scriptFor = (/** @type {Lang} */ locale) => SAPPHO_REWRITE[locale] || SAPPHO_REWRITE.en;

/** The text of a model answer; empty when the engine gave none. @param {unknown} response */
export function responseText(response) {
    const text = /** @type {{ response?: unknown } | null | undefined} */ (response)?.response;
    return typeof text === 'string' ? text.trim() : '';
}

/** @param {unknown} error */
const reason = (error) => (error instanceof Error ? error.message : String(error));

// ── The hidden draft ───────────────────────────────────────────────────

/**
 * The request that writes her hidden draft: her voice, the prompt, nothing
 * else — no ban, since this is the piece she would have written anyway.
 * @param {Lang} locale
 * @param {string} promptText
 * @returns {Message[]}
 */
export function draftMessages(locale, promptText) {
    return [
        { role: 'system', content: persona(locale) },
        { role: 'user', content: `Prompt: ${promptText}\n\nWrite your response:` }
    ];
}

/**
 * Sappho's hidden draft for a prompt.
 * @param {Engine} ai
 * @param {Lang} locale
 * @param {string} promptText
 * @returns {Promise<string>}
 */
export async function generateDraft(ai, locale, promptText) {
    const response = await ai.run(SAPPHO_MODEL, {
        messages: draftMessages(locale, promptText),
        max_tokens: DUEL.maxDraftTokens,
        temperature: 0.85
    });
    const content = responseText(response);
    if (!content) throw new Error('Sappho produced no draft');
    return content.slice(0, DUEL.maxPieceChars);
}

// ── The rewrite ────────────────────────────────────────────────────────

/**
 * The messages for one pass of the rewrite. Every pass is a whole request
 * of its own: the piece, the complete list of forbidden words and — from
 * the second pass on — the words that got through last time. A pass never
 * depends on what an earlier request may have said.
 * @param {Lang} locale
 * @param {string} piece
 * @param {string[]} forbidden
 * @param {string[]} [slipped] words that got through on the previous pass
 * @returns {Message[]}
 */
export function rewriteMessages(locale, piece, forbidden, slipped = []) {
    const script = scriptFor(locale);
    const words = forbidden.join(', ');
    let task = script.task(piece, words);
    if (slipped.length) task += script.retryNote(slipped.join(', '));
    return [
        { role: 'system', content: persona(locale) + script.rule(words) },
        { role: 'user', content: task }
    ];
}

/**
 * Which forbidden words a text still uses.
 * @param {string} content
 * @param {Iterable<string>} bannedKeys
 * @param {Lang} locale
 * @param {Policy | null} [policy]
 * @returns {string[]}
 */
export function judgeAttempt(content, bannedKeys, locale, policy) {
    return [...new Set(findViolations(content, bannedKeys, locale, policy).map((v) => v.word))];
}

/**
 * One pass of the rewrite: what she wrote, and which forbidden words got
 * through. An engine that fails or stays silent counts as an empty pass.
 * @param {Engine} ai
 * @param {Lang} locale
 * @param {string} piece
 * @param {string[]} forbidden
 * @param {{ policy?: Policy | null, slipped?: string[], bannedKeys?: Iterable<string> }} [options]
 * @returns {Promise<Attempt>}
 */
export async function rewritePass(ai, locale, piece, forbidden, { policy = null, slipped = [], bannedKeys } = {}) {
    let content = '';
    try {
        const response = await ai.run(SAPPHO_MODEL, {
            messages: rewriteMessages(locale, piece, forbidden, slipped),
            max_tokens: DUEL.maxRewriteTokens,
            temperature: 0.7
        });
        content = responseText(response);
    } catch (error) {
        console.error(`[duel][${locale}] rewrite pass failed:`, reason(error));
    }
    if (!content) return { content: '', violations: [] };
    return { content, violations: judgeAttempt(content, bannedKeys ?? forbidden, locale, policy) };
}

/**
 * The better of two attempts: the one with fewer forbidden words left.
 * @param {Attempt | null} a
 * @param {Attempt | null} b
 * @returns {Attempt | null}
 */
export function betterAttempt(a, b) {
    if (!a?.content) return b?.content ? b : a;
    if (!b?.content) return a;
    return b.violations.length < a.violations.length ? b : a;
}

/**
 * Every pass in one go — for the live harness and the tests. The duel
 * itself makes one pass per request (oulipo-duel.js rewriteDuel).
 * @param {Engine} ai
 * @param {Lang} locale
 * @param {string} piece
 * @param {string[]} forbidden
 * @param {{ policy?: Policy | null, bannedKeys?: Iterable<string> }} [options]
 * @returns {Promise<Attempt & { attempts: number }>}
 */
export async function runRewrite(ai, locale, piece, forbidden, { policy, bannedKeys } = {}) {
    /** @type {Attempt | null} */
    let best = null;
    /** @type {string[]} */
    let slipped = [];
    let attempts = 0;
    for (let pass = 1; pass <= DUEL.rewriteAttempts; pass++) {
        attempts = pass;
        const attempt = await rewritePass(ai, locale, piece, forbidden, { policy, slipped, bannedKeys });
        best = betterAttempt(best, attempt);
        if (attempt.content && !attempt.violations.length) break;
        if (attempt.content) slipped = attempt.violations;
    }
    return { content: best?.content ?? '', violations: best?.violations ?? [], attempts };
}
