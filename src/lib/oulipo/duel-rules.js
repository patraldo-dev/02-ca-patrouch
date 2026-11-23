// src/lib/oulipo/duel-rules.js
// The limits of one duel. The page shows them and the API enforces them
// from this one place, so the two can never disagree.

export const DUEL = Object.freeze({
    /** Story length a player may lock, in whitespace-separated words. */
    minStoryWords: 30,
    maxStoryWords: 300,
    /** Hard caps on request size, before anything reaches the model. */
    maxStoryChars: 4000,
    minRopes: 1,
    /** Passes Sappho gets at the rewrite; one pass per request. */
    rewriteAttempts: 4,
    /**
     * Output caps for the model. Her duel pieces run 120–180 words; the
     * caps leave room for a long piece and stop a runaway one, since every
     * token generated is seconds the player waits.
     */
    maxDraftTokens: 480,
    maxRewriteTokens: 640,
    /** The most text ever stored or shown for one of her pieces. */
    maxPieceChars: 8000,
    /** Names listed on the day's board. */
    boardSize: 10
});

/** Scoring: a word the draft used earns +1, a word it did not costs 1. */
export const HIT = 1;
export const MISS = -1;
