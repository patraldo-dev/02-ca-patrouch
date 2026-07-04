/**
 * Portal Architect — the four-way emergent-portal orchestrator.
 *
 * One run cycle classifies recent writings against the existing portal
 * landscape and decides, per thematic cluster, one of four actions:
 *
 *   1. enhance_scene    — regenerate an existing portal's scene config
 *   2. add_scene        — add a named variant scene to an existing portal
 *   3. birth_portal     — create a brand-new portal (full end-to-end: row +
 *                         art + scene config + links + environment.type)
 *   4. enhance_metadata — adjust an existing portal's triggers/keywords
 *
 * Guardrails keep it safe without human review:
 *   - Max 1 birth per cycle, hard cap of MAX_PORTALS total
 *   - No near-duplicate births (Jaccard similarity guard)
 *   - Slug sanitization + collision rejection
 *   - Environment-type validation via the normalizer
 *   - Failure isolation: art/scene failures don't abort the birth
 *
 * Used by:
 *   - src/routes/api/cron/generate-scenes  (the daily cycle)
 *   - src/routes/api/portals/reindex       (manual/admin trigger, Phase 2)
 */

import { generateSceneForPortal, matchWritingsByTriggers } from './scene-generator.js';
import { normalizeSceneConfig } from '$lib/portals-ecs/scene-normalizer.js';
import { generatePortalArt } from './generate-portal-art.js';

// ── Guardrails ──────────────────────────────────────────────
const MAX_PORTALS = 30;          // hard ceiling; after this, only enhance
const MAX_BIRTHS_PER_CYCLE = 1;  // prevent sprawl
const DUPLICATE_THRESHOLD = 0.6; // Jaccard similarity above this = duplicate
const MIN_WRITINGS_TO_BIRTH = 3; // need at least this many matching a new theme

const VALID_ENV_TYPES = ['forest', 'ocean', 'celebration', 'space', 'city', 'dream', 'theater', 'memory'];

const MISTRAL_MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';

/**
 * Run one architect cycle.
 *
 * @param {D1Database} db   - platform.env.DB_book
 * @param {object} ai       - platform.env.AI
 * @param {object} [opts]   - { now?: Date, forceBirth?: boolean }
 * @returns {Promise<{ actions: Array, applied: Array, skipped: Array }>}
 */
export async function runCycle(db, ai, opts = {}) {
	if (!db) throw new Error('portal-architect: db is required');
	const cfToken = opts.cfToken ?? null; // CLOUDFLARE_API_TOKEN, needed for art gen

	// ── 1. Load the landscape ──
	const { results: portals } = await db.prepare(
		`SELECT id, galaxy_id, icon, color_primary, color_bg, color_text, triggers,
		        name_es, name_en, name_fr, environment_type, status
		 FROM portals WHERE status = 'active'`
	).all();

	const { results: writings } = await db.prepare(
		`SELECT id, title, content, locale, category FROM writings
		 WHERE status = 'published' AND created_at > datetime('now', '-30 days')
		 ORDER BY created_at DESC LIMIT 50`
	).all();

	if (!writings?.length) {
		return { actions: [], applied: [], skipped: [], reason: 'no recent writings' };
	}

	// Build the portal landscape summary for the planner prompt
	const landscape = (portals || []).map((p) => {
		let triggers = [];
		try { triggers = JSON.parse(p.triggers || '[]'); } catch {}
		return {
			id: p.id,
			name: p.name_es,
			envType: p.environment_type || inferEnvType(p, triggers),
			triggers,
		};
	});

	// ── 2. Classify writings → thematic clusters ──
	const matchedWritingIds = new Set();
	for (const portal of landscape) {
		const matched = matchWritingsByTriggers(writings, portal.triggers, 50);
		for (const w of matched) matchedWritingIds.add(w.id);
	}
	const unmatched = writings.filter((w) => !matchedWritingIds.has(w.id));

	// ── 3. Ask Mistral for a plan ──
	const plan = await planCycle(ai, landscape, writings, unmatched);

	// ── 4. Execute actions with guardrails ──
	const applied = [];
	const skipped = [];
	let birthsThisCycle = 0;

	for (const action of plan.actions || []) {
		try {
			// Guardrail: birth caps
			if ((action.action === 'birth_portal') && birthsThisCycle >= MAX_BIRTHS_PER_CYCLE) {
				skipped.push({ action, reason: 'max births per cycle reached' });
				continue;
			}
			if ((action.action === 'birth_portal') && (portals.length + birthsThisCycle) >= MAX_PORTALS) {
				skipped.push({ action, reason: 'portal cap reached' });
				continue;
			}

			// Guardrail: duplicate detection for births
			if (action.action === 'birth_portal') {
				const dup = findDuplicate(action.triggers || [], landscape);
				if (dup) {
					// Downgrade to enhance_metadata on the near-duplicate
					skipped.push({ action, reason: `duplicate of ${dup.id} (similarity > ${DUPLICATE_THRESHOLD})` });
					const downgraded = { action: 'enhance_metadata', target: dup.id, addTriggers: action.triggers?.slice(0, 5) || [] };
					const result = await executeAction(downgraded, { db, ai, cfToken, landscape, writings, unmatched });
					applied.push(result);
					continue;
				}
			}

			const result = await executeAction(action, { db, ai, cfToken, landscape, writings, unmatched });
			if (result.action === 'birth_portal') birthsThisCycle++;
			applied.push(result);
		} catch (err) {
			skipped.push({ action, reason: err.message });
		}
	}

	return { actions: plan.actions || [], applied, skipped, plan_reasoning: plan.reasoning };
}

