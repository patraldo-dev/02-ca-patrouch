/**
 * Shared Mistral → ECS scene generation.
 *
 * Used by:
 *   - src/routes/api/cron/generate-scenes  (daily, all portals)
 *   - src/routes/api/portals/[id]/generate-scene  (on-demand, single portal)
 *
 * Runs on the Cloudflare Workers AI binding (`platform.env.AI`) routing the
 * Mistral model @cf/mistralai/mistral-small-3.1-24b-instruct. No external
 * LLM SDK, no new secrets.
 *
 * The Mistral output is normalized through normalizeSceneConfig (enum/clamp/
 * cap + derived visual fields) so the resulting config is render-complete for
 * the default render path (arboleda starfield + themed environments) without
 * needing a static/scenes skeleton.
 */

import { normalizeSceneConfig } from '$lib/portals-ecs/scene-normalizer.js';

const MISTRAL_MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';

// ── System prompt ──
// Asks Mistral for the data it's good at (mood, palette, crystal excerpts,
// story arc) PLUS a few visual anchors (background, fog_color, light_intensity)
// that feed the normalizer's derived lighting/atmosphere. The normalizer
// validates/clamps/derives everything; this just gives Mistral a voice in the
// derived values rather than always guessing.
export const SCENE_SYSTEM_PROMPT = `You are a creative scene designer for a WebXR literary portal system.
Given excerpts from published writings, generate a JSON scene configuration that captures their collective mood, imagery, and atmosphere.

Output ONLY valid JSON matching this schema (no markdown, no explanation):

{
  "environment": {
    "type": "forest|ocean|celebration|space|city|dream|theater|memory"
  },
  "atmosphere": {
    "mood": "string - one word emotional descriptor",
    "intensity": 0.0-1.0,
    "ambient_color": "#hex",
    "fog_density": 0.0-0.08,
    "light_intensity": 0.3-0.8
  },
  "palette": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex - very dark (lightness < 5%)",
    "fog_color": "#hex - darker echo of the palette",
    "crystal_colors": ["#hex", "#hex", "#hex", "#hex"]
  },
  "narrative_states": [
    {
      "label": "string - name of this story phase in Spanish (e.g. 'Umbral', 'Descenso', 'Revelación')",
      "mood": "string - emotional descriptor in Spanish",
      "hue_shift": 0.0-1.0,
      "intensity_mul": 0.2-2.0,
      "fog_mul": 0.0-5.0,
      "crystal_indices": [0, 1, ...]
    }
  ],
  "decorations": {
    "particle_count": 15-50,
    "particle_style": "sparkle|dust|ember|bubble|snow",
    "pillar_count": 3-8,
    "pillar_height": 1.5-3.0,
    "spiral_count": 1-5,
    "spiral_speed": 0.2-0.8,
    "halo_radius": 0.6-1.5,
    "halo_pulse_speed": 0.3-0.8
  },
  "crystals": [
    {"text": "evocative excerpt (max 150 chars)", "color_index": 0-3, "scale": 0.8-1.4}
  ],
  "ambient_texts": ["short phrase 1", "short phrase 2", "short phrase 3"],
  "spatial_layout": {
    "crystal_ring_radius": 1.5-2.5,
    "crystal_elevations": [0.6-1.8],
    "tab_orbit_radius": 2.0-3.0
  }
}

Rules:
- environment.type determines the ENTIRE visual world. Choose based on the dominant imagery in the writings:
    forest = trees, nature, roots, greenery, pollen, life
    ocean = water, depth, waves, blue, submersion, fluidity
    celebration = joy, music, dance, warm colors, rhythm, community
    space = stars, infinity, void, cosmic, isolation, vastness
    city = urban, streets, neon, rain, concrete, window lights
    dream = surreal, floating, purple/pink, subconscious, transformation
    theater = spotlight, stage, narration, amber, candlelight, performance
    memory = sepia, nostalgia, photographs, golden dust, faded, reminiscent
  The type must reflect the FEELING of the stories, not just the portal name.
  If the writings shift mood significantly from the portal default, choose the environment that matches the writings.
- narrative_states: generate exactly 3 story arc phases that reflect the emotional journey of the writings. Each phase should have a unique Spanish label and mood. Hue shift 0=original color, 0.083=warm shift, 0.667=cold/complementary shift. The arc should progress: contemplative → intense → profound.
- crystal_colors must have exactly 4 hex colors
- crystals: extract 4-6 of the most evocative short phrases from the writings (max 6)
- ambient_texts: 2-4 very short fragments (max 80 chars) that drift as text motes
- Colors should reflect the emotional tone of the writings, not just the portal default
- palette.background and fog_color must be very dark (lightness well under 5%)
- atmosphere.light_intensity drives the derived scene lighting (higher = brighter)
- particle_style MUST be exactly one of: sparkle, dust, ember, bubble, snow
- sparkle=festive, dust=contemplative, ember=warm/passionate, bubble=playful, snow=melancholic
- All positions are relative to the user at origin; the ECS handles placement using ring_radius and elevations`;

