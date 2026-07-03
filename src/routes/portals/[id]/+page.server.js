import { error } from '@sveltejs/kit';
import { loadPortalsData } from '$lib/server/portals-data.js';

export async function load({ params, platform }) {
	const data = await loadPortalsData(platform?.env?.DB_book);
	const { id } = params;

	// Resolve only if this id is a known active portal OR has a stored scene
	// config. Static fallback configs (static/scenes/<id>.json) are loaded
	// client-side, so we accept either signal here — the renderer merges them.
	const isKnownPortal = (data.portals || []).some((p) => p.id === id);
	const hasSceneConfig = !!data.sceneConfigs?.[id];

	if (!isKnownPortal && !hasSceneConfig) {
		throw error(404, `Unknown portal: ${id}`);
	}

	return { ...data, initialPortalId: id };
}