// ── The planner prompt ─────────────────────────────────────

async function planCycle(ai, landscape, writings, unmatched) {
	if (!ai) {
		// No AI → fall back to enhance-only for existing portals that have matches
		return { actions: [], reasoning: 'AI unavailable' };
	}

	// Build writing excerpts grouped by matched/unmatched
	const excerpts = writings.slice(0, 12).map((w) => ({
		title: w.title || 'Untitled',
		excerpt: (w.content || '').replace(/\s+/g, ' ').trim().slice(0, 150),
		locale: w.locale,
	}));

	const landscapeStr = landscape.map((p) =>
		`- ${p.id} (${p.name}, env=${p.envType}): triggers=[${p.triggers.slice(0, 6).join(', ')}]`
	).join('\n');

	const unmatchedCount = unmatched.length;
	const unmatchedExcerpts = unmatched.slice(0, 5).map((w) =>
		(w.title || 'Untitled') + ': ' + (w.content || '').slice(0, 200)
	).join('\n---\n');

	const prompt = `You are the cosmic architect of a creative writing portal universe.

EXISTING PORTALS:
${landscapeStr}

RECENT WRITINGS (sample of ${excerpts.length}):
${JSON.stringify(excerpts, null, 2)}

${unmatchedCount > 0 ? `WRITINGS THAT DON'T FIT ANY EXISTING PORTAL (${unmatchedCount} unmatched):
${unmatchedExcerpts}` : 'All writings fit existing portals.'}

Decide what actions to take this cycle. Return a JSON object with this structure:
{
  "reasoning": "one sentence explaining your overall judgment",
  "actions": [
    {
      "action": "enhance_scene",
      "target": "<existing-portal-id>",
      "reason": "why"
    },
    {
      "action": "add_scene",
      "target": "<existing-portal-id>",
      "variant_name": "<short-variant-name>",
      "reason": "why"
    },
    {
      "action": "birth_portal",
      "portal": {
        "id": "kebab-case-slug-max-30-chars",
        "name_es": "...", "name_en": "...", "name_fr": "...",
        "description_es": "...", "description_en": "...", "description_fr": "...",
        "icon": "single emoji",
        "color_primary": "#hex",
        "color_bg": "rgba(r,g,b,0.9)",
        "color_text": "#hex",
        "environment_type": "forest|ocean|celebration|space|city|dream|theater|memory",
        "triggers": ["word1","word2",...10-15 keywords...],
        "themes": ["theme1","theme2",...],
        "narrator_tone": "...", "narrator_greeting": "...",
        "narrator_vocabulary": ["word1",...8 words...],
        "narrator_proclamation_style": "..."
      },
      "reason": "why a new portal is warranted"
    },
    {
      "action": "enhance_metadata",
      "target": "<existing-portal-id>",
      "addTriggers": ["new","keyword","variations"],
      "reason": "why"
    }
  ]
}

RULES:
- Pick the MOST impactful actions. Usually 2-5 total. Don't pad with busywork.
- birth_portal ONLY when ≥${MIN_WRITINGS_TO_BIRTH} writings share a theme that genuinely fits no existing portal. If unmatched writings are sparse or could enrich an existing portal, prefer enhance instead.
- environment_type must be ONE of: ${VALID_ENV_TYPES.join(', ')}.
- Choose at most ONE birth_portal action per cycle.
- enhance_scene: pick portals whose writings have evolved and would benefit from a fresh scene.
- add_scene: when a portal has strong secondary themes that deserve a distinct variant.
- enhance_metadata: when you noticed new keyword variations an existing portal should match.
- Respond with ONLY the JSON, no markdown fences.`;

	const aiResponse = await ai.run(MISTRAL_MODEL, {
		messages: [{ role: 'user', content: prompt }],
		max_tokens: 1500,
		temperature: 0.6,
	});

	let text = aiResponse.response || aiResponse.result?.response || '';
	text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

	try {
		return JSON.parse(text);
	} catch {
		const m = text.match(/\{[\s\S]*\}/);
		if (m) {
			try { return JSON.parse(m[0]); } catch {}
		}
		return { actions: [], reasoning: 'plan parse failed' };
	}
}

