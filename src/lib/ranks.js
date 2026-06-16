// src/lib/ranks.js
// Pirate-naval rank progression. Shared between client and server.
// Points are total booty_points (cumulative, never decrease).

export const RANKS = [
    {
        id: 'scullion',
        title: 'Scullion',
        icon: '🥔',
        minPoints: 0,
        unlocks: ['Basic gameplay: move, check-in, see the map'],
        flavor: 'Galley grunt. You peel potatoes and dream of the sea.',
    },
    {
        id: 'deckhand',
        title: 'Deckhand',
        icon: '🧹',
        minPoints: 25,
        unlocks: ['Transfer funds', 'Place bets'],
        flavor: 'They let you on deck. The salt air changes you.',
    },
    {
        id: 'sailor',
        title: 'Sailor',
        icon: '⛵',
        minPoints: 75,
        unlocks: ['Launch bottles', 'Marketplace listings'],
        flavor: 'You know the ropes. The ocean knows your name.',
    },
    {
        id: 'boatswain',
        title: 'Boatswain',
        icon: '🔧',
        minPoints: 150,
        unlocks: ['Kraken proximity warnings'],
        flavor: 'Keeper of the deck. You sense things others miss.',
    },
    {
        id: 'navigator',
        title: 'Navigator',
        icon: '🧭',
        minPoints: 300,
        unlocks: ['Alien armies visible on map', 'Eligible for alien loot drops'],
        flavor: 'You read the stars and the deep. Both speak of war.',
    },
    {
        id: 'first_mate',
        title: 'First Mate',
        icon: '📜',
        minPoints: 600,
        unlocks: ['Retreat to pier (sanctuary)', 'Immune to crossfire at pier'],
        flavor: 'The captain trusts you. The crew fears you. Good.',
    },
    {
        id: 'captain',
        title: 'Captain',
        icon: '🎩',
        minPoints: 1200,
        unlocks: ['Capture bonus (1.25×)', 'Priority in narrator events'],
        flavor: 'Your ship. Your rules. Your hunt.',
    },
    {
        id: 'commodore',
        title: 'Commodore',
        icon: '🎖️',
        minPoints: 2500,
        unlocks: ['Ghost Intel: see unrevealed bottle positions'],
        flavor: 'A fleet follows your wake. The ocean bows.',
    },
    {
        id: 'admiral',
        title: 'Admiral',
        icon: '👑',
        minPoints: 5000,
        unlocks: ['Double check-in bonus ($20)', 'Full battlefield awareness'],
        flavor: 'The sea itself reports to you. None command what you command.',
    },
];

/**
 * Get the rank object for a given point total.
 */
export function getRank(points) {
    const pts = points || 0;
    let rank = RANKS[0];
    for (const r of RANKS) {
        if (pts >= r.minPoints) rank = r;
    }
    return rank;
}

/**
 * Get the next rank above the current one (or null if maxed).
 */
export function getNextRank(points) {
    const pts = points || 0;
    for (const r of RANKS) {
        if (r.minPoints > pts) return r;
    }
    return null;
}

/**
 * Progress fraction (0-1) toward next rank.
 */
export function getRankProgress(points) {
    const pts = points || 0;
    const current = getRank(pts);
    const next = getNextRank(pts);
    if (!next) return 1; // maxed
    const range = next.minPoints - current.minPoints;
    const earned = pts - current.minPoints;
    return Math.min(1, earned / range);
}

/**
 * Check if a player's rank meets a minimum rank requirement.
 */
export function hasRank(points, requiredRankId) {
    const playerRank = getRank(points || 0);
    const requiredIdx = RANKS.findIndex(r => r.id === requiredRankId);
    const playerIdx = RANKS.findIndex(r => r.id === playerRank.id);
    return playerIdx >= requiredIdx;
}

/**
 * Minimum rank required to see various game features.
 */
export const RANK_GATES = {
    krakenWarnings: 'boatswain',     // rank 4 — see kraken proximity
    alienVisibility: 'navigator',    // rank 5 — see aliens on map
    alienLoot: 'navigator',          // rank 5 — eligible for loot
    alienCrossfire: 'navigator',     // rank 5 — affected by crossfire
    pierRetreat: 'first_mate',       // rank 6 — can retreat to pier
    captureBonus: 'captain',         // rank 7 — 1.25× capture points
    ghostIntel: 'commodore',         // rank 8 — see hidden bottles
    doubleCheckin: 'admiral',        // rank 9 — $20 check-in
};
