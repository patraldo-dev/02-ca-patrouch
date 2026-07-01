<!--
	/portals — ECS Portal Scene
	World.create() + Three.js + Antoine art cubes
	No bumper. No index mode. Pure scene.
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { t } from '$lib/i18n';

	let { data } = $props();

	let containerEl = $state(null);
	let booted = $state(false);
	let bootError = $state(null);
	let selectedPortal = $state(null);
	let xrSupport = $state({ ar: false, vr: false });

	onMount(() => {
		let cancelled = false;

		async function boot() {
			try {
				const mod = await import('$lib/portals-ecs/world-builder.js');
				await mod.bootPortalEngine(containerEl);
				if (cancelled) return;
				booted = true;

				// Listen for portal taps
				window.addEventListener('portal-tapped', (e) => {
					selectedPortal = e.detail.portalId;
				});

				// Listen for XR support
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
