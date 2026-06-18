// src/lib/poi.js
// Puerto Vallarta points of interest — narrative simplification
// No navmesh, no drift simulation. Just a graph of places.

export const POIS = {
    muertos: {
        id: 'muertos',
        name: 'Playa de los Muertos',
        icon: '🏖️',
        lat: 20.6018,
        lon: -105.2395,
        zoom: 17,
        blurb: 'El corazón de Vallarta. Pescadores, turistas, y el Caballito de Mar presidiendo la arena.',
        subspots: [
            { id: 'pier', name: 'Muelle de los Muertos', icon: '🗼', lat: 20.6012, lon: -105.2370, blurb: 'El muelle nuevo se extiende sobre la bahía. Lugar de encuentro y despedidas.' },
            { id: 'bluechairs', name: 'Blue Chairs', icon: '💺', lat: 20.6025, lon: -105.2390, blurb: 'El icónico resort gay. Música, playa, y siempre una botella a la deriva cerca.' },
            { id: 'seahorse', name: 'El Caballito de Mar', icon: '🐴', lat: 20.6018, lon: -105.2395, blurb: 'La escultura emblemática. Donde la playa se encuentra con el muelle.' },
        ],
    },
    malecon: {
        id: 'malecon',
        name: 'Malecón',
        icon: '🌊',
        lat: 20.6090,
        lon: -105.2350,
        zoom: 16,
        blurb: 'El paseo marítimo. Esculturas de bronce, vendedores, el océano a un lado, la ciudad al otro.',
        subspots: [
            { id: 'sculptures', name: 'Paseo de las Esculturas', icon: '🗿', lat: 20.6090, lon: -105.2350, blurb: 'El Niño sobre el Caballito de Mar, la minimalista columna infinita, y otras obras de Sergio Bustamante.' },
            { id: 'arches', name: 'Los Arcos', icon: '🏞️', lat: 20.6105, lon: -105.2340, blurb: 'El anfiteatro al aire libre. Músicos, payasos, y el espíritu bohemio de Vallarta.' },
            { id: 'plaza', name: 'Plaza de Armas', icon: '⛪', lat: 20.6110, lon: -105.2345, blurb: 'La plaza principal, con la iglesia de Guadalupe asomándose por detrás.' },
        ],
    },
    romantica: {
        id: 'romantica',
        name: 'Zona Romántica',
        icon: '🌹',
        lat: 20.5980,
        lon: -105.2420,
        zoom: 16,
        blurb: 'El barrio más encantador. Calles empedradas, cafés, galerías, y la vida que pulsa despacio.',
        subspots: [
            { id: 'plazuela', name: 'Plazuela de los Centenarios', icon: '🌳', lat: 20.5980, lon: -105.2420, blurb: 'La placita sombreada. Banquitas, árboles, y el kiosco donde alguien siempre toca algo.' },
            { id: 'olaltas', name: 'Calle Olas Altas', icon: '🚶', lat: 20.5990, lon: -105.2410, blurb: 'La calle bohemia. Tiendas, cafés, y el flujo constante de personajes interesantes.' },
            { id: 'gallery', name: 'Galería Corsica', icon: '🖼️', lat: 20.5970, lon: -105.2430, blurb: 'Arte contemporáneo en una casona restaurada. Las botellas con mensajes cuelgan de veces en vez.' },
        ],
    },
    marina: {
        id: 'marina',
        name: 'Marina Vallarta',
        icon: '⛵',
        lat: 20.6560,
        lon: -105.2640,
        zoom: 15,
        blurb: 'Yates, veleros, y el faro que guía a los navegantes. Punto de partida y de naufragios.',
        subspots: [
            { id: 'docks', name: 'Muelles', icon: '🛟', lat: 20.6560, lon: -105.2640, blurb: 'Las filas de barcos amarrados. Aquí se lanzan las botellas al mar.' },
            { id: 'lighthouse', name: 'El Faro', icon: '🏮', lat: 20.6550, lon: -105.2650, blurb: 'El faro vigía. Desde arriba se ve toda la bahía, y a veces, una botella solitaria flotando.' },
        ],
    },
    conchas: {
        id: 'conchas',
        name: 'Conchas Chinas',
        icon: '🐚',
        lat: 20.5780,
        lon: -105.2570,
        zoom: 16,
        blurb: 'La cala escondida al sur. Rocas, agua cristalina, y el secreto mejor guardado de Vallarta.',
        subspots: [
            { id: 'cove', name: 'La Cala', icon: '🪨', lat: 20.5780, lon: -105.2570, blurb: 'Un hueco entre las rocas. Arena blanca, agua turquesa. Lugar de botellas varadas.' },
            { id: 'cliffs', name: 'Los Acantilados', icon: '⛰️', lat: 20.5790, lon: -105.2580, blurb: 'Las rocas sobre la cala. Un salto, una vista, un lugar para contemplar el horizonte.' },
        ],
    },
    olas: {
        id: 'olas',
        name: 'Olas Altas',
        icon: '🌅',
        lat: 20.5985,
        lon: -105.2380,
        zoom: 17,
        blurb: 'La playa del atardecer. Donde el Malecón termina y la Zona Romántica comienza.',
        subspots: [
            { id: 'breakwater', name: 'El Rompeolas', icon: '🪨', lat: 20.5990, lon: -105.2380, blurb: 'Las rocas que separan las dos bahías. Sentarse aquí al atardecer es un ritual.' },
            { id: 'beach', name: 'Playita', icon: '🏖️', lat: 20.5980, lon: -105.2385, blurb: 'La pequeña playa entre las rocas. Íntima, protegida, perfecta para hallazgos.' },
        ],
    },
};