// ── Action executors ───────────────────────────────────────

async function executeAction(action, ctx) {
	switch (action.action) {
		case 'enhance_scene':   return enhanceScene(action, ctx);
		case 'add_scene':       return addSceneVariant(action, ctx);
		case 'birth_portal':    return birthPortal(action, ctx);
		case 'enhance_metadata': return enhanceMetadata(action, ctx);
		default:
			return { action, skipped: true, reason: `unknown action: ${action.action}` };
	}
}

/** #1 — regenerate an existing portal's default scene config */
async function enhanceScene(action, { db, ai, writings }) {
	const portal = await fetchPortal(db, action.target);
	if (!portal) throw new Error(`enhance_scene: portal ${action.target} not found`);
	const matched = matchWritingsByTriggers(writings, portal.triggers || [], 8);
	if (matched.length < 1) throw new Error(`enhance_scene: no writings match ${action.target}`);
	const { sceneConfig, sourceIds } = await generateSceneForPortal(ai, portal, matched);
	await storeScene(db, portal.id, 'default', sceneConfig, sourceIds);
	return { action: 'enhance_scene', portal: portal.id, writings_analyzed: sourceIds.length };
}

/** #2 — add a named variant scene to an existing portal */
async function addSceneVariant(action, { db, ai, writings }) {
	const portal = await fetchPortal(db, action.target);
	if (!portal) throw new Error(`add_scene: portal ${action.target} not found`);
	const matched = matchWritingsByTriggers(writings, portal.triggers || [], 8);
	if (matched.length < 1) throw new Error(`add_scene: no writings match ${action.target}`);
	const { sceneConfig, sourceIds } = await generateSceneForPortal(ai, portal, matched);
	const variant = sanitizeVariant(action.variant_name || `variant-${Date.now()}`);
	await storeScene(db, portal.id, variant, sceneConfig, sourceIds);
	return { action: 'add_scene', portal: portal.id, variant, writings_analyzed: sourceIds.length };
}

