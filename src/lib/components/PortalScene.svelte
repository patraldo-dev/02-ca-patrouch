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

	let { data, initialPortalId = null } = $props();

	let containerEl = $state(null);
	let booted = $state(false);
	let bootError = $state(null);
	let selectedPortal = $state(null);
	let worldHandle = $state(null);
	let inXR = $state(false);
	let isTouch = $state(false);
	let canVR = $state(false);
	let voiceEnabled = $state(false);
	let voiceMuted = $state(false);
	let drawerOpen = $state(false);

	// Inline input — loaded dynamically (client-side only) to avoid SSR crash
	// (@iwsdk/core references `document` at module-eval time).
	let inlineInput = null;
	let initInlineInput = null;
	let disposeInlineInput = null;

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

	// ── Voice chat ──
	async function enableVoice() {
		const mod = await import('$lib/portals-ecs/network-system.js');
		const stream = await mod.captureMic();
		if (stream) {
			mod.voice.enabled = true;
			voiceEnabled = true;
			// Re-trigger WebRTC calls to existing peers now that voice is on.
			// The NetworkSystem checks voice.enabled on new peers automatically.
		}
	}
	async function toggleMute() {
		const mod = await import('$lib/portals-ecs/network-system.js');
		voiceMuted = mod.toggleMute();
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
		if (!stickActive || !inlineInput) return;
		e.preventDefault();
		const t = e.touches[0];
		const dx = t.clientX - stickOrigin.x;
		const dy = t.clientY - stickOrigin.y;
		const maxR = 60;
		const len = Math.sqrt(dx * dx + dy * dy);
		const clampedLen = Math.min(len, maxR);
		const angle = Math.atan2(dy, dx);
		stickPos = { x: Math.cos(angle) * clampedLen, y: Math.sin(angle) * clampedLen };
		inlineInput.x = stickPos.x / maxR;
		inlineInput.y = stickPos.y / maxR;
	}
	function onStickEnd(e) {
		e.preventDefault();
		stickActive = false;
		stickPos = { x: 0, y: 0 };
		if (inlineInput) { inlineInput.x = 0; inlineInput.y = 0; }
	}

	// ── Drag-look handlers (touch, on the canvas area) ──
	// Distinguishes a TAP (quick touch, no movement → forward to canvas for
	// portal navigation) from a DRAG (movement → look around).
	let _lookLast = null;
	let _lookStart = null;
	let _lookMoved = false;
	const TAP_THRESHOLD = 10; // pixels of movement before it's a drag, not a tap

	function onLookStart(e) {
		const t = e.touches[0];
		_lookStart = { x: t.clientX, y: t.clientY, time: Date.now() };
		_lookLast = { x: t.clientX, y: t.clientY };
		_lookMoved = false;
	}
	function onLookMove(e) {
		if (!_lookLast || !inlineInput) return;
		const t = e.touches[0];
		const dx = t.clientX - _lookLast.x;
		const dy = t.clientY - _lookLast.y;
		// If moved beyond threshold, it's a drag — apply look
		if (Math.abs(t.clientX - _lookStart.x) > TAP_THRESHOLD || Math.abs(t.clientY - _lookStart.y) > TAP_THRESHOLD) {
			_lookMoved = true;
		}
		if (_lookMoved) {
			inlineInput.lookX = dx * 0.005;
			inlineInput.lookY = dy * 0.005;
		}
		_lookLast = { x: t.clientX, y: t.clientY };
	}
	function onLookEnd(e) {
		// If it was a tap (no significant movement), forward as a click on the
		// canvas so the themed scene's pointerdown handler can raycast + navigate.
		if (_lookStart && !_lookMoved && Date.now() - _lookStart.time < 300) {
			const fakeEvent = new PointerEvent('pointerdown', {
				clientX: _lookStart.x,
				clientY: _lookStart.y,
				bubbles: true,
			});
			containerEl?.dispatchEvent(fakeEvent);
		}
		_lookLast = null;
		_lookStart = null;
		_lookMoved = false;
	}

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

				// Load locomotion inline input dynamically (client-side only —
				// @iwsdk/core references `document` at module-eval time, which
				// crashes SSR).
				const locMod = await import('$lib/portals-ecs/locomotion-system.js');
				inlineInput = locMod.inlineInput;
				initInlineInput = locMod.initInlineInput;
				disposeInlineInput = locMod.disposeInlineInput;
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
			if (disposeInlineInput) disposeInlineInput();
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
		/* Hide ALL site chrome when the portal scene is active */
		:global(nav:not(.sr)), :global(header), :global(.navbar), :global(.footer),
		:global(.search-fab), :global(.mobile-nav), :global(.mobile-menu),
		:global(#accessibility-btn), :global(.a11y-fab), :global(.scroll-to-top) { display: none !important; }
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

<!-- Slide-out drawer: tap the tab (top-right) to reveal all controls -->
{#if booted && !bootError}
	<!-- Drawer tab (always visible) -->
	<button class="drawer-tab" onclick={() => drawerOpen = !drawerOpen} aria-label="Menu">
		{drawerOpen ? '✕' : '☰'}
	</button>

	<!-- Drawer panel -->
	<div class="drawer-panel" class:open={drawerOpen}>
		<!-- Enter/Exit XR (desktop only — touch uses inline controls) -->
		{#if !isTouch}
			<button class="drawer-btn" onclick={() => { enterXR(); drawerOpen = false; }}>
				{inXR ? $t('portals.exit_explore') : $t('portals.enter_explore')}
			</button>
		{/if}

		<!-- Voice controls -->
		{#if !voiceEnabled}
			<button class="drawer-btn" onclick={() => { enableVoice(); drawerOpen = false; }}>
				{$t('portals.enable_voice')}
			</button>
		{:else}
			<button class="drawer-btn" onclick={toggleMute}>
				{voiceMuted ? $t('portals.unmute') : $t('portals.mute')}
			</button>
		{/if}
	</div>
{/if}

<!-- Hint text (shown briefly, auto-hides) -->
{#if booted && !bootError && !inXR && !drawerOpen}
	<div class="input-hint">{isTouch ? $t('portals.hint_touch') : $t('portals.hint_desktop')}</div>
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

	/* ── Slide-out drawer ── */
	.drawer-tab {
		position: fixed; top: 16px; right: 16px;
		z-index: 10; width: 44px; height: 44px;
		font-size: 20px; color: #fff;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 50%;
		cursor: pointer; backdrop-filter: blur(6px);
		display: flex; align-items: center; justify-content: center;
		transition: background 0.2s ease;
	}
	.drawer-tab:hover { background: rgba(0, 0, 0, 0.85); }

	.drawer-panel {
		position: fixed; top: 68px; right: 16px;
		z-index: 10; min-width: 180px;
		background: rgba(8, 6, 16, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px;
		backdrop-filter: blur(12px);
		padding: 8px;
		display: flex; flex-direction: column; gap: 4px;
		opacity: 0; transform: translateY(-8px) scale(0.95);
		pointer-events: none;
		transition: opacity 0.2s ease, transform 0.2s ease;
	}
	.drawer-panel.open {
		opacity: 1; transform: translateY(0) scale(1);
		pointer-events: all;
	}

	.drawer-btn {
		padding: 12px 16px;
		font-family: Georgia, serif; font-size: 14px; letter-spacing: 0.04em;
		color: #fff; background: transparent;
		border: none; border-radius: 8px;
		cursor: pointer; text-align: left;
		transition: background 0.15s ease;
	}
	.drawer-btn:hover { background: rgba(255, 255, 255, 0.08); }

	.input-hint {
		position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
		z-index: 2; color: rgba(255,255,255,0.4);
		font-family: Georgia, serif; font-size: 12px; letter-spacing: 0.04em;
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
