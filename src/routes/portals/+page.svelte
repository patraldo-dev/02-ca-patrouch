<!--
	Portals — The space IS the experience.
	Canvas-first, no menu. Everything else is overlay.
-->
<script>
	import { t } from '$lib/i18n';
	import { locale } from '$lib/i18n';
	import { onMount, onDestroy } from 'svelte';

	let { data } = $props();

	let containerEl = $state(null);
	let worldReady = $state(false);
	let worldError = $state(null);
	let bootStatus = $state('init');
	let api = null;

	let focusedPortal = $state(null);
	let interiorPortal = $state(null);
	let mode = $state('index');

	function nameOf(item) {
		const lang = $locale || 'es';
		if (lang === 'en') return item.name_en || item.name_es;
		if (lang === 'fr') return item.name_fr || item.name_es;
		return item.name_es;
	}

	onMount(() => {
		let cancelled = false;
		async function boot() {
			try {
				bootStatus = 'loading';
				const { initPortalWorld } = await import('$lib/portals-ecs/world.js');
				if (cancelled || !containerEl) { bootStatus = 'error'; worldError = 'No container'; return; }
			api = await initPortalWorld(containerEl, {
				portals: data.portals || [],
				galaxies: data.galaxies || [],
			});
			if (cancelled) return;
			// Verify canvas actually has dimensions
			const canvas = containerEl.querySelector('canvas');
			const rect = containerEl.getBoundingClientRect();
			if (!canvas || rect.width === 0 || rect.height === 0) {
				bootStatus = 'error';
				worldError = `Canvas not sized: container ${rect.width}x${rect.height}, canvas ${canvas ? 'exists' : 'missing'}`;
				return;
			}
			worldReady = true;
			bootStatus = 'ready';
			} catch (err) {
				console.error('[PortalWorld] boot failed:', err);
				worldError = (err.message || String(err)) + '\n' + (err.stack || '').split('\n').slice(0,4).join('\n');
				bootStatus = 'error';
			}
		}
		boot();

		function onPortalFocus(e) {
			focusedPortal = (data.portals || []).find(p => p.id === e.detail.portalId) || null;
		}
		function onPortalEnter(e) {
			interiorPortal = (data.portals || []).find(p => p.id === e.detail.portalId) || null;
			mode = 'transitioning';
		}
		function onInteriorReady() { mode = 'interior'; }
		function onExitToIndex() { mode = 'index'; interiorPortal = null; focusedPortal = null; }

		window.addEventListener('portal-focus', onPortalFocus);
		window.addEventListener('portal-enter', onPortalEnter);
		window.addEventListener('portal-interior-ready', onInteriorReady);
		window.addEventListener('portal-exit-to-index', onExitToIndex);

		return () => {
			cancelled = true;
			window.removeEventListener('portal-focus', onPortalFocus);
			window.removeEventListener('portal-enter', onPortalEnter);
			window.removeEventListener('portal-interior-ready', onInteriorReady);
			window.removeEventListener('portal-exit-to-index', onExitToIndex);
		};
	});

	onDestroy(() => {
		if (api?.world) {
			import('$lib/portals-ecs/world.js').then(({ destroyPortalWorld }) => {
				destroyPortalWorld(api.world);
			});
		}
	});

	function handleExit() { api?.exitToIndex(); }
</script>

<svelte:head>
	<title>{$t('games.title')}</title>
	<style>
		/* Kill layout chrome on this page only */
		body > .app-layout > .navbar,
		body > .app-layout > .site-footer { display: none !important; }
	</style>
</svelte:head>

<!-- Boot indicator (plain HTML, always visible, no wrapper dependency) -->
{#if bootStatus !== 'ready'}
	<div style="position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;background:#050508;color:#c9a87c;font-family:system-ui,sans-serif;">
		{#if bootStatus === 'error'}
			<div style="font-size:2rem;color:#ef4444;">⚠</div>
			<pre style="color:#ef4444;font-size:0.65rem;font-family:monospace;max-width:90vw;overflow-x:auto;white-space:pre-wrap;text-align:center;padding:0 1rem;">{worldError}</pre>
		{:else}
			<div style="font-size:2.5rem;animation:spin 2s linear infinite;">⟡</div>
			<div style="color:rgba(255,255,255,0.3);font-size:0.7rem;letter-spacing:0.3em;text-transform:uppercase;">{bootStatus}</div>
		{/if}
	</div>
{/if}

<!-- Post-boot diagnostic (flashes briefly if canvas is broken) -->
{#if bootStatus === 'ready'}
	<div id="diag-flash" style="position:fixed;top:0.5rem;right:0.5rem;z-index:99998;padding:0.3rem 0.6rem;background:rgba(0,200,0,0.3);color:#0f0;font-family:monospace;font-size:0.5rem;border-radius:4px;">
		OK
	</div>
{/if}

<!-- ECS Canvas -->
<div style="position:fixed;inset:0;z-index:1;opacity:{worldReady ? 1 : 0};transition:opacity 1s ease;" bind:this={containerEl}></div>

<!-- Fallback -->
{#if worldError && bootStatus === 'error'}
	<div style="position:fixed;inset:0;z-index:99998;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;background:#050508;color:#e0e0e0;font-family:system-ui,sans-serif;">
		<h1 style="color:#c9a87c;font-size:1.5rem;margin-bottom:1rem;">{$t('games.title')}</h1>
		{#each data.galaxies as galaxy}
			<section style="margin-bottom:1.5rem;">
				<h2 style="font-size:0.8rem;color:#888;text-transform:uppercase;">{galaxy.icon} {nameOf(galaxy)}</h2>
				{#each galaxy.portals as portal}
					<a href="/portals/enter/{portal.id}" style="display:block;padding:0.4rem;color:#c9a87c;text-decoration:none;">
						{portal.icon} {nameOf(portal)}
					</a>
				{/each}
			</section>
		{/each}
	</div>
{/if}

<!-- Minimal overlays -->
{#if worldReady && !worldError}
	{#if mode === 'index' && focusedPortal}
		<div style="position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);z-index:10;padding:0.5rem 1.2rem;background:rgba(0,0,0,0.6);backdrop-filter:blur(12px);border-radius:24px;display:flex;align-items:center;gap:0.5rem;pointer-events:none;">
			<span style="font-size:1.2rem;">{focusedPortal.icon}</span>
			<span style="color:{focusedPortal.color_primary};font-size:0.9rem;font-weight:500;">{nameOf(focusedPortal)}</span>
		</div>
	{/if}
	{#if mode === 'interior'}
		<button onclick={handleExit} style="position:fixed;top:1rem;left:1rem;z-index:10;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.5);backdrop-filter:blur(10px);color:rgba(255,255,255,0.6);font-size:1.1rem;cursor:pointer;">←</button>
	{/if}
{/if}

<!-- Accessible nav -->
<nav style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);" aria-label="Portals">
	<h1>{$t('games.title')}</h1>
	{#each data.galaxies as galaxy}
		<section>
			<h2>{galaxy.icon} {nameOf(galaxy)}</h2>
			{#each galaxy.portals as portal}
				<a href="/portals/enter/{portal.id}">{nameOf(portal)}</a>
			{/each}
		</section>
	{/each}
</nav>

<style>
	@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
	:global(canvas) { width: 100% !important; height: 100% !important; display: block; }
</style>