// Adjacency graph — who can travel to whom directly
export const EDGES = {
    muertos:   ['malecon', 'romantica', 'olas'],
    malecon:   ['muertos', 'romantica', 'marina'],
    romantica: ['muertos', 'malecon', 'olas'],
    olas:      ['muertos', 'romantica'],
    marina:    ['malecon'],
    conchas:   ['romantica'],
};

// Hops distance (BFS) — for Power cost calculation
export function hopsBetween(fromId, toId) {
    if (fromId === toId) return 0;
    const queue = [[fromId, 0]];
    const visited = new Set([fromId]);
    while (queue.length) {
        const [node, dist] = queue.shift();
        const neighbors = EDGES[node] || [];
        for (const n of neighbors) {
            if (n === toId) return dist + 1;
            if (!visited.has(n)) {
                visited.add(n);
                queue.push([n, dist + 1]);
            }
        }
    }
    return Infinity; // no path
}

// Narrative travel text — flavor for each hop
export const TRAVEL_NARRATIVES = {
    muertos_malecon: 'Caminas hacia el norte por la arena, pasando los restaurantes sobre pilotes. El Malecón se asoma entre los edificios.',
    muertos_romantica: 'Tomas la calle Basilio Badillo hacia el interior. Los árboles frondosos te reciben en la Zona Romántica.',
    muertos_olas: 'Bordeas la línea de costa hacia el sur. Las rocas del rompeolas aparecen, y con ellas, Olas Altas.',
    malecon_muertos: 'Desciendes del Malecón hacia el sur. El Caballito de Mar te saluda desde la arena de Los Muertos.',
    malecon_romantica: 'Bajas por las calles empinadas hacia el sur. El bullicio turístico cede paso al encanto bohemio.',
    malecon_marina: 'Tomas un taxi hacia el norte por la zona hotelera. Los yates blancos de la Marina brillan a lo lejos.',
    romantica_muertos: 'Bajas por Basilio Badillo hacia el mar. El sonido de las olas crece hasta que ves la playa.',
    romantica_malecon: 'Subes por las calles empinadas hacia el norte. El océano aparece entre los edificios, y con él, el Malecón.',
    romantica_olas: 'Una cuadra al sur y estás en la playita de Olas Altas. El rompeolas te da la bienvenida.',
    romantica_conchas: 'Tomas el camino costero al sur, subiendo las colinas. Conchas Chinas aparece abajo, turquesa y secreta.',
    olas_muertos: 'Caminas hacia el norte por la arena. El muelle de Los Muertos se hace más grande.',
    olas_romantica: 'Subes una cuadra desde la playa. Estás en el corazón de la Zona Romántica.',
    marina_malecon: 'El taxi baja por la zona hotelera hacia el centro. El Malecón te recibe con sus esculturas.',
    conchas_romantica: 'El camino costero de regreso. Las colinas verdes, el mar azul, y la Zona Romántica apareciendo abajo.',
};

export function getTravelNarrative(fromId, toId) {
    const key1 = `${fromId}_${toId}`;
    const key2 = `${toId}_${fromId}`;
    return TRAVEL_NARRATIVES[key1] || TRAVEL_NARRATIVES[key2] || `Viajas de ${POIS[fromId]?.name || fromId} a ${POIS[toId]?.name || toId}.`;
}

// Transport modes — simplified, no pathfinding, just cost flavor
export const TRAVEL_MODES = {
    walk: { id: 'walk', label: 'A pie', icon: '🚶', costPerHop: 0, timePerHop: '10-15 min', desc: 'Gratis. El mejor modo para descubrir Vallarta.' },
    taxi: { id: 'taxi', label: 'Taxi', icon: '🚕', costPerHop: 15, timePerHop: '5 min', desc: 'Rápido y cómodo. 15 ⚡ por escala.' },
    boat: { id: 'boat', label: 'Lancha', icon: '🚤', costPerHop: 30, timePerHop: '3 min', desc: 'Por agua. Solo entre puntos costeros. 30 ⚡ por escala.' },
};

// Check if boat travel is possible (both POIs must be coastal)
const COASTAL_POIS = ['muertos', 'olas', 'malecon', 'marina', 'conchas'];
export function canBoat(fromId, toId) {
    return COASTAL_POIS.includes(fromId) && COASTAL_POIS.includes(toId);
}

// Calculate travel cost for a mode
export function calculateTravelCost(fromId, toId, modeId) {
    const mode = TRAVEL_MODES[modeId];
    if (!mode) return { cost: Infinity };
    const hops = hopsBetween(fromId, toId);
    if (hops === Infinity) return { cost: Infinity, impossible: true };
    if (modeId === 'boat' && !canBoat(fromId, toId)) return { cost: Infinity, impossible: true };
    return {
        cost: mode.costPerHop * hops,
        hops,
        mode: modeId,
        narrative: getTravelNarrative(fromId, toId),
    };
}

// All POI coordinates for map centering
export const POI_LIST = Object.values(POIS);
