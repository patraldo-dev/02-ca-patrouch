<!--
	PortalScene.svelte — the fullscreen ECS portal engine.
	Shared by /portals (index) and /portals/[id] (direct link). The only
	difference between the two routes is which portal the engine starts in,
	passed here as `initialPortalId`.

	Boots the IWSDK world, merges Mistral-generated scene configs (SSR) over
	static fallbacks, registers per-portal custom scene renderers, and keeps
	the world alive across in-world navigation (URL sync via history API).
-->
<script>
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';

	let { data, initialPortalId = null } = $props();

	let containerEl = $state(null);
	let booted = $state(false);
	let bootError = $state(null);
	let selectedPortal = $state(null);
	let xrSupport = $state({ ar: false, vr: false });

	onMount(() => {
		let cancelled = false;

		async function boot() {
			try {
				// Merge SSR configs (from D1/Mistral) with static fallbacks
				const SSR_CONFIGS = data?.sceneConfigs || {};
				const PORTAL_IDS = ['arboleda','fiesta','oceano','narrador','cosmos','urbano','suenos','nostalgias','passage-to-the-past','spectral-dreams','mysterious-market'];
				const configs = {};

				// First load static fallbacks (ensures environment.type, camera, etc.)
				for (const id of PORTAL_IDS) {
					try {
						const resp = await fetch(`/scenes/${id}.json`);
						if (resp.ok) configs[id] = await resp.json();
					} catch {}
				}

				// Overlay SSR configs from Mistral — these win when present
				for (const id of PORTAL_IDS) {
					if (SSR_CONFIGS[id]) {
						configs[id] = deepMerge(configs[id] || {}, SSR_CONFIGS[id]);
					}
				}

				if (!configs.arboleda) {
					throw new Error('No scene config found for arboleda (neither D1 nor static)');
				}

				const { bootPortalEngine, registerSceneRenderer } = await import('$lib/portals-ecs/world-builder.js');

				// Register custom scene renderers — keyed by environment.type.
				// Each builder is self-contained (own geometry/lighting/audio) and
				// reads only the destination portals' palette/names for gateways.
				const { buildDesertScene } = await import('$lib/portals-ecs/desert-scene.js');
				const { buildOceanScene } = await import('$lib/portals-ecs/ocean-scene.js');
				const { buildForestScene } = await import('$lib/portals-ecs/forest-scene.js');
				const { buildCosmosScene } = await import('$lib/portals-ecs/cosmos-scene.js');
				const { buildCelebrationScene } = await import('$lib/portals-ecs/celebration-scene.js');
				const { buildCityScene } = await import('$lib/portals-ecs/city-scene.js');
				const { buildDreamScene } = await import('$lib/portals-ecs/dream-scene.js');
				const { buildTheaterScene } = await import('$lib/portals-ecs/theater-scene.js');
				const ENV_TO_SCENE = {
					ocean: buildOceanScene,
					forest: buildForestScene,
					space: buildCosmosScene,
					celebration: buildCelebrationScene,
					city: buildCityScene,
					dream: buildDreamScene,
					theater: buildTheaterScene,
				};
				for (const pid of Object.keys(configs)) {
					if (pid === 'arboleda') continue;
					const envType = configs[pid]?.environment?.type;
					registerSceneRenderer(pid, ENV_TO_SCENE[envType] || buildDesertScene);
				}

				// Direct link: /portals/[id] or /portals?portal=<id>
				const startPortal = initialPortalId || new URLSearchParams(window.location.search).get('portal');
				if (startPortal && configs[startPortal]) {
					configs.arboleda._initialPortal = startPortal;
				}

				await bootPortalEngine(containerEl, configs);
				if (cancelled) return;
				booted = true;

				window.addEventListener('portal-tapped', (e) => {
					selectedPortal = e.detail.portalId;
				});

				window.addEventListener('xr-support', (e) => {
					xrSupport = e.detail;
				});

			} catch (err) {
				console.error('[portals] boot failed:', err);
				bootError = err.message || String(err);
			}
		}

		boot();

		return () => {
			cancelled = true;
		};
	});

	function deepMerge(base, overlay) {
		const result = { ...base };
		for (const key of Object.keys(overlay)) {
			if (overlay[key] && typeof overlay[key] === 'object' && !Array.isArray(overlay[key])) {
				result[key] = { ...(base[key] || {}), ...overlay[key] };
			} else if (overlay[key] != null) {
				result[key] = overlay[key];
			}
		}
		return result;
	}

	function nameOf(portalId) {
		if (!portalId) return '';
		const portal = (data?.portals || []).find(p => p.id === portalId);
		if (!portal) return portalId;
		const lang = document?.documentElement?.lang || 'es';
		if (lang === 'en') return portal.name_en || portal.name_es;
		if (lang === 'fr') return portal.name_fr || portal.name_es;
		return portal.name_es;
	}
</script>

<svelte:head>
	<title>{$t('games.title')}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
	<style>
		html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #050508 !important; }
		:global(nav:not(.sr)), :global(header), :global(.navbar), :global(.footer) { display: none !important; }
	</style>
</svelte:head>

<!-- Scene container — fullscreen -->
<div
	id="portal-scene-container"
	style="position:fixed !important;top:0 !important;left:0 !important;width:100vw !important;height:100vh !important;z-index:99999 !important;background:#05030a !important;"
	bind:this={containerEl}
></div>

<!-- Boot error -->
{#if bootError}
	<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#050508;color:#ef4444;font-family:monospace;font-size:14px;z-index:100000;padding:2rem;text-align:center;">
		⚠ {bootError}
	</div>
{/if}

<!-- Screen reader nav -->
<nav class="sr" aria-label="Portals">
	<h1>{$t('games.title')}</h1>
	{#each data?.portals || [] as portal}
		<a href="/agora?portal={portal.id}">{portal.name_es || portal.name_en}</a>
	{/each}
</nav>

<style>
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
</style>
