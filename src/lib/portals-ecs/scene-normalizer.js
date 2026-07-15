// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict JS type-checking (see jsconfig.json).
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

// Convert a hex to {h,s,l} (h,s,l all 0-1) for hue-relative derivation.
function hexToHsl(hex) {
    const c = (hex || '#000000').replace('#', '');
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
    }
    return { h, s, l };
}

function hslToHex(h, s, l) {
    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Same hue & saturation as `baseHex`, new lightness.
function withLightness(baseHex, lightness) {
    const { h, s } = hexToHsl(baseHex);
    return hslToHex(h, s, Math.min(1, Math.max(0, lightness)));
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
const VALID_ENVIRONMENT_TYPES = ['forest', 'ocean', 'celebration', 'space', 'city', 'dream', 'theater', 'memory', 'parallax', 'lithograph'];

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
            background: '#05030a',     // derived below; very dark by default
            fog_color: '#0a0612',      // derived below
            fog_density: 0.025,
            safe_text_color: '#ffffff', // derived below
            crystal_colors: [fallbackPrimary, '#4fc3f7', '#b5ead7', '#ce93d8'],
        },
        // Render-complete visual fields (the default render path reads these
        // directly). Derived at the end of normalizeSceneConfig from palette +
        // atmosphere + decorations so a generated config renders without a
        // static/scenes skeleton. Kept here as safe fallbacks.
        lighting: {
            ambient: { color: '#1a1a2e', intensity: 0.6 },
            key_light: { color: fallbackPrimary, intensity: 3.0, distance: 20, position: [2, 3, 2] },
            rim_light: { color: '#4a6fa5', intensity: 2.0, distance: 15, position: [-3, 1, -2] },
            under_light: { color: '#8b5cf6', intensity: 1.5, distance: 8, position: [0, -2, 1] },
        },
        ambient_particles: {
            count: 30,
            spawn_radius: 8,
            size: 0.05,
            opacity: 0.7,
            color_range: { hue_start: 0.3, hue_span: 0.15, saturation: 0.7, lightness_min: 0.5, lightness_max: 0.8 },
            drift_speed: 0.02,
        },
        camera: { orbit: { radius_a: 5.0, radius_b: 3.5, height: 1.0, speed: 0.06 } },
        narrative_texts: { es: [], en: [], fr: [] },
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

    // ── Parallax layers (only for environment.type === 'parallax') ──
    normalized.layers = normalizeLayers(raw.layers, normalized.environment?.type);

    // ═══ Render-complete derivation ═══
    // The default render path (arboleda starfield + themed environments) reads
    // palette.background / fog_color / fog_density, lighting, ambient_particles,
    // camera.orbit, and narrative_texts — none of which Mistral reliably emits.
    // Derive them from the normalized palette/atmosphere/decorations so a
    // generated config renders correctly without a static/scenes skeleton.
    deriveRenderFields(normalized, raw);

    return normalized;
}

// ── Parallax layer kinds + silhouettes (the diorama vocabulary) ──
const VALID_LAYER_KINDS = ['mountains', 'treeline', 'skyline', 'waves', 'clouds', 'ferns', 'grasses', 'stars', 'geometry', 'arch'];
const VALID_LAYER_SILHOUETTES = ['jagged', 'rounded', 'pointed', 'flat', 'uneven'];
const VALID_LAYER_POSITIONS = ['bottom', 'horizon', 'top', 'floating'];

