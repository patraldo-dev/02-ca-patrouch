<!--
	/portals/project/[id] — Projection Mode
	Fullscreen portal interior for projection mapping.
-->
<script>
	import { onMount, onDestroy } from 'svelte';

	let { data } = $props();

	let containerEl = null;
	let errorMsg = data?.errorMsg || (!data?.portal ? 'No portal data' : null);

	onMount(() => {
		if (errorMsg || !data?.portal) {
			console.error('[projection]', errorMsg);
			return;
		}

		let cancelled = false;
		let narrativeTimer = null;
		let loopTimer = null;
		let api = null;
		let portalIdx = 0;

		const loopMode = new URLSearchParams(window.location.search).get('loop') === 'true';

		async function boot() {
			try {
				const { initPortalWorld } = await import('$lib/portals-ecs/world.js');

				const portals = loopMode ? data.allPortals : [data.portal];
				const galaxies = [];

				api = await initPortalWorld(containerEl, {
					portals,
					galaxies,
					featuredPortalId: data.portal.id,
					sceneConfigs: data.sceneConfigs || {},
				});

				if (cancelled || !api) return;

				// Enter portal interior immediately
				setTimeout(() => {
					if (api) api.switchPortal(data.portal.id);
				}, 800);

				// Auto-advance narrative every 90s
				narrativeTimer = setInterval(() => {
					if (api) api.advanceNarrative();
				}, 90000);

				// Loop through portals every 5 min
				if (loopMode && data.allPortals.length > 1) {
					loopTimer = setInterval(() => {
						portalIdx = (portalIdx + 1) % data.allPortals.length;
						const next = data.allPortals[portalIdx];
						if (next && api) api.switchPortal(next.id);
					}, 300000);
				}
			} catch (err) {
				console.error('[projection] boot failed:', err);
				errorMsg = 'Boot: ' + (err.message || String(err));
			}
		}

		boot();

		return () => {
			cancelled = true;
			if (narrativeTimer) clearInterval(narrativeTimer);
			if (loopTimer) clearInterval(loopTimer);
			if (api?.world) {
				import('$lib/portals-ecs/world.js').then(({ destroyPortalWorld }) => {
					destroyPortalWorld(api.world);
				});
			}
		};
	});
</script>

<svelte:head>
	<title>{data?.portal?.name_es || 'Projection'}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
</svelte:head>

<!-- Kill all chrome -->
<svelte:head>
	<style>
		html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #050508 !important; }
		nav, header, footer { display: none !important; }
	</style>
</svelte:head>

{#if errorMsg}
	<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#050508;color:#ef4444;font-family:monospace;font-size:14px;z-index:99999;padding:2rem;text-align:center;">
		⚠ {errorMsg}
	</div>
{:else}
	<div style="position:fixed !important;top:0 !important;left:0 !important;width:100vw !important;height:100vh !important;z-index:99999 !important;background:#050508 !important;" bind:this={containerEl}></div>
{/if}
