// src/lib/transport.js
// Transport modes for PV bay + city movement.
// Power is the currency — generated communally by the community's creativity.
// No external price index. Costs are fixed per tier + mode.

export const TRANSPORT_MODES = {
    walk: {
        id: 'walk',
        label: 'Walk',
        icon: '🚶',
        terrains: ['land', 'beach', 'pier'],
        speedMult: 1.0,
        costPerKm: 0,
        flatCost: 0,
        desc: 'Slow but free. The default for everyone.',
    },
    bike: {
        id: 'bike',
        label: 'Bike',
        icon: '🚲',
        terrains: ['land', 'beach', 'pier'],
        speedMult: 3.0,
        costPerKm: 0,
        flatCost: 5,
        desc: '3× faster than walking. Small power cost.',
    },
    bus: {
        id: 'bus',
        label: 'Bus',
        icon: '🚌',
        terrains: ['land', 'pier'],
        speedMult: 4.0,
        costPerKm: 0,
        flatCost: 10,
        desc: 'Cheap flat fare. Main roads only.',
    },
    taxi: {
        id: 'taxi',
        label: 'Taxi',
        icon: '🚕',
        terrains: ['land', 'pier'],
        speedMult: 7.0,
        costPerKm: 2,
        flatCost: 0,
        desc: 'Fast and expensive. 2 power/km.',
    },
    drive: {
        id: 'drive',
        label: 'Drive',
        icon: '🚗',
        terrains: ['land', 'pier'],
        speedMult: 8.0,
        costPerKm: 1.5,
        flatCost: 0,
        desc: 'Fastest land option. 1.5 power/km.',
    },
    swim: {
        id: 'swim',
        label: 'Swim',
        icon: '🏊',
        terrains: ['shallow', 'beach', 'pier'],
        speedMult: 0.6,
        costPerKm: 0,
        flatCost: 0,
        desc: 'Free but slow. Shoreline only. Kraken risk.',
    },
    sail: {
        id: 'sail',
        label: 'Sail',
        icon: '⛵',
        terrains: ['water', 'shallow', 'pier'],
        speedMult: 1.6,
        costPerKm: 1,
        flatCost: 0,
        desc: 'The bay navigator. Steady power cost.',
    },
    speedboat: {
        id: 'speedboat',
        label: 'Speedboat',
        icon: '🚤',
        terrains: ['water', 'shallow', 'pier'],
        speedMult: 5.0,
        costPerKm: 3,
        flatCost: 0,
        desc: 'Fast water crossing. 3 power/km. For reaching Yelapa fast.',
    },
};

/**
 * Check if a transport mode can traverse a given terrain.
 */
export function canTraverse(modeId, terrain) {
    const mode = TRANSPORT_MODES[modeId];
    if (!mode) return false;
    return mode.terrains.includes(terrain);
}

/**
 * Calculate movement cost for a path given transport mode.
 * No external multiplier — fixed costs based on tier and mode.
 * Returns { totalCost, perStepCost, breakdown }
 */
export function calculateMoveCost(modeId, pathSteps, tierCost) {
    const mode = TRANSPORT_MODES[modeId];
    if (!mode) return { totalCost: Infinity };

    const stepCost = Math.ceil(tierCost * (mode.costPerKm > 0 ? mode.costPerKm : 1));
    const totalCost = stepCost * pathSteps + (mode.flatCost || 0);

    return {
        totalCost,
        perStepCost: stepCost,
        flatCost: mode.flatCost || 0,
        breakdown: { pathSteps, tierCost, stepCost, flatCost: mode.flatCost || 0 },
    };
}

/**
 * Get available modes for a player based on their current terrain.
 */
export function getAvailableModes(currentTerrain) {
    return Object.values(TRANSPORT_MODES).filter(mode =>
        mode.terrains.includes(currentTerrain)
    );
}