// A sensible default 5-layer composition used when Mistral omits `layers`
// (or when env type isn't parallax but a renderer falls back to it).
const DEFAULT_LAYERS = [
	{ depth: 0.0, kind: 'stars',    silhouette: 'flat',    density: 0.6, height: 0.6, position: 'top',      tint_shift: 0 },
	{ depth: 0.25, kind: 'mountains', silhouette: 'jagged', density: 0.5, height: 0.4, position: 'horizon',  tint_shift: -0.05 },
	{ depth: 0.5, kind: 'treeline', silhouette: 'rounded', density: 0.7, height: 0.3, position: 'bottom',   tint_shift: 0 },
	{ depth: 0.75, kind: 'ferns',   silhouette: 'pointed', density: 0.8, height: 0.25, position: 'bottom',  tint_shift: 0.05 },
	{ depth: 1.0, kind: 'grasses',  silhouette: 'pointed', density: 0.9, height: 0.15, position: 'bottom',  tint_shift: 0.08 },
];

function normalizeLayers(rawLayers, envType) {
	// Layers are only meaningful for parallax; other env types return null so the
	// renderer ignores them. But always return something valid for parallax.
	if (envType !== 'parallax') return null;

	if (!Array.isArray(rawLayers) || rawLayers.length === 0) {
		return DEFAULT_LAYERS;
	}

	const normalized = rawLayers
		.filter((l) => l && typeof l === 'object')
		.map((l) => {
			const kind = VALID_LAYER_KINDS.includes(l.kind) ? l.kind : 'geometry';
			return {
				depth: clamp(l.depth ?? 0.5, 0, 1, 0.5),
				kind,
				silhouette: VALID_LAYER_SILHOUETTES.includes(l.silhouette) ? l.silhouette : 'rounded',
				density: clamp(l.density ?? 0.6, 0.2, 1.0, 0.6),
				height: clamp(l.height ?? 0.4, 0.1, 0.9, 0.4),
				position: VALID_LAYER_POSITIONS.includes(l.position) ? l.position : 'bottom',
				tint_shift: clamp(l.tint_shift ?? l.tintShift ?? 0, -0.15, 0.15, 0),
			};
		})
		.slice(0, 8); // cap at 8 layers for perf

	// Sort far-to-near so the renderer can stack predictably.
	normalized.sort((a, b) => a.depth - b.depth);

	return normalized.length ? normalized : DEFAULT_LAYERS;
}

// ── Particle-style → visual params (mirrors the cron prompt's mood mapping) ──
const PARTICLE_STYLE_PARAMS = {
    sparkle: { size: 0.06, opacity: 0.85, drift_speed: 0.03, hue_span: 0.2 },  // festive, lively
    dust:    { size: 0.04, opacity: 0.6,  drift_speed: 0.015, hue_span: 0.1 }, // contemplative, slow
    ember:   { size: 0.05, opacity: 0.75, drift_speed: 0.04, hue_span: 0.08 }, // warm, rising
    bubble:  { size: 0.07, opacity: 0.7,  drift_speed: 0.02, hue_span: 0.25 }, // playful, varied
    snow:    { size: 0.05, opacity: 0.55, drift_speed: 0.01, hue_span: 0.05 }, // melancholic, sparse
};