/** #3 — birth a brand-new portal, end-to-end */
async function birthPortal(action, { db, ai, cfToken, landscape, unmatched }) {
	const p = action.portal;
	if (!p || !p.id || !p.name_es) throw new Error('birth_portal: missing required portal fields');

	const slug = sanitizeSlug(p.id);
	const existingIds = new Set(landscape.map((x) => x.id));
	if (existingIds.has(slug)) throw new Error(`birth_portal: slug "${slug}" already exists`);

	// Validate environment type
	const envType = VALID_ENV_TYPES.includes(p.environment_type) ? p.environment_type : 'memory';

	// Ensure the 'emergent' galaxy exists
	await db.prepare(
		`INSERT OR IGNORE INTO galaxies (id, name_es, name_en, name_fr, icon, sort_order)
		 VALUES ('emergent', 'Emergent', 'Emergent', 'Émergent', '✦', 99)`
	).run();

	// Insert the portal row
	await db.prepare(
		`INSERT OR IGNORE INTO portals
		 (id, galaxy_id, name_es, name_en, name_fr, description_es, description_en, description_fr,
		  icon, color_primary, color_bg, color_text, environment_type, narrator_tone, narrator_vocabulary,
		  narrator_proclamation_style, narrator_greeting, placement_mode, triggers, status, active_writings_count, discovered_at)
		 VALUES (?, 'emergent', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'floating', ?, 'active', ?, datetime('now'))`
	).bind(
		slug,
		p.name_es, p.name_en || p.name_es, p.name_fr || p.name_es,
		p.description_es || '', p.description_en || '', p.description_fr || '',
		p.icon || '✦',
		p.color_primary || '#895aff',
		p.color_bg || 'rgba(20,10,40,0.9)',
		p.color_text || '#c9a87c',
		envType,
		p.narrator_tone || 'neutral',
		JSON.stringify(p.narrator_vocabulary || []),
		p.narrator_proclamation_style || '',
		p.narrator_greeting || '',
		JSON.stringify(p.triggers || []),
		unmatched.length,
	).run();

	// Generate art (failure-isolated — portal still births without it)
	let artId = null;
	if (cfToken) {
		try {
			artId = await generatePortalArt(ai, cfToken, {
				portalId: slug,
				name: p.name_es,
				envType,
				primaryColor: p.color_primary || '#895aff',
				themes: p.themes || [],
			});
			if (artId) {
				await db.prepare(`UPDATE portals SET scene_image = ? WHERE id = ?`).bind(artId, slug).run();
			}
		} catch (err) {
			console.warn(`[architect] art generation failed for ${slug}:`, err.message);
		}
	}

	// Generate the scene config (failure-isolated)
	let sceneGenerated = false;
	try {
		const portalRow = await fetchPortal(db, slug);
		const { sceneConfig, sourceIds } = await generateSceneForPortal(ai, portalRow, unmatched.slice(0, 8));
		await storeScene(db, slug, 'default', sceneConfig, sourceIds);
		sceneGenerated = true;
	} catch (err) {
		console.warn(`[architect] scene generation failed for ${slug}:`, err.message);
	}

	// Auto-link to the 3-5 nearest existing portals by trigger overlap
	const links = computeLinks(p.triggers || [], landscape, 5);
	if (links.length) {
		// Store links as a scene-config overlay so the renderer picks them up
		const existing = await db.prepare(
			`SELECT scene_config FROM portal_scenes WHERE portal_id = ? AND variant = 'default'`
		).bind(slug).first();
		if (existing?.scene_config) {
			try {
				const cfg = JSON.parse(existing.scene_config);
				cfg.portal_links = links;
				await storeScene(db, slug, 'default', cfg, JSON.parse(existing.source_writings || '[]'));
			} catch {}
		}
	}

	return {
		action: 'birth_portal',
		portal: slug,
		name: p.name_es,
		envType,
		art: artId ? 'generated' : 'skipped',
		scene: sceneGenerated ? 'generated' : 'skipped',
		links: links.length,
	};
}

/** #4 — enhance an existing portal's metadata (triggers) */
async function enhanceMetadata(action, { db }) {
	const portal = await fetchPortal(db, action.target);
	if (!portal) throw new Error(`enhance_metadata: portal ${action.target} not found`);
	const add = (action.addTriggers || []).map((t) => String(t).toLowerCase().trim()).filter(Boolean);
	let triggers = [];
	try { triggers = JSON.parse(portal.triggers || '[]'); } catch {}
	const set = new Set([...triggers, ...add]);
	const merged = [...set].slice(0, 25); // cap at 25 triggers
	await db.prepare(`UPDATE portals SET triggers = ? WHERE id = ?`)
		.bind(JSON.stringify(merged), portal.id).run();
	const added = merged.length - triggers.length;
	return { action: 'enhance_metadata', portal: portal.id, triggers_added: Math.max(0, added) };
}

