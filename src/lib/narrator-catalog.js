// src/lib/narrator-catalog.js
// Shared narrator effect catalog — safe for client + server.
// Used by: UI (countdown badges), narrator-effects.js (processor), AI prompt (generator).

export const NARRATOR_CATALOG = {
    // ═══════════════ CALAMITIES ═══════════════
    paralyze: {
        label: 'Paralysis',
        icon: '🟣',
        category: 'calamity',
        instant: true,
        desc: 'Targets cannot move, transfer, or check in.',
    },
    flood: {
        label: 'Inundation',
        icon: '🌊',
        category: 'calamity',
        instant: false,
        desc: 'A zone becomes impassable. Entry and exit blocked.',
    },
    storm: {
        label: 'Tempest',
        icon: '⛈️',
        category: 'calamity',
        instant: false,
        desc: 'Double fuel cost + flat penalty per move.',
    },
    doldrums: {
        label: 'Doldrums',
        icon: '🍃',
        category: 'calamity',
        instant: false,
        desc: 'Bottle drift nearly stops. Captures grind to a halt.',
    },
    fog: {
        label: 'Fog',
        icon: '🌫️',
        category: 'calamity',
        instant: false,
        desc: 'Map zoom limited, navmesh hidden, capture radius halved.',
    },
    market_crash: {
        label: 'Market Crash',
        icon: '📉',
        category: 'calamity',
        instant: false,
        desc: 'Brent spikes — all movement costs 2×.',
    },
    kraken: {
        label: "Kraken's Toll",
        icon: '🐙',
        category: 'calamity',
        instant: true,
        desc: 'Immediate wealth destruction — % of funds lost.',
    },
    mutiny: {
        label: 'Mutiny',
        icon: '⚔️',
        category: 'calamity',
        instant: false,
        desc: 'Transfers disabled. No teamwork or fuel sharing.',
    },
    bounty: {
        label: 'Bounty',
        icon: '🎯',
        category: 'calamity',
        instant: false,
        desc: 'A price on a player — bonus for capturing their bottle.',
    },
    siren: {
        label: "Siren's Call",
        icon: '🧜‍♀️',
        category: 'calamity',
        instant: false,
        desc: 'Bottles drift toward a specific point, defying currents.',
    },

    // ═══════════════ BLESSINGS ═══════════════
    favorable_winds: {
        label: 'Favorable Winds',
        icon: '🌬️',
        category: 'blessing',
        instant: false,
        desc: 'Half fuel cost on all moves.',
    },
    fuel_bonus: {
        label: 'Treasure',
        icon: '💰',
        category: 'blessing',
        instant: true,
        desc: 'Immediate funds added to targets.',
    },
    clear_skies: {
        label: 'Clear Skies',
        icon: '☀️',
        category: 'blessing',
        instant: false,
        desc: 'Full map visible, capture radius doubled.',
    },
    swift_currents: {
        label: 'Swift Currents',
        icon: '🏃',
        category: 'blessing',
        instant: false,
        desc: 'Bottles drift faster — more beachings, more action.',
    },
    market_boom: {
        label: 'Market Boom',
        icon: '📈',
        category: 'blessing',
        instant: false,
        desc: 'Brent drops — all movement half price.',
    },
    capture_bonus: {
        label: 'Bounty Reward',
        icon: '🏅',
        category: 'blessing',
        instant: false,
        desc: 'Next capture pays extra.',
    },
    safe_harbor: {
        label: 'Safe Harbor',
        icon: '⚓',
        category: 'blessing',
        instant: false,
        desc: 'Players near ports get free check-in fuel.',
    },
    ghost_intel: {
        label: 'Ghost Ship Intel',
        icon: '👻',
        category: 'blessing',
        instant: false,
        desc: 'All bottle positions revealed for duration.',
    },
    alliance: {
        label: 'Alliance Pact',
        icon: '🤝',
        category: 'blessing',
        instant: false,
        desc: 'Zero-commission transfers. Pool funds freely.',
    },
    resurrection: {
        label: 'Resurrection',
        icon: '✨',
        category: 'blessing',
        instant: true,
        desc: 'Clears all paralysis and negative effects.',
    },
};

// Quick lookup: event_type → catalog key
export function getEffectInfo(eventType) {
    return NARRATOR_CATALOG[eventType] || {
        label: eventType || 'Unknown',
        icon: '❓',
        category: 'flavor',
        instant: false,
        desc: '',
    };
}

// Target display names
export const TARGET_LABELS = {
    'all': 'Everyone',
    'humans': 'All Humans',
    'ai': 'All AI',
    'bb_bots': 'All Booty Bots',
};
