// src/lib/server/logarithmic-grid.js
// Logarithmic grid for Booty Quest movement
// Grid cells get larger as distance from center increases
// Center: Puerto Vallarta / Bahía de Banderas (20.65, -105.35)

const CENTER = { lat: 20.65, lon: -105.35 };

// Ring definitions — each ring is 5x wider than the previous
const RINGS = [
    { id: 0, cellDeg: 0.001, label: '100m',  costBase: 1,  color: '#c9a87c' },  // ~111m cells
    { id: 1, cellDeg: 0.005, label: '500m',  costBase: 1,  color: '#a8c9a8' },  // ~555m cells
    { id: 2, cellDeg: 0.025, label: '2.5km', costBase: 1,  color: '#87a8c9' },  // ~2.8km cells
    { id: 3, cellDeg: 0.125, label: '12km',  costBase: 1,  color: '#a887c9' },  // ~14km cells
];

// Ring boundaries in degrees from center
const RING_BOUNDS = [0.005, 0.025, 0.125, Infinity]; // outer edge of each ring

/**
 * Get which ring a point belongs to
 */
export function getRing(lat, lon) {
    const dLat = Math.abs(lat - CENTER.lat);
    const dLon = Math.abs(lon - CENTER.lon) * Math.cos(CENTER.lat * Math.PI / 180); // correct for latitude
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);

    for (let i = 0; i < RING_BOUNDS.length; i++) {
        if (dist < RING_BOUNDS[i]) return i;
    }
    return RINGS.length - 1;
}

/**
 * Get the grid cell for a lat/lon position
 * Returns { ring, col, row, centerLat, centerLon }
 */
export function getCell(lat, lon) {
    const ring = getRing(lat, lon);
    const cellDeg = RINGS[ring].cellDeg;

    // Align grid to center
    const col = Math.floor((lon - CENTER.lon) / cellDeg);
    const row = Math.floor((lat - CENTER.lat) / cellDeg);

    return {
        ring,
        col,
        row,
        centerLat: CENTER.lat + (row + 0.5) * cellDeg,
        centerLon: CENTER.lon + (col + 0.5) * cellDeg,
        cellDeg,
        label: RINGS[ring].label,
        costBase: RINGS[ring].costBase,
    };
}

/**
 * Get neighboring cells (6 directions: N, S, E, W + 2 diagonals based on ring)
 * A move goes from current cell to adjacent cell in the SAME ring
 */
export function getNeighbors(cell) {
    const { ring, col, row } = cell;
    const cellDeg = RINGS[ring].cellDeg;

    const dirs = [
        { dc: 0, dr: 1, dir: 'N' },
        { dc: 0, dr: -1, dir: 'S' },
        { dc: 1, dr: 0, dir: 'E' },
        { dc: -1, dr: 0, dir: 'W' },
        { dc: 1, dr: 1, dir: 'NE' },
        { dc: -1, dr: 1, dir: 'NW' },
        { dc: 1, dr: -1, dir: 'SE' },
        { dc: -1, dr: -1, dir: 'SW' },
    ];

    return dirs.map(d => ({
        ring,
        col: col + d.dc,
        row: row + d.dr,
        centerLat: CENTER.lat + (row + d.dr + 0.5) * cellDeg,
        centerLon: CENTER.lon + (col + d.dc + 0.5) * cellDeg,
        direction: d.dir,
        cellDeg,
        label: RINGS[ring].label,
    }));
}

/**
 * Calculate fuel cost for a move
 * Cost = base × speed_mult × night_mult × competition_mult
 * Diagonal moves cost 1.5x
 */
export function moveCost(fromCell, toCell, options = {}) {
    const { speed = 'sail', nightMult = 1.0, competitionMult = 1.0 } = options;
    const isDiagonal = fromCell.col !== toCell.col && fromCell.row !== toCell.row;
    const diagonalMult = isDiagonal ? 1.5 : 1.0;

    const speedMult = { drift: 0.5, sail: 1.0, motor: 3.0 }[speed] || 1.0;

    return Math.ceil(
        toCell.costBase * speedMult * nightMult * competitionMult * diagonalMult
    );
}

/**
 * Get physical distance of a move in km
 */
export function cellDistanceKm(cell) {
    const cellDeg = RINGS[cell.ring].cellDeg;
    // Approximate: 1° lat ≈ 111km, 1° lon ≈ 111 * cos(lat) km
    const kmPerDeg = 111;
    return cellDeg * kmPerDeg;
}

/**
 * Generate visible grid cells for rendering on map
 * Returns array of cells within viewport
 */
export function generateGridViewport(viewLat, viewLon, viewRadiusDeg = 0.15) {
    const cells = [];
    const maxRing = getRing(viewLat, viewLon);

    // Generate cells for all applicable rings
    for (let ring = 0; ring <= Math.min(maxRing + 1, RINGS.length - 1); ring++) {
        const cellDeg = RINGS[ring].cellDeg;

        const minCol = Math.floor((viewLon - viewRadiusDeg - CENTER.lon) / cellDeg);
        const maxCol = Math.ceil((viewLon + viewRadiusDeg - CENTER.lon) / cellDeg);
        const minRow = Math.floor((viewLat - viewRadiusDeg - CENTER.lat) / cellDeg);
        const maxRow = Math.ceil((viewLat + viewRadiusDeg - CENTER.lat) / cellDeg);

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                // Only include if this cell actually belongs to this ring
                const cellCenterLat = CENTER.lat + (row + 0.5) * cellDeg;
                const cellCenterLon = CENTER.lon + (col + 0.5) * cellDeg;
                if (getRing(cellCenterLat, cellCenterLon) === ring) {
                    cells.push({
                        ring,
                        col,
                        row,
                        south: CENTER.lat + row * cellDeg,
                        north: CENTER.lat + (row + 1) * cellDeg,
                        west: CENTER.lon + col * cellDeg,
                        east: CENTER.lon + (col + 1) * cellDeg,
                        centerLat: cellCenterLat,
                        centerLon: cellCenterLon,
                        color: RINGS[ring].color,
                        cellDeg,
                        label: RINGS[ring].label,
                    });
                }
            }
        }
    }

    return cells;
}

export { CENTER, RINGS, RING_BOUNDS };
