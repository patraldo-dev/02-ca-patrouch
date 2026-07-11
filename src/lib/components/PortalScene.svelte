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
	let worldHandle = $state(null);
	let inXR = $state(false);

	function enterXR() {
		if (!worldHandle?.launchXR) return;
		try {
			// Minimal VR session: explicit sessionMode + no optional features,
			// so the IWER emulated session doesn't reject on 'layers' etc.
			worldHandle.launchXR({
				sessionMode: 'immersive-vr',
				features: {
					anchors: false,
					hitTest: false,
					planeDetection: false,
					meshDetection: false,
					lightEstimation: false,
					depthSensing: false,
					layers: false,
					unbounded: false,
				},
			});
			inXR = true;
		} catch (err) {
			console.error('[portals] launchXR failed:', err);
		}
	}
	function exitXR() {
		if (!worldHandle?.exitXR) return;
		try {
			worldHandle.exitXR();
		} catch (err) {
			console.error('[portals] exitXR failed:', err);
		}
		inXR = false;
	}

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

				if (Object.keys(configs).length === 0) {
					throw new Error('No scene configs found (neither D1/Mistral nor static fallbacks)');
				}

				const { bootPortalEngine, registerSceneRenderer } = await import('$lib/portals-ecs/world-builder.js');

				// Register custom scene renderers — keyed by environment.type.
				// Each builder is self-contained (own geometry/lighting/audio) and
				// reads only the destination portals' palette/names for gateways.
				const { buildOceanScene } = await import('$lib/portals-ecs/ocean-scene.js');
				const { buildForestScene } = await import('$lib/portals-ecs/forest-scene.js');
				const { buildCelebrationScene } = await import('$lib/portals-ecs/celebration-scene.js');
				const { buildCityScene } = await import('$lib/portals-ecs/city-scene.js');
				const { buildDreamScene } = await import('$lib/portals-ecs/dream-scene.js');
				const { buildTheaterScene } = await import('$lib/portals-ecs/theater-scene.js');
				const { buildMemoryScene } = await import('$lib/portals-ecs/memory-scene.js');
				// NOTE: buildCosmosScene is intentionally NOT registered. space-type
				// portals fall through to world-builder.js's default path, which
				// renders the dynamic starfield + spinning art-cube carousel (the
				// "Fantasia" landing look). Registering cosmos-scene would preempt
				// that with static planets and hide the cubes.
				// parallax + lithograph scenes were jettisoned (failed 2.5D experiments);
				// any config still using those types falls through to the default path.
				const ENV_TO_SCENE = {
					ocean: buildOceanScene,
					forest: buildForestScene,
					celebration: buildCelebrationScene,
					city: buildCityScene,
					dream: buildDreamScene,
					theater: buildTheaterScene,
					memory: buildMemoryScene,
				};
				for (const pid of Object.keys(configs)) {
					const envType = configs[pid]?.environment?.type;
					const builder = ENV_TO_SCENE[envType];
					// Only register when we have a real custom renderer for this
					// env type. Portals without one (e.g. space → no entry, so the
					// art-cube carousel default path runs) must NOT be registered —
					// otherwise hasSceneRenderer() returns true and the default
					// path in world-builder.js never executes.
					if (builder) registerSceneRenderer(pid, builder);
				}

				// Resolve start portal. Prefer, in order: SSR random pick (from
				// /portals) or explicit id (from /portals/[id]), then ?portal= query.
				// Each must actually have a loaded config (the source of truth for
				// what can boot). If none of those resolve, pick randomly from the
				// loaded configs — never hardcode a single portal, so /portals is a
				// genuine surprise every visit.
				const configIds = Object.keys(configs);
				const queryPortal = new URLSearchParams(window.location.search).get('portal');
				let startPortal = null;
				for (const candidate of [initialPortalId, queryPortal]) {
					if (candidate && configs[candidate]) { startPortal = candidate; break; }
				}
				if (!startPortal && configIds.length) {
					startPortal = configIds[Math.floor(Math.random() * configIds.length)];
				}
				if (!startPortal) {
					throw new Error('No renderable portal config could be resolved');
				}

				worldHandle = await bootPortalEngine(containerEl, configs, startPortal);
				if (cancelled) return;
				booted = true;

				// Track XR session lifecycle so the button can toggle Enter/Exit.
				if (worldHandle?.visibilityState?.subscribe) {
					worldHandle.visibilityState.subscribe((state) => {
						inXR = state === 'visible' || state === 'visible-blurred';
					});
				}

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

<!-- Scene container — fullscreen. z-index kept below the IWER DevUI's
     overlay (which maxes at z-index 999) so the Play Mode button stays visible. -->
<div
	id="portal-scene-container"
	style="position:fixed !important;top:0 !important;left:0 !important;width:100vw !important;height:100vh !important;z-index:1 !important;background:#05030a !important;"
	bind:this={containerEl}
></div>

<!-- Enter / Exit XR button (inline-first: render 2D, enter XR on opt-in).
     On desktop (IWER) this enters the emulated session that Play Mode + WASD
     drive; on a headset it enters true VR. -->
{#if booted && !bootError}
	<button
		class="xr-toggle"
		onclick={inXR ? exitXR : enterXR}
		aria-label={inXR ? 'Exit immersive' : 'Enter to explore'}
	>
		{inXR ? '✕ Exit' : 'Enter to explore'}
	</button>
{/if}

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

	.xr-toggle {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 2;
		padding: 12px 28px;
		font-family: Georgia, serif;
		font-size: 16px;
		font-weight: 400;
		letter-spacing: 0.5px;
		color: #fff;
		background: rgba(0, 0, 0, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 999px;
		cursor: pointer;
		backdrop-filter: blur(6px);
		transition: background 0.2s ease, border-color 0.2s ease;
	}
	.xr-toggle:hover {
		background: rgba(0, 0, 0, 0.85);
		border-color: rgba(255, 255, 255, 0.5);
	}
</style>
