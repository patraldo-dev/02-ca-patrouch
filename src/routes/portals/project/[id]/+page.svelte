<!--
	/portals/project/[id] — Projection Mode
	
	Fullscreen portal interior for projection mapping.
	No UI chrome. No bumper. Auto-advancing narrative.
	Wide aspect. High particle density.
	
	?loop=true  → cycles through all portals every 5 minutes
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';

	let { data } = $props();

	let containerEl = $state(null);
	let api = null;
	let currentPortalId = $state(data.portal?.id);
	let narrativeIndex = $state(0);
	let portalIndex = $state(0);

	const NARRATIVE_INTERVAL = 90000;   // 90 seconds
	const LOOP_INTERVAL = 300000;       // 5 minutes
	const loopMode = $derived(page.url.searchParams.get('loop') === 'true');

	let narrativeTimer = null;
	let loopTimer = null;

	onMount(() => {
		if (!data.portal) {
			console.error('[projection] No portal data. Error:', data.error || 'unknown', 'allData keys:', Object.keys(data));
			const errEl = document.createElement('div');
			errEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#ef4444;font-family:monospace;font-size:14px;z-index:99999;background:rgba(0,0,0,0.9);padding:2rem;border-radius:8px;max-width:80vw;';
			errEl.textContent = 'Projection: ' + (data.error || 'No portal data. Keys: ' + Object.keys(data).join(','));
			document.body.appendChild(errEl);
			return;
		}

		let cancelled = false;

		async function boot() {
			try {
				const { initPortalWorld } = await import('$lib/portals-ecs/world.js');

				// Build portals array — just this portal, or all for loop mode
				const portals = loopMode ? data.allPortals : [data.portal];
				const galaxies = [];
				const sceneConfigs = data.sceneConfigs || {};

				api = await initPortalWorld(containerEl, {
					portals,
					galaxies,
					featuredPortalId: data.portal.id,
					sceneConfigs,
				});

				if (cancelled || !api) return;

				// Immediately enter the portal interior — skip index mode
				setTimeout(() => {
					enterPortal(data.portal.id);
				}, 500);

				// Start narrative auto-advance
				startNarrativeTimer();

				// Start loop timer if enabled
				if (loopMode && data.allPortals.length > 1) {
					startLoopTimer();
				}
			} catch (err) {
				console.error('[projection] Boot failed:', err);
			}
		}

		function enterPortal(portalId) {
			if (!api) return;
			api.switchPortal(portalId);
			currentPortalId = portalId;
			narrativeIndex = 0;
		}

		function startNarrativeTimer() {
			if (narrativeTimer) clearInterval(narrativeTimer);
			narrativeTimer = setInterval(() => {
				if (!api) return;
				api.advanceNarrative();
				narrativeIndex++;
			}, NARRATIVE_INTERVAL);
		}

		function startLoopTimer() {
			if (loopTimer) clearInterval(loopTimer);
			loopTimer = setInterval(() => {
				portalIndex = (portalIndex + 1) % data.allPortals.length;
				const next = data.allPortals[portalIndex];
				if (next) {
					enterPortal(next.id);
				}
			}, LOOP_INTERVAL);
		}

		boot();

		return () => {
			cancelled = true;
			if (narrativeTimer) clearInterval(narrativeTimer);
			if (loopTimer) clearInterval(loopTimer);
		};
	});

	onDestroy(() => {
		if (narrativeTimer) clearInterval(narrativeTimer);
		if (loopTimer) clearInterval(loopTimer);
		if (api?.world) {
			import('$lib/portals-ecs/world.js').then(({ destroyPortalWorld }) => {
				destroyPortalWorld(api.world);
			});
		}
	});

	function nameOf(p) {
		if (!p) return '';
		const lang = document?.documentElement?.lang || 'es';
		if (lang === 'en') return p.name_en || p.name_es;
		if (lang === 'fr') return p.name_fr || p.name_es;
		return p.name_es;
	}
</script>

<svelte:head>
	<title>{nameOf(data.portal)} — Projection</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
	<style>
		/* Kill all default margins and scroll */
		html, body {
			margin: 0 !important;
			padding: 0 !important;
			overflow: hidden !important;
			background: #050508 !important;
			width: 100vw;
			height: 100vh;
		}
		/* Hide any layout chrome that might bleed through */
		nav, header, footer, .navbar, .footer {
			display: none !important;
		}
	</style>
</svelte:head>

<!-- Pure scene container — nothing else on screen -->
<div
	style="position:fixed !important;top:0 !important;left:0 !important;width:100vw !important;height:100vh !important;z-index:99999 !important;background:#050508 !important;"
	bind:this={containerEl}
></div>

<!-- Screen reader only -->
<nav class="sr" aria-label="Projection">
	<h1>{nameOf(data.portal)}</h1>
</nav>

<style>
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0,0,0,0);
	}
</style>
