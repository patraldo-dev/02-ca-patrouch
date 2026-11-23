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
    /** Generation passes for the rewrite; a pass that still uses a forbidden word is retried. */
    rewriteAttempts: 4,
    /** Pieces are short: this bounds the model's output and the stored text. */
    maxPieceTokens: 1024,
    maxPieceChars: 8000,
    /** Names listed on the day's board. */
    boardSize: 10
});

/** Scoring: a word the draft used earns +1, a word it did not costs 1. */
export const BITE = 1;
export const MISS = -1;
