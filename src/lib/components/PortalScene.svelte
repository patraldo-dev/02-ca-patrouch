<!--
	PortalScene.svelte — the fullscreen ECS portal engine.
	Shared by /portals (index) and /portals/[id] (direct link). The only
	difference between the two routes is which portal the engine starts in,
	passed here as `initialPortalId`.

	Boots the IWSDK world, merges Mistral-generated scene configs (SSR) over
	static fallbacks, registers per-portal custom scene renderers, and keeps
	the world alive across in-world navigation (URL sync via history API).

	Input: inline keyboard WASD + mouse-look (desktop), virtual thumbstick +
	drag-look (touch). Optional "Enter VR" for real headsets.
-->
<script>
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';
	import { inlineInput, initInlineInput, disposeInlineInput } from '$lib/portals-ecs/locomotion-system.js';

	let { data, initialPortalId = null } = $props();

	let containerEl = $state(null);
	let booted = $state(false);
	let bootError = $state(null);
	let selectedPortal = $state(null);
	let worldHandle = $state(null);
	let inXR = $state(false);
	let isTouch = $state(false);
	let canVR = $state(false);

	// Virtual thumbstick state (touch devices)
	let stickActive = $state(false);
	let stickOrigin = { x: 0, y: 0 };
	let stickPos = { x: 0, y: 0 };

	function isTouchDevice() {
		// Distinguish real mobile devices from touch-capable desktops.
		// maxTouchPoints > 0 is true on many laptops/Chromebooks with touchscreens.
		// Use a combination: touch input AND a coarse pointer (no fine mouse).
		const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
		return hasTouch && coarsePointer;
	}

	function enterXR() {
		if (!worldHandle?.launchXR) return;
		try {
			worldHandle.launchXR({
				sessionMode: 'immersive-vr',
				features: {
					anchors: false, hitTest: false, planeDetection: false,
					meshDetection: false, lightEstimation: false,
					depthSensing: false, layers: false, unbounded: false,
				},
			});
			inXR = true;
		} catch (err) {
			console.error('[portals] launchXR failed:', err);
		}
	}
	function exitXR() {
		if (!worldHandle?.exitXR) return;
		try { worldHandle.exitXR(); } catch (err) { console.error('[portals] exitXR failed:', err); }
		inXR = false;
	}

	// ── Virtual thumbstick handlers (touch) ──
	function onStickStart(e) {
		e.preventDefault();
		const t = e.touches[0];
		stickActive = true;
		stickOrigin = { x: t.clientX, y: t.clientY };
		stickPos = { x: 0, y: 0 };
	}
	function onStickMove(e) {
		if (!stickActive) return;
		e.preventDefault();
		const t = e.touches[0];
		const dx = t.clientX - stickOrigin.x;
		const dy = t.clientY - stickOrigin.y;
		const maxR = 60;
		const len = Math.sqrt(dx * dx + dy * dy);
		const clampedLen = Math.min(len, maxR);
		const angle = Math.atan2(dy, dx);
		stickPos = { x: Math.cos(angle) * clampedLen, y: Math.sin(angle) * clampedLen };
		// Write to inlineInput (normalized -1..1)
		inlineInput.x = stickPos.x / maxR;
		inlineInput.y = stickPos.y / maxR;
	}
	function onStickEnd(e) {
		e.preventDefault();
		stickActive = false;
		stickPos = { x: 0, y: 0 };
		inlineInput.x = 0;
		inlineInput.y = 0;
	}

	// ── Drag-look handlers (touch, on the canvas area) ──
	let _lookLast = null;
	function onLookStart(e) {
		_lookLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
	}
	function onLookMove(e) {
		if (!_lookLast) return;
		const t = e.touches[0];
		inlineInput.lookX = (t.clientX - _lookLast.x) * 0.005;
		inlineInput.lookY = (t.clientY - _lookLast.y) * 0.005;
		_lookLast = { x: t.clientX, y: t.clientY };
	}
	function onLookEnd() { _lookLast = null; }

	onMount(() => {
		let cancelled = false;
		isTouch = isTouchDevice();

		// Check for real WebXR support (for the "Enter VR" button)
		if (navigator.xr?.isSessionSupported) {
			navigator.xr.isSessionSupported('immersive-vr').then(s => { canVR = s; }).catch(() => {});
		}

		async function boot() {
			try {
				const SSR_CONFIGS = data?.sceneConfigs || {};
				const PORTAL_IDS = ['arboleda','fiesta','oceano','narrador','cosmos','urbano','suenos','nostalgias','passage-to-the-past','spectral-dreams','mysterious-market'];
				const configs = {};

				for (const id of PORTAL_IDS) {
					try {
						const resp = await fetch(`/scenes/${id}.json`);
						if (resp.ok) configs[id] = await resp.json();
					} catch {}
				}
				for (const id of PORTAL_IDS) {
					if (SSR_CONFIGS[id]) {
						configs[id] = deepMerge(configs[id] || {}, SSR_CONFIGS[id]);
					}
				}
				if (Object.keys(configs).length === 0) {
					throw new Error('No scene configs found (neither D1/Mistral nor static fallbacks)');
				}

				const { bootPortalEngine, registerSceneRenderer } = await import('$lib/portals-ecs/world-builder.js');
				const { buildOceanScene } = await import('$lib/portals-ecs/ocean-scene.js');
				const { buildForestScene } = await import('$lib/portals-ecs/forest-scene.js');
				const { buildCelebrationScene } = await import('$lib/portals-ecs/celebration-scene.js');
				const { buildCityScene } = await import('$lib/portals-ecs/city-scene.js');
				const { buildDreamScene } = await import('$lib/portals-ecs/dream-scene.js');
				const { buildTheaterScene } = await import('$lib/portals-ecs/theater-scene.js');
				const { buildMemoryScene } = await import('$lib/portals-ecs/memory-scene.js');
				const ENV_TO_SCENE = {
					ocean: buildOceanScene, forest: buildForestScene,
					celebration: buildCelebrationScene, city: buildCityScene,
					dream: buildDreamScene, theater: buildTheaterScene,
					memory: buildMemoryScene,
				};
				for (const pid of Object.keys(configs)) {
					const envType = configs[pid]?.environment?.type;
					const builder = ENV_TO_SCENE[envType];
					if (builder) registerSceneRenderer(pid, builder);
				}

				const configIds = Object.keys(configs);
				const queryPortal = new URLSearchParams(window.location.search).get('portal');
				let startPortal = null;
				for (const candidate of [initialPortalId, queryPortal]) {
					if (candidate && configs[candidate]) { startPortal = candidate; break; }
				}
				if (!startPortal && configIds.length) {
					startPortal = configIds[Math.floor(Math.random() * configIds.length)];
				}
				if (!startPortal) throw new Error('No renderable portal config could be resolved');

				worldHandle = await bootPortalEngine(containerEl, configs, startPortal);
				if (cancelled) return;
				booted = true;

				// Initialize inline input (keyboard on desktop, touch handlers
				// are wired in the Svelte template and use the static import).
				initInlineInput(containerEl);

				if (worldHandle?.visibilityState?.subscribe) {
					worldHandle.visibilityState.subscribe((state) => {
						inXR = state === 'visible' || state === 'visible-blurred';
					});
				}

				window.addEventListener('portal-tapped', (e) => { selectedPortal = e.detail.portalId; });
			} catch (err) {
				console.error('[portals] boot failed:', err);
				bootError = err.message || String(err);
			}
		}

		boot();

		return () => {
			cancelled = true;
			disposeInlineInput();
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
	style="position:fixed !important;top:0 !important;left:0 !important;width:100vw !important;height:100vh !important;z-index:1 !important;background:#05030a !important;"
	bind:this={containerEl}
></div>

<!-- Drag-look zone: covers the full screen for touch look-around.
     Doesn't interfere with the thumbstick zone (bottom-left). -->
{#if booted && isTouch && !inXR}
	<div
		class="look-zone"
		ontouchstart={onLookStart}
		ontouchmove={onLookMove}
		ontouchend={onLookEnd}
	></div>
{/if}

<!-- Virtual thumbstick (touch devices only) -->
{#if booted && isTouch && !inXR}
	<div
		class="thumbstick-zone"
		ontouchstart={onStickStart}
		ontouchmove={onStickMove}
		ontouchend={onStickEnd}
	>
		<div class="thumbstick-base">
			<div class="thumbstick-knob" style="transform: translate({stickPos.x}px, {stickPos.y}px)"></div>
		</div>
	</div>
{/if}

<!-- Enter VR / Enter to Explore button: show on desktop when WebXR is
     available (real headset OR IWER on localhost). Touch devices use
     inline controls (no split-screen VR). -->
{#if booted && !bootError && !isTouch}
	<button class="xr-toggle" onclick={inXR ? exitXR : enterXR} aria-label={inXR ? $t('portals.exit_explore') : $t('portals.enter_explore')}>
		{inXR ? $t('portals.exit_explore') : $t('portals.enter_explore')}
	</button>
{/if}

<!-- Hint text for desktop (non-touch) visitors -->
{#if booted && !bootError && !isTouch && !inXR}
	<div class="input-hint">{$t('portals.hint_desktop')}</div>
{/if}

<!-- Hint text for touch visitors -->
{#if booted && !bootError && isTouch && !inXR}
	<div class="input-hint">{$t('portals.hint_touch')}</div>
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
		position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
		z-index: 2; padding: 12px 28px;
		font-family: Georgia, serif; font-size: 16px; font-weight: 400; letter-spacing: 0.5px;
		color: #fff; background: rgba(0, 0, 0, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 999px;
		cursor: pointer; backdrop-filter: blur(6px);
		transition: background 0.2s ease, border-color 0.2s ease;
	}
	.xr-toggle:hover { background: rgba(0, 0, 0, 0.85); border-color: rgba(255, 255, 255, 0.5); }

	.input-hint {
		position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
		z-index: 2; color: rgba(255,255,255,0.5);
		font-family: Georgia, serif; font-size: 13px; letter-spacing: 0.04em;
		pointer-events: none; white-space: nowrap;
	}

	/* Touch look-zone: full screen, transparent, behind the thumbstick */
	.look-zone {
		position: fixed; inset: 0; z-index: 1;
		touch-action: none;
	}

	/* Virtual thumbstick: bottom-left quadrant */
	.thumbstick-zone {
		position: fixed; bottom: 0; left: 0;
		width: 40vw; height: 40vh; max-width: 250px; max-height: 250px;
		z-index: 3; touch-action: none;
		display: flex; align-items: flex-end; justify-content: flex-start;
		padding: 30px;
	}
	.thumbstick-base {
		width: 120px; height: 120px; border-radius: 50%;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		position: relative; touch-action: none;
		backdrop-filter: blur(4px);
	}
	.thumbstick-knob {
		width: 50px; height: 50px; border-radius: 50%;
		background: rgba(255,255,255,0.25);
		border: 1px solid rgba(255,255,255,0.3);
		position: absolute; top: 50%; left: 50%;
		margin: -25px 0 0 -25px;
		transition: transform 0.05s ease-out;
	}
</style>
