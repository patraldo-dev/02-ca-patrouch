import { error } from '@sveltejs/kit';
import { loadPortalsData } from '$lib/server/portals-data.js';

// Canonical portal ids that have a static/scenes/<id>.json fallback config.
// These are the renderable worlds independent of D1/Mistral state. Kept in sync
// with the static scenes directory (see MIGRATION.md). The [id] loader accepts
// any of these so direct links like /portals/cosmos resolve even if the portal
// is mid-rename in D1 or has no Mistral-generated scene yet.
const STATIC_SCENE_IDS = new Set([
	'arboleda', 'cosmos', 'fiesta', 'mysterious-market', 'narrador',
	'nostalgias', 'oceano', 'passage-to-the-past', 'spectral-dreams',
	'suenos', 'urbano',
]);

export async function load({ params, platform }) {
	const data = await loadPortalsData(platform?.env?.DB_book);
	const { id } = params;

	// Resolve if the id is a known active portal (D1), has a stored Mistral
	// scene config, OR has a static fallback config. The static configs are the
	// source of truth for rendering, so this guarantees every renderable world
	// is reachable via direct URL.
	const isKnownPortal = (data.portals || []).some((p) => p.id === id);
	const hasSceneConfig = !!data.sceneConfigs?.[id];
	const hasStaticConfig = STATIC_SCENE_IDS.has(id);

	if (!isKnownPortal && !hasSceneConfig && !hasStaticConfig) {
		throw error(404, `Unknown portal: ${id}`);
	}

	return { ...data, initialPortalId: id };
}