function deriveRenderFields(normalized, raw) {
    const primary = normalized.palette.primary;
    const secondary = normalized.palette.secondary;
    const accent = normalized.palette.accent;
    const { h: primaryHue } = hexToHsl(primary);

    // ── Palette: background / fog (very dark, same hue as primary) ──
    // Prefer Mistral-provided values if they're valid + actually dark.
    const rawBg = raw.palette?.background ?? raw.palette?.bg;
    const rawFog = raw.palette?.fog_color ?? raw.palette?.fogColor;
    normalized.palette.background = (isValidHex(rawBg) && hexToHsl(rawBg).l < 0.06)
        ? rawBg
        : withLightness(primary, 0.03);
    normalized.palette.fog_color = (isValidHex(rawFog) && hexToHsl(rawFog).l < 0.08)
        ? rawFog
        : withLightness(primary, 0.06);
    normalized.palette.fog_density = clamp(raw.palette?.fog_density ?? raw.palette?.fogDensity ?? normalized.atmosphere.fog_density, 0.0, 0.08, 0.025);

    // safe_text_color: bright variant of the primary hue for WCAG-AA on the dark bg.
    const rawSafe = raw.palette?.safe_text_color ?? raw.palette?.safeTextColor;
    normalized.palette.safe_text_color = isValidHex(rawSafe)
        ? rawSafe
        : withLightness(primary, 0.78);

    // ── Lighting (derived from palette + atmosphere.light_intensity) ──
    const li = clamp(normalized.atmosphere.light_intensity, 0.2, 0.9, 0.5);
    normalized.lighting = {
        ambient: { color: withLightness(primary, 0.12), intensity: clamp(0.4 + li * 0.5, 0.2, 1.0) },
        key_light: {
            color: primary,
            intensity: clamp(2.0 + li * 3.0, 1.0, 6.0),  // 2.0–6.0 keyed off mood brightness
            distance: 20,
            position: [2, 3, 2],
        },
        rim_light: {
            color: accent,
            intensity: clamp(1.4 + li * 1.6, 0.8, 3.5),
            distance: 15,
            position: [-3, 1, -2],
        },
        under_light: {
            color: secondary,
            intensity: clamp(1.0 + li * 1.2, 0.5, 2.5),
            distance: 8,
            position: [0, -2, 1],
        },
    };

    // ── Ambient particles (derived from decorations) ──
    const deco = normalized.decorations;
    const style = PARTICLE_STYLE_PARAMS[deco.particle_style] || PARTICLE_STYLE_PARAMS.dust;
    normalized.ambient_particles = {
        count: deco.particle_count,
        spawn_radius: 8,
        size: style.size,
        opacity: style.opacity,
        color_range: {
            hue_start: (primaryHue - style.hue_span / 2 + 1) % 1,
            hue_span: style.hue_span,
            saturation: 0.7,
            lightness_min: 0.5,
            lightness_max: 0.8,
        },
        drift_speed: style.drift_speed,
    };

    // ── Camera orbit (speed from atmosphere.intensity) ──
    const intensity = clamp(normalized.atmosphere.intensity, 0.0, 1.0, 0.5);
    // Contemplative (0.0) → slow 0.04; energetic (1.0) → brisk 0.08.
    const speed = clamp(0.04 + intensity * 0.04, 0.03, 0.09);
    normalized.camera = { orbit: { radius_a: 5.0, radius_b: 3.5, height: 1.0, speed } };

    // ── Narrative texts (es/en/fr) ──
    // The renderer reads narrative_texts[lang] || narrative_texts.es to populate
    // proximity revelations (RevelationSystem). Pull from crystals first — these
    // are the evocative excerpts Mistral distilled from the actual writings — so
    // that exploring objects uncovers real writing-derived content. Fall back to
    // ambient_texts, then static defaults.
    const crystalTexts = (normalized.crystals || []).map(c => c.text).filter(Boolean);
    const ambient = normalized.ambient_texts && normalized.ambient_texts.length
        ? normalized.ambient_texts : [];
    const texts = crystalTexts.length ? crystalTexts
        : ambient.length ? ambient
        : ['❝ Cada historia es un portal ❞', '❝ Toca para entrar ❞', '❝ Los espíritus esperan ❞'];
    normalized.narrative_texts = { es: texts, en: texts, fr: texts };

    // ── Narration passage (longer story-like text for spoken narration) ──
    // Optional — only present when the portal-architect generated it. The audio
    // itself lives in portal_narrations (too large for scene_config); this field
    // carries the TEXT for subtitles + as the TTS source if audio is missing.
    if (raw.narration && typeof raw.narration === 'object') {
        const cap = (s, fallback) => {
            const v = typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, 1500) : '';
            return v || fallback;
        };
        const es = cap(raw.narration.es, '');
        normalized.narration = {
            es,
            en: cap(raw.narration.en, es),
            fr: cap(raw.narration.fr, es),
        };
    } else {
        normalized.narration = null;
    }
}