/**
 * Build the user-facing prompt for a portal + its matched writings.
 * Exported so callers can reuse the exact wording the cron used.
 */
export function buildUserPrompt(portal, excerpts) {
	return `Portal: ${portal.name_es} (${portal.icon})
Portal mood: ${portal.color_primary}
Writings matched (${excerpts.length}):

${JSON.stringify(excerpts, null, 2)}

Generate the scene JSON for this portal based on these writings.`;
}

/**
 * Run Mistral, strip markdown fences, parse JSON (with a fallback extraction).
 * Returns the parsed object or throws with context.
 */
async function callMistral(ai, userPrompt) {
	const aiResponse = await ai.run(MISTRAL_MODEL, {
		messages: [
			{ role: 'system', content: SCENE_SYSTEM_PROMPT },
			{ role: 'user', content: userPrompt }
		],
		temperature: 0.7,
		max_tokens: 1200,
	});

	let sceneText = aiResponse.response || aiResponse.result?.response || '';
	sceneText = sceneText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

	try {
		return JSON.parse(sceneText);
	} catch {
		// Last resort: pull the first {...} block out of the text.
		const jsonMatch = sceneText.match(/\{[\s\S]*\}/);
		if (jsonMatch) return JSON.parse(jsonMatch[0]);
		throw new Error(`Mistral returned unparseable JSON (first 120 chars: "${sceneText.slice(0, 120)}")`);
	}
}

/**
 * Generate a single portal's scene config from matched writings.
 *
 * @param {object} ai             - platform.env.AI (Workers AI binding)
 * @param {object} portal         - portal row (needs name_es, icon, color_primary, color_bg, id)
 * @param {Array}  sourceWritings - writings to analyze ({ title, content, locale })
 * @returns {Promise<{ sceneConfig: object, sourceIds: Array }>}
 */
export async function generateSceneForPortal(ai, portal, sourceWritings) {
	const sourceIds = sourceWritings.map((w) => w.id);

	// Excerpts: max 200 chars each, max 6 writings.
	const excerpts = sourceWritings.slice(0, 6).map((w) => {
		const text = (w.content || '').replace(/\s+/g, ' ').trim();
		return {
			title: w.title || 'Untitled',
			excerpt: text.substring(0, 200),
			locale: w.locale,
		};
	});

	const userPrompt = buildUserPrompt(portal, excerpts);
	const rawConfig = await callMistral(ai, userPrompt);

	const sceneConfig = normalizeSceneConfig(rawConfig, {
		id: portal.id,
		color_primary: portal.color_primary,
		color_bg: portal.color_bg,
	});

	sceneConfig.source_writings = sourceIds;
	return { sceneConfig, sourceIds };
}

/**
 * Match writings to a portal by its trigger keywords (case-insensitive
 * substring match on title + content). Mirrors the original cron logic.
 *
 * @param {Array} writings  - writings to filter ({ title, content })
 * @param {Array} triggers  - keyword strings
 * @param {number} max      - cap per portal
 * @returns {Array}
 */
export function matchWritingsByTriggers(writings, triggers = [], max = 8) {
	const lowered = (triggers || []).map((t) => String(t).toLowerCase());
	return writings
		.filter((w) => {
			const text = ((w.title || '') + ' ' + (w.content || '')).toLowerCase();
			return lowered.some((t) => t && text.includes(t));
		})
		.slice(0, max);
}
