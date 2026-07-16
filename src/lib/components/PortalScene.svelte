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
	import { t, locale, setLocale } from '$lib/i18n';
	import { invalidateAll } from '$app/navigation';
	import { avatarVariant } from '$lib/utils.js';

	let { data, initialPortalId = null } = $props();

	// Switch language in-realm (persists to server, no navigation) — mirrors the
	// LanguageSwitcherDesktop flow so narration can re-render in the new locale.
	async function switchLanguage(lang) {
		try {
			await fetch('/api/locale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale: lang }) });
		} catch {}
		setLocale(lang);
		try { await invalidateAll(); } catch {}
	}

	// Realm name in the current locale.
	function realmName(p) {
		const lang = $locale || 'es';
		return p?.name_en && lang === 'en' ? p.name_en
			: p?.name_fr && lang === 'fr' ? p.name_fr
			: p?.name_es || p?.name_en || p?.id;
	}

	// Navigate to another realm in-world. Mirrors world-builder's own navigation:
	// pushState with the portalId, then dispatch popstate so the popstate listener
	// (world-builder.js) calls rebuildScene for the new portal.
	function navigateToRealm(portalId) {
		currentRealm = portalId;
		realmMenuOpen = false;
		try {
			window.history.pushState({ portalId }, '', `/portals/${portalId}`);
			window.dispatchEvent(new PopStateEvent('popstate', { state: { portalId } }));
		} catch {}
	}

	// Fly the camera to a remote peer's position (approach from a few meters back).
	async function flyToPeer(peer) {
		const mod = await import('$lib/portals-ecs/locomotion-system.js');
		// Approach from behind/above so you see them, not inside them.
		const approachDist = 2.5;
		const approachY = 0.5;
		mod.flyTo(peer.x, peer.y + approachY, peer.z + approachDist, { x: peer.x, y: peer.y, z: peer.z });
	}

	// Recenter the scene (same as Esc — works on mobile where there's no Esc key).
	async function recenterScene() {
		const mod = await import('$lib/portals-ecs/locomotion-system.js');
		mod.recenter();
		drawerOpen = false;
	}

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

	// Floating realm menu — list of all realms with colored bullets, click to navigate.
	let realmMenuOpen = $state(false);
	// Track which realm we're currently in (for active highlight in the menu).
	let currentRealm = $state(null);

	// Co-presence — updated reactively from NetworkSystem via the 'portal-presence'
	// window event (the existing ECS→Svelte bridge pattern, like 'portal-tapped').
	let explorerCount = $state(0);
	let roster = $state([]);
	let peers = $state([]);  // [{name, x, y, z}] — for fly-to-peer

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
		// In production (no VR hardware), launchXR throws "No XR hardware found".
		// Only set inXR=true if it actually succeeds (via the visibilityState subscriber).
		try {
			worldHandle.launchXR({
				sessionMode: 'immersive-vr',
				features: {
					anchors: false, hitTest: false, planeDetection: false,
					meshDetection: false, lightEstimation: false,
					depthSensing: false, layers: false, unbounded: false,
				},
			});
			// inXR is set by the visibilityState subscriber (line ~210), not here —
			// so if launchXR fails silently, the button stays "Enter to Explore".
		} catch (err) {
			console.error('[portals] launchXR failed:', err);
		}
	}
	function exitXR() {
		if (!worldHandle?.exitXR) { inXR = false; return; }
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
		import('$lib/portals-ecs/locomotion-system.js').then(({ setThumbstickActive }) => setThumbstickActive(true));
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
		import('$lib/portals-ecs/locomotion-system.js').then(({ setThumbstickActive }) => setThumbstickActive(false));
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
		// If it was a tap (no significant movement, quick), raycast into the scene
		// for navigation. Uses world._tapAt() which works on touch devices where
		// the look-zone overlay intercepts touches before the canvas.
		if (_lookStart && !_lookMoved && Date.now() - _lookStart.time < 300) {
			worldHandle?._tapAt?.(_lookStart.x, _lookStart.y);
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
				// Also load any SSR configs NOT in the static list (e.g. a materialized
				// realm from the write-first intro). These are injected by +page.svelte.
				for (const id of Object.keys(SSR_CONFIGS)) {
					if (!configs[id]) {
						configs[id] = SSR_CONFIGS[id];
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

				worldHandle = await bootPortalEngine(containerEl, configs, startPortal, {
					visitorName: data?.user?.display_name || data?.user?.username || null,
					visitorAvatar: avatarVariant(data?.user?.avatar_url, 'avatar200') || null,
				});
				if (cancelled) return;
				booted = true;
				// Flag <html> so the chrome-hiding :global() CSS rules activate.
				// (Added AFTER boot succeeds so a failed boot never hides the site.)
				document.documentElement.classList.add('portal-active');

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

				window.addEventListener('portal-tapped', (e) => {
					selectedPortal = e.detail.portalId;
					currentRealm = e.detail.portalId;
				});

				// Track in-world navigation (back/forward, realm-menu clicks) so the
				// realm menu's active highlight follows the current realm.
				window.addEventListener('popstate', (e) => {
					const pid = e.state?.portalId;
					if (pid) currentRealm = pid;
				});

				currentRealm = startPortal;

				// Co-presence bridge — NetworkSystem dispatches 'portal-presence'
				// events (roster/join/leave) carrying the live explorer count and
				// names; update the HUD state reactively.
				window.addEventListener('portal-presence', (e) => {
					explorerCount = e.detail.count ?? 0;
					roster = e.detail.roster ?? [];
					peers = e.detail.peers ?? [];
				});
			} catch (err) {
				console.error('[portals] boot failed:', err);
				bootError = err.message || String(err);
			}
		}

		boot();

		return () => {
			cancelled = true;
			if (disposeInlineInput) disposeInlineInput();
			// Remove the portal-active flag so the site-chrome-hiding :global()
			// rules stop applying once we leave the portal scene.
			document.documentElement.classList.remove('portal-active');
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

<!-- In-world menu HUD — the ☰ drawer is visible on ALL platforms (desktop,
     touch, VR) so route/language/profile access isn't lost inside the realm.
     The portal is its own world; the menu lives inside that world, not the
     flat site nav (which is hidden via :global() below). -->
{#if booted && !bootError}
	<button class="drawer-tab" onclick={() => drawerOpen = !drawerOpen} aria-label="Menu">
		{drawerOpen ? '✕' : '☰'}
	</button>
		<div class="drawer-panel" class:open={drawerOpen}>
			{#if data?.user}
				<div class="drawer-user">
					<span class="drawer-avatar">
						{#if avatarVariant(data.user.avatar_url, 'avatar48')}
							<img src={avatarVariant(data.user.avatar_url, 'avatar48')} alt="" />
						{:else}
							{(data.user.display_name || data.user.username || '?')[0].toUpperCase()}
						{/if}
					</span>
					<span class="drawer-user-name">{data.user.display_name || data.user.username}</span>
				</div>
			{:else}
				<div class="drawer-user">
					<span class="drawer-avatar anon">?</span>
					<span class="drawer-user-name">{$t('portals.hud_guest') || 'Anónimo'}</span>
				</div>
			{/if}

			<div class="drawer-section-label">{$t('portals.hud_navigate')}</div>
			<a class="drawer-btn" href="/" onclick={() => drawerOpen = false}>🏠 {$t('common.nav.home')}</a>
			<a class="drawer-btn" href="/agora" onclick={() => drawerOpen = false}>🌳 {$t('common.nav.agora')}</a>
			<a class="drawer-btn" href="/write" onclick={() => drawerOpen = false}>📜 {$t('common.nav.write')}</a>

			<div class="drawer-section-label">{$t('portals.hud_language')}</div>
			<div class="drawer-lang-row">
				<button class="drawer-lang-btn" class:active={$locale === 'es'} onclick={() => switchLanguage('es')}>ES</button>
				<button class="drawer-lang-btn" class:active={$locale === 'en'} onclick={() => switchLanguage('en')}>EN</button>
				<button class="drawer-lang-btn" class:active={$locale === 'fr'} onclick={() => switchLanguage('fr')}>FR</button>
			</div>

			{#if canVR && !isTouch}
				<div class="drawer-section-label">XR</div>
				<button class="drawer-btn" onclick={() => { inXR ? exitXR() : enterXR(); drawerOpen = false; }}>
					{inXR ? $t('portals.exit_explore') : $t('portals.enter_explore')}
				</button>
			{/if}

			<div class="drawer-section-label">{$t('portals.hud_voice')}</div>
			{#if !voiceEnabled}
				<button class="drawer-btn" onclick={() => { enableVoice(); }}>
					{$t('portals.enable_voice')}
				</button>
			{:else}
				<button class="drawer-btn" onclick={toggleMute}>
					{voiceMuted ? $t('portals.unmute') : $t('portals.mute')}
				</button>
			{/if}

			<button class="drawer-btn" onclick={recenterScene}>🎯 {$t('portals.hud_recenter') || 'Recenter'}</button>

			<a class="drawer-btn drawer-exit" href="/" onclick={() => drawerOpen = false}>🚪 {$t('portals.hud_exit')}</a>
		</div>
{/if}

<!-- Co-presence HUD — only shown when OTHER explorers are present (you know
     you're here; no need to say "alone" — just show nothing in that case).
     "1 other explorer is / N other explorers are" with proper agreement. -->
{#if booted && !bootError && explorerCount > 1}
	<div class="presence-pill">
		<span class="presence-dot live"></span>
		{#if explorerCount === 2}
			{$t('portals.presence_other_one_is')}
		{:else}
			{explorerCount - 1} {$t('portals.presence_other_are')}
		{/if}
		<!-- Roster: tap a name to fly to that explorer -->
		<span class="presence-roster">
			{#each peers.slice(0, 5) as peer, i}
				<button class="roster-name" onclick={() => flyToPeer(peer)}>{peer.name}</button>{#if i < Math.min(peers.length, 5) - 1}, {/if}
			{/each}
		</span>
	</div>
{/if}

<!-- Floating realm menu (DOM) — reliable navigation to all realms. Always visible,
     works in every scene type (the 3D compass only appears in themed scenes). -->
{#if booted && !bootError}
	<div class="realm-menu">
		<button class="realm-menu-toggle" onclick={() => realmMenuOpen = !realmMenuOpen} aria-label="Realms">
			{$t('portals.hud_realms')}
			<span class="realm-menu-chevron">{realmMenuOpen ? '▾' : '▸'}</span>
		</button>
		{#if realmMenuOpen}
			<ul class="realm-list">
				{#each data?.portals || [] as portal (portal.id)}
					<li>
						<button class="realm-item" class:active={portal.id === currentRealm} onclick={() => navigateToRealm(portal.id)}>
							<span class="realm-bullet" style="background: {portal.color_primary || '#c9a87c'}"></span>
							<span class="realm-icon">{portal.icon || '🔮'}</span>
							<span class="realm-name">{realmName(portal)}</span>
						</button>
					</li>
				{/each}
			</ul>
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

	/* ── Hide ALL site chrome when portal scene is active ── */
	/* Scoped under html.portal-active so these rules ONLY apply when the portal
	   is actually mounted — NOT when SvelteKit merely prefetches this CSS on
	   hover of the /portals nav link (which would otherwise hide the header and
	   clip the body on the page the user is still on). */
	:global(html.portal-active), :global(html.portal-active body) { margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #050508 !important; }
	:global(html.portal-active) :global(nav:not(.sr)), :global(html.portal-active) :global(header), :global(html.portal-active) :global(.navbar), :global(html.portal-active) :global(.footer),
	:global(html.portal-active) :global(.search-fab), :global(html.portal-active) :global(.search-overlay), :global(html.portal-active) :global(.mobile-nav), :global(html.portal-active) :global(.mobile-menu),
	:global(html.portal-active) :global(.hamburger), :global(html.portal-active) :global(.profile-switcher) { display: none !important; }
	/* portal-audio.js narration controls (appended to body with z-index:99999) */
	:global(html.portal-active) :global(#portal-audio-speaker), :global(html.portal-active) :global(#portal-audio-cc), :global(html.portal-active) :global(#portal-audio-subtitle) { display: none !important; }

	/* ── Slide-out drawer ── z-index above portal-audio (99999) */
	.drawer-tab {
		position: fixed; top: 16px; right: 16px;
		z-index: 100001; width: 44px; height: 44px;
		font-size: 20px; color: #fff;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 50%;
		cursor: pointer; backdrop-filter: blur(6px);
		pointer-events: auto;
		display: flex; align-items: center; justify-content: center;
		transition: background 0.2s ease;
	}
	.drawer-tab:hover { background: rgba(0, 0, 0, 0.85); }

	.drawer-panel {
		position: fixed; top: 68px; right: 16px;
		z-index: 100001; min-width: 220px; max-height: 80vh; overflow-y: auto;
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
	.drawer-btn:active { transform: scale(0.98); }

	/* Drawer section labels (Navigate / Language / Voice) */
	.drawer-section-label {
		padding: 10px 16px 4px;
		font-family: Georgia, serif; font-size: 10px; letter-spacing: 0.12em;
		text-transform: uppercase; color: rgba(255, 255, 255, 0.4);
	}
	.drawer-section-label:first-child { padding-top: 4px; }

	/* Logged-in user header at top of the drawer */
	.drawer-user {
		display: flex; align-items: center; gap: 10px;
		padding: 12px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		margin-bottom: 4px;
	}
	.drawer-avatar {
		width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
		display: flex; align-items: center; justify-content: center;
		overflow: hidden;
		border: 1.5px solid #d4b98f;  /* editorial gold ring */
		font-family: Georgia, serif; font-size: 14px; font-weight: 600;
		color: #d4b98f; background: rgba(212, 185, 143, 0.1);
	}
	.drawer-avatar img { width: 100%; height: 100%; object-fit: cover; }
	.drawer-avatar.anon { opacity: 0.5; }
	.drawer-user-name {
		font-family: Georgia, serif; font-size: 14px;
		color: #fff; font-weight: 600;
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}

	/* Language switcher row inside the drawer */
	.drawer-lang-row { display: flex; gap: 6px; padding: 4px 12px 8px; }
	.drawer-lang-btn {
		flex: 1; padding: 8px;
		font-family: Georgia, serif; font-size: 13px; letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.6); background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px;
		cursor: pointer; transition: all 0.15s ease;
	}
	.drawer-lang-btn:hover { background: rgba(255, 255, 255, 0.06); }
	.drawer-lang-btn.active {
		color: #fff; background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.4);
	}

	/* "Exit the realm" — visually distinct (emphasized exit) */
	.drawer-exit { margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; }

	/* Co-presence pill — top-left (drawer tab is top-right). Shows live explorer
	   count + names fed by NetworkSystem via 'portal-presence' events. */
	.presence-pill {
		position: fixed; top: 16px; left: 16px;
		z-index: 100001; max-width: 70vw;
		display: flex; align-items: center; gap: 8px;
		padding: 8px 14px;
		font-family: Georgia, serif; font-size: 13px; letter-spacing: 0.04em;
		color: rgba(255, 255, 255, 0.8);
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 999px;
		backdrop-filter: blur(6px); pointer-events: none;
	}
	.presence-dot {
		width: 8px; height: 8px; border-radius: 50%;
		background: rgba(255, 255, 255, 0.25); flex-shrink: 0;
	}
	.presence-dot.live {
		background: #4ade80;
		box-shadow: 0 0 8px #4ade80;
		animation: presence-pulse 2s ease-in-out infinite;
	}
	@keyframes presence-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
	.presence-roster {
		font-size: 11px; color: rgba(255, 255, 255, 0.5);
		display: flex; flex-wrap: wrap; gap: 2px; align-items: center;
	}
	.roster-name {
		background: none; border: none; cursor: pointer;
		font-family: Georgia, serif; font-size: 11px;
		color: rgba(212, 185, 143, 0.8);  /* gold */
		padding: 0; text-decoration: underline; text-underline-offset: 2px;
	}
	.roster-name:hover { color: #d4b98f; }

	/* Floating realm menu — bottom-right (bottom-left is the thumbstick on touch).
	   Collapsible so it doesn't clutter the scene. */
	.realm-menu {
		position: fixed; bottom: 16px; right: 16px;
		z-index: 100001; max-width: 70vw; max-height: 60vh;
		display: flex; flex-direction: column; align-items: flex-end;
	}
	.realm-menu-toggle {
		align-self: flex-start;
		padding: 6px 12px;
		font-family: Georgia, serif; font-size: 12px; letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 999px;
		backdrop-filter: blur(6px); cursor: pointer;
		transition: background 0.2s ease;
	}
	.realm-menu-toggle:hover { background: rgba(0, 0, 0, 0.85); }
	.realm-menu-chevron { margin-left: 4px; font-size: 10px; }

	.realm-list {
		list-style: none; margin: 6px 0 0; padding: 6px;
		background: rgba(8, 6, 16, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px;
		backdrop-filter: blur(12px);
		overflow-y: auto;
		display: flex; flex-direction: column; gap: 1px;
	}
	.realm-item {
		display: flex; align-items: center; gap: 8px;
		width: 100%; padding: 7px 10px;
		font-family: Georgia, serif; font-size: 13px; letter-spacing: 0.02em;
		color: rgba(255, 255, 255, 0.75);
		background: transparent; border: none; border-radius: 6px;
		cursor: pointer; text-align: left;
		transition: background 0.15s ease;
	}
	.realm-item:hover { background: rgba(255, 255, 255, 0.08); }
	.realm-item.active {
		color: #fff; background: rgba(255, 255, 255, 0.06);
	}
	.realm-bullet {
		width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
		box-shadow: 0 0 6px currentColor;
	}
	.realm-icon { font-size: 14px; flex-shrink: 0; }
	.realm-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	.input-hint {
		position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
		z-index: 2; color: rgba(255,255,255,0.4);
		font-family: Georgia, serif; font-size: 12px; letter-spacing: 0.04em;
		pointer-events: none; white-space: nowrap;
	}

	/* Touch look-zone: full screen, transparent, behind the thumbstick.
	   The ☰ button (z-index 100001) sits above this (z-index 1) and receives
	   taps directly — no need to cut the look-zone short. */
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
