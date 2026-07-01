/**
 * Scene Config Normalizer
 * 
 * Sanitizes and validates AI-generated scene configs before storing in D1.
 * Catches schema drift from Mistral (e.g. "sparkles" vs "sparkle"),
 * clamps numeric ranges, caps entity counts for mobile GPU safety,
 * and provides deterministic fallbacks.
 */

// ── Valid enums ──
const VALID_PARTICLE_STYLES = ['sparkle', 'dust', 'ember', 'bubble', 'snow'];
const VALID_QUALITY_TIERS = ['rich', 'medium', 'minimal'];

// ── Hex color validation ──
function isValidHex(color) {
    return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color);
}

function safeHex(color, fallback = '#c9a87c') {
    return isValidHex(color) ? color : fallback;
}

// ── Number clamping ──
function clamp(val, min, max, fallback) {
    const n = Number(val);
    if (Number.isNaN(n)) return fallback;
    return Math.min(Math.max(n, min), max);
}

// ── Particle style normalization ──
const PARTICLE_STYLE_ALIASES = {
    'sparkles': 'sparkle',
    'sparkling': 'sparkle',
    'stars': 'sparkle',
    'glitter': 'sparkle',
    'dusty': 'dust',
    'mote': 'dust',
    'dustmote': 'dust',
    'embers': 'ember',
    'fire': 'ember',
    'flame': 'ember',
    'warm': 'ember',
    'bubbles': 'bubble',
    'foam': 'bubble',
    'playful': 'bubble',
    'snowflakes': 'snow',
    'snowflake': 'snow',
    'ice': 'snow',
    'cold': 'snow',
    'rain': 'snow',
    'melancholy': 'snow',
    'melancholic': 'snow',
};

// ── Valid environment types ──
const VALID_ENVIRONMENT_TYPES = ['forest', 'ocean', 'celebration', 'space', 'city', 'dream', 'theater', 'memory'];

const ENVIRONMENT_TYPE_ALIASES = {
	'tree': 'forest', 'trees': 'forest', 'woods': 'forest', 'grove': 'forest', 'jungle': 'forest',
	'sea': 'ocean', 'water': 'ocean', 'underwater': 'ocean', 'marine': 'ocean', 'waves': 'ocean',
	'party': 'celebration', 'fiesta': 'celebration', 'festival': 'celebration', 'carnival': 'celebration',
	'cosmos': 'space', 'cosmic': 'space', 'stars': 'space', 'galaxy': 'space', 'universe': 'space',
	'urban': 'city', 'street': 'city', 'building': 'city', 'metropolis': 'city',
	'dreams': 'dream', 'dreamscape': 'dream', 'surreal': 'dream', 'clouds': 'dream',
	'stage': 'theater', 'spotlight': 'theater', 'performance': 'theater', 'narrative': 'theater',
	'memories': 'memory', 'nostalgia': 'memory', 'sepia': 'memory', 'photo': 'memory', 'photos': 'memory',
};

function normalizeEnvironmentType(raw) {
	if (typeof raw !== 'string') return null;
	const lower = raw.toLowerCase().trim();
	if (VALID_ENVIRONMENT_TYPES.includes(lower)) return lower;
	if (ENVIRONMENT_TYPE_ALIASES[lower]) return ENVIRONMENT_TYPE_ALIASES[lower];
	for (const valid of VALID_ENVIRONMENT_TYPES) {
		if (lower.includes(valid)) return valid;
	}
	return null;
}

function normalizeParticleStyle(raw) {
    if (typeof raw !== 'string') return 'dust';
    const lower = raw.toLowerCase().trim();
    if (VALID_PARTICLE_STYLES.includes(lower)) return lower;
    if (PARTICLE_STYLE_ALIASES[lower]) return PARTICLE_STYLE_ALIASES[lower];
    // Fuzzy: check if any valid style is contained
    for (const valid of VALID_PARTICLE_STYLES) {
        if (lower.includes(valid)) return valid;
    }
    return 'dust';
}

// ── Crystal normalization ──
function normalizeCrystal(raw, maxIndex) {
    if (!raw || typeof raw !== 'object') return null;
    const text = typeof raw.text === 'string' ? raw.text.slice(0, 150).trim() : '';
    if (!text) return null;
    return {
        text,
        color_index: clamp(raw.color_index ?? raw.colorIndex ?? 0, 0, maxIndex, 0),
        scale: clamp(raw.scale ?? 1.0, 0.6, 1.6, 1.0),
    };
}

