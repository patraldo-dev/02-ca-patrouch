// src/routes/api/bottlequest/grid/+server.js
// Grid view + movement via logarithmic grid

import { json } from '@sveltejs/kit';
import { getCell, generateGridViewport, moveCost, getNeighbors, cellDistanceKm, CENTER } from '$lib/server/logarithmic-grid.js';

// GET: fetch grid cells for viewport
export async function GET({ url, platform }) {
    const lat = parseFloat(url.searchParams.get('lat') || String(CENTER.lat));
    const lon = parseFloat(url.searchParams.get('lon') || String(CENTER.lon));
    const radius = parseFloat(url.searchParams.get('radius') || '0.15');

    const cells = generateGridViewport(lat, lon, radius);

    // Include current player cell if lat/lon provided
    const playerCell = getCell(lat, lon);
    const neighbors = getNeighbors(playerCell);

    return json({
        center: CENTER,
        playerCell,
        neighbors: neighbors.map(n => ({
            ...n,
            fuelCost: moveCost(playerCell, n, { speed: 'sail' }),
            distanceKm: cellDistanceKm(n),
        })),
        cells: cells.slice(0, 500), // cap for performance
        rings: cells.length > 0 ? cells.reduce((acc, c) => {
            if (!acc[c.ring]) acc[c.ring] = { count: 0, cellDeg: c.cellDeg, label: c.label, color: c.color };
            acc[c.ring].count++;
            return acc;
        }, {}) : {},
    });
}