// ── Helpers ────────────────────────────────────────────────

async function fetchPortal(db, id) {
	const row = await db.prepare(
		`SELECT id, galaxy_id, icon, color_primary, color_bg, color_text, triggers,
		        name_es, name_en, name_fr, environment_type, scene_image
		 FROM portals WHERE id = ?`
	).bind(id).first();
	if (row) {
		try { row.triggers = JSON.parse(row.triggers || '[]'); } catch { row.triggers = []; }
	}
	return row;
}

async function storeScene(db, portalId, variant, sceneConfig, sourceIds) {
	await db.prepare(
		`INSERT INTO portal_scenes (portal_id, variant, scene_config, source_writings, generated_at)
		 VALUES (?, ?, ?, ?, datetime('now'))
		 ON CONFLICT(portal_id, variant) DO UPDATE SET
		   scene_config = excluded.scene_config,
		   source_writings = excluded.source_writings,
		   generated_at = excluded.generated_at`
	).bind(portalId, variant, JSON.stringify(sceneConfig), JSON.stringify(sourceIds || [])).run();
}

function sanitizeSlug(s) {
	return String(s).toLowerCase().trim()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 30);
}

function sanitizeVariant(s) {
	return sanitizeSlug(s).slice(0, 20) || 'variant';
}

/**
 * Jaccard similarity between a proposed trigger set and each existing portal.
 * Returns the existing portal if similarity > threshold, else null.
 */
function findDuplicate(proposedTriggers, landscape) {
	const proposed = new Set(proposedTriggers.map((t) => String(t).toLowerCase()));
	for (const portal of landscape) {
		const existing = new Set(portal.triggers.map((t) => String(t).toLowerCase()));
		const intersection = [...proposed].filter((t) => existing.has(t)).length;
		const union = new Set([...proposed, ...existing]).size;
		const sim = union > 0 ? intersection / union : 0;
		if (sim > DUPLICATE_THRESHOLD) return portal;
	}
	return null;
}

/**
 * Compute portal_links to the nearest existing portals by trigger overlap.
 * Returns [{ target, affinity, reason }] for the top N.
 */
function computeLinks(triggers, landscape, maxN) {
	const proposed = new Set(triggers.map((t) => String(t).toLowerCase()));
	const scored = landscape.map((portal) => {
		const existing = new Set(portal.triggers.map((t) => String(t).toLowerCase()));
		const overlap = [...proposed].filter((t) => existing.has(t)).length;
		const union = new Set([...proposed, ...existing]).size;
		const affinity = union > 0 ? overlap / union : 0;
		return { target: portal.id, affinity, reason: `${overlap} shared themes` };
	}).filter((l) => l.affinity > 0).sort((a, b) => b.affinity - a.affinity).slice(0, maxN);
	return scored;
}

/**
 * Infer an environment type from a portal's row + triggers (fallback when
 * environment_type column is null, which it is for pre-Tier-2 portals).
 */
function inferEnvType(portal, triggers) {
	// Check static scene configs if we can — but here we just use heuristics
	// from the portal id/triggers. The real env type comes from the static
	// scene JSON loaded client-side; this is a best-effort server-side guess.
	const text = (portal.id + ' ' + (triggers || []).join(' ')).toLowerCase();
	if (/tree|forest|arbol|natur|leaf|root|wood|grove/.test(text)) return 'forest';
	if (/ocean|sea|water|wave|mar|agua|fish/.test(text)) return 'ocean';
	if (/star|cosmos|space|galaxy|infinit|void|estrella/.test(text)) return 'space';
	if (/celebr|fiest|party|dance|music|festival|carnival/.test(text)) return 'celebration';
	if (/city|urban|street|building|neon|concrete/.test(text)) return 'city';
	if (/dream|sueñ|sueno|surreal|subconscious|float/.test(text)) return 'dream';
	if (/theater|stage|spotlight|performance|narrat|mic/.test(text)) return 'theater';
	if (/memory|nostalg|sepia|photo|past|recuerd/.test(text)) return 'memory';
	return 'memory';
}