// ── Quality tier detection ──
function detectQuality(decorations) {
    const particle = decorations.particle_count ?? 30;
    const pillars = decorations.pillar_count ?? 4;
    const spirals = decorations.spiral_count ?? 2;
    const total = particle + (pillars * 3) + (spirals * 8);
    if (total > 70) return 'rich';
    if (total > 35) return 'medium';
    return 'minimal';
}

// ── Main normalizer ──
export function normalizeSceneConfig(raw, portalDefaults = {}) {
    const fallbackPrimary = portalDefaults.color_primary || '#c9a87c';
    const fallbackBg = portalDefaults.color_bg || '#1a1a2e';

    // Start with safe defaults
    const normalized = {
        portal_id: portalDefaults.id || null,
        source_writings: [],
        generated_at: new Date().toISOString(),
        quality: 'medium',
        environment: {
            type: null, // will be set from raw if valid
        },
        atmosphere: {
            mood: 'contemplative',
            intensity: 0.5,
            ambient_color: fallbackPrimary,
            fog_density: 0.0,
            light_intensity: 0.5,
        },
        narrative_states: [
            { label: 'Umbral',     mood: 'contemplativo',  hue_shift: 0,     intensity_mul: 1.0, fog_mul: 1.0, crystal_indices: [0,1] },
            { label: 'Descenso',   mood: 'cálido',         hue_shift: 0.083, intensity_mul: 1.3, fog_mul: 0.4, crystal_indices: [0,1,2,3] },
            { label: 'Revelación', mood: 'profundo',       hue_shift: 0.667, intensity_mul: 0.6, fog_mul: 3.0, crystal_indices: [0,1,2,3,4] },
        ],
        palette: {
            primary: fallbackPrimary,
            secondary: '#4fc3f7',
            accent: '#ce93d8',
            crystal_colors: [fallbackPrimary, '#4fc3f7', '#b5ead7', '#ce93d8'],
        },
        decorations: {
            particle_count: 30,
            particle_style: 'dust',
            pillar_count: 4,
            pillar_height: 2.0,
            spiral_count: 2,
            spiral_speed: 0.4,
            halo_radius: 1.0,
            halo_pulse_speed: 0.4,
        },
        crystals: [],
        ambient_texts: [],
        spatial_layout: {
            crystal_ring_radius: 1.8,
            crystal_elevations: [0.6, 1.0, 1.4],
            tab_orbit_radius: 2.5,
        },
    };

    if (!raw || typeof raw !== 'object') return normalized;

    // ── Environment type (determines unique visual world) ──
    const envType = normalizeEnvironmentType(raw.environment?.type ?? raw.environment_type);
    if (envType) {
        normalized.environment = { type: envType };
    }

    // ── Atmosphere ──
    const atmo = raw.atmosphere || {};
    normalized.atmosphere.mood = typeof atmo.mood === 'string' ? atmo.mood.slice(0, 30) : 'contemplative';
    normalized.atmosphere.intensity = clamp(atmo.intensity, 0.0, 1.0, 0.5);
    normalized.atmosphere.ambient_color = safeHex(atmo.ambient_color, fallbackPrimary);
    normalized.atmosphere.fog_density = clamp(atmo.fog_density ?? atmo.fogDensity, 0.0, 0.08, 0.0);
    normalized.atmosphere.light_intensity = clamp(atmo.light_intensity ?? atmo.lightIntensity, 0.2, 0.9, 0.5);

    // ── Palette ──
    const pal = raw.palette || {};
    normalized.palette.primary = safeHex(pal.primary, fallbackPrimary);
    normalized.palette.secondary = safeHex(pal.secondary, '#4fc3f7');
    normalized.palette.accent = safeHex(pal.accent, '#ce93d8');

    // crystal_colors: ensure exactly 4 valid hex
    let crystalColors = [];
    if (Array.isArray(pal.crystal_colors)) {
        crystalColors = pal.crystal_colors.filter(isValidHex);
    }
    while (crystalColors.length < 4) {
        crystalColors.push(normalized.palette.crystal_colors[crystalColors.length] || fallbackPrimary);
    }
    normalized.palette.crystal_colors = crystalColors.slice(0, 4);

    // ── Decorations ──
    const deco = raw.decorations || {};
    normalized.decorations.particle_count = Math.round(clamp(deco.particle_count ?? deco.particleCount, 5, 60, 30));
    normalized.decorations.particle_style = normalizeParticleStyle(deco.particle_style ?? deco.particleStyle);
    normalized.decorations.pillar_count = Math.round(clamp(deco.pillar_count ?? deco.pillarCount, 0, 8, 4));
    normalized.decorations.pillar_height = clamp(deco.pillar_height ?? deco.pillarHeight, 1.0, 3.5, 2.0);
    normalized.decorations.spiral_count = Math.round(clamp(deco.spiral_count ?? deco.spiralCount, 0, 5, 2));
    normalized.decorations.spiral_speed = clamp(deco.spiral_speed ?? deco.spiralSpeed, 0.1, 1.0, 0.4);
    normalized.decorations.halo_radius = clamp(deco.halo_radius ?? deco.haloRadius, 0.4, 1.8, 1.0);
    normalized.decorations.halo_pulse_speed = clamp(deco.halo_pulse_speed ?? deco.haloPulseSpeed, 0.1, 1.0, 0.4);

    // ── Quality tier ──
    if (typeof raw.quality === 'string' && VALID_QUALITY_TIERS.includes(raw.quality)) {
        normalized.quality = raw.quality;
    } else {
        normalized.quality = detectQuality(normalized.decorations);
    }

    // Apply quality tier adjustments
    if (normalized.quality === 'minimal') {
        normalized.decorations.particle_count = Math.round(normalized.decorations.particle_count * 0.5);
        normalized.decorations.pillar_count = Math.min(normalized.decorations.pillar_count, 3);
        normalized.decorations.spiral_count = Math.min(normalized.decorations.spiral_count, 1);
    } else if (normalized.quality === 'medium') {
        normalized.decorations.particle_count = Math.round(normalized.decorations.particle_count * 0.75);
    }

    // ── Crystals (max 6 for GPU safety) ──
    const maxColorIdx = normalized.palette.crystal_colors.length - 1;
    if (Array.isArray(raw.crystals)) {
        normalized.crystals = raw.crystals
            .map(c => normalizeCrystal(c, maxColorIdx))
            .filter(Boolean)
            .slice(0, 6);
    }

    // ── Ambient texts (max 4, max 80 chars) ──
    if (Array.isArray(raw.ambient_texts ?? raw.ambientTexts)) {
        normalized.ambient_texts = (raw.ambient_texts ?? raw.ambientTexts)
            .filter(t => typeof t === 'string' && t.trim())
            .map(t => t.slice(0, 80).trim())
            .slice(0, 4);
    }

    // ── Spatial layout ──
    const layout = raw.spatial_layout ?? raw.spatialLayout ?? {};
    normalized.spatial_layout.crystal_ring_radius = clamp(
        layout.crystal_ring_radius ?? layout.crystalRingRadius, 1.0, 3.0, 1.8
    );

    // Elevations: array of numbers 0.4-2.0
    let elevations = layout.crystal_elevations ?? layout.crystalElevations;
    if (Array.isArray(elevations) && elevations.length > 0) {
        normalized.spatial_layout.crystal_elevations = elevations
            .map(e => clamp(e, 0.4, 2.0, 1.0))
            .slice(0, 4);
    }
    if (normalized.spatial_layout.crystal_elevations.length === 0) {
        normalized.spatial_layout.crystal_elevations = [0.6, 1.0, 1.4];
    }

    normalized.spatial_layout.tab_orbit_radius = clamp(
        layout.tab_orbit_radius ?? layout.tabOrbitRadius, 1.5, 3.5, 2.5
    );

    // ── Narrative States (max 5, AI-generated story arc) ──
    const rawStates = raw.narrative_states ?? raw.narrativeStates;
    if (Array.isArray(rawStates) && rawStates.length >= 2) {
        normalized.narrative_states = rawStates
            .filter(s => s && typeof s === 'object')
            .map((s, i) => ({
                label: typeof s.label === 'string' ? s.label.slice(0, 40).trim() : `Estado ${i}`,
                mood: typeof s.mood === 'string' ? s.mood.slice(0, 40).trim() : 'contemplativo',
                hue_shift: clamp(s.hue_shift ?? s.hueShift ?? i * 0.083, 0, 1, i * 0.083),
                intensity_mul: clamp(s.intensity_mul ?? s.intensityMul, 0.2, 2.0, 1.0),
                fog_mul: clamp(s.fog_mul ?? s.fogMul, 0.0, 5.0, 1.0),
                crystal_indices: Array.isArray(s.crystal_indices ?? s.crystalIndices)
                    ? (s.crystal_indices ?? s.crystalIndices).filter(n => Number.isInteger(n) && n >= 0 && n < 6)
                    : [0, 1],
            }))
            .slice(0, 5);
    }

    return normalized;
}
