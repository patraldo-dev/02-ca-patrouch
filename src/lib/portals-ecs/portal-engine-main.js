// ═══════════════════════════════════════════════════════════
//  main.js — Entry point for config-driven portal engine
//  Loads scene configs, boots the ECS world builder
// ═══════════════════════════════════════════════════════════
import { boot } from './world-builder.js';

async function loadAllConfigs() {
	const portalIds = ['arboleda', 'fiesta', 'narrador', 'oceano', 'cosmos', 'urbano', 'suenos', 'nostalgias'];
	const configs = {};
	for (const id of portalIds) {
		try {
			const resp = await fetch(`/scenes/${id}.json`);
			if (resp.ok) {
				configs[id] = await resp.json();
				console.log(`[portals] Loaded config: ${id}`);
			}
		} catch (err) {
			console.warn(`[portals] Failed to load ${id}:`, err.message);
		}
	}
	return configs;
}

async function start() {
	const container = document.getElementById('scene-container');
	if (!container) {
		console.error('[portals] No #scene-container found');
		return;
	}

	const allConfigs = await loadAllConfigs();
	if (!allConfigs.arboleda) {
		console.error('[portals] No index config (arboleda.json) found');
		return;
	}

	// Boot with arboleda as the index/entry scene
	await boot(container, allConfigs.arboleda, allConfigs);
	console.log('[portals] Engine booted — tap cubes to navigate');
}

start().catch(err => console.error('[portals] Boot failed:', err));
