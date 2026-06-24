<!--
	Portals — The space IS the experience.
	Full-screen overlay, z-index 99999 to cover all layout chrome.
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
				if (cancelled || !containerEl) {
					bootStatus = 'error';
					worldError = 'Container not found';
					return;
				}
				api = await initPortalWorld(containerEl, {
					portals: data.portals || [],
					galaxies: data.galaxies || [],
				});
				if (cancelled) return;

				// Verify canvas has real dimensions
				const canvas = containerEl.querySelector('canvas');
				const rect = containerEl.getBoundingClientRect();
				if (!canvas) {
					bootStatus = 'error';
					worldError = 'IWSDK booted but no canvas element found';
					return;
				}
				if (rect.width < 10 || rect.height < 10) {
					bootStatus = 'error';
					worldError = `Container too small: ${rect.width}x${rect.height}`;
					return;
				}

				worldReady = true;
				bootStatus = 'ready';
			} catch (err) {
				console.error('[PortalWorld] boot failed:', err);
				worldError = (err.message || String(err)) + '\n' + (err.stack || '').split('\n').slice(0, 4).join('\n');
				bootStatus = 'error';
			}
		}
		boot();

		function onPortalFocus(e) {
			focusedPortal = (data.portals || []).find(p => p.id === e.detail.portalId) || null;
		}
		function onPortalEnter(e) {
			mode = 'transitioning';
		}
		function onInteriorReady() { mode = 'interior'; }
		function onExitToIndex() { mode = 'index'; focusedPortal = null; }

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
</script>

<svelte:head>
	<title>{$t('games.title')}</title>
</svelte:head>

<!--
	FULL-SCREEN OVERLAY — z-index 99999 covers navbar, footer, everything.
	All content is position:fixed to escape the <main> layout container.
-->

<!-- Boot / error indicator -->
{#if bootStatus !== 'ready'}
	<div class="boot">
		{#if bootStatus === 'error'}
			<div class="boot-icon" style="color:#ef4444;">⚠</div>
			<pre class="boot-err">{worldError}</pre>
		{:else}
			<div class="boot-icon">⟡</div>
			<div class="boot-text">{bootStatus}</div>
		{/if}
	</div>
{/if}

<!-- Canvas container — covers entire viewport -->
<div class="canvas-host" bind:this={containerEl}></div>

<!-- Focus label -->
{#if worldReady && mode === 'index' && focusedPortal}
	<div class="focus-label" style="--c: {focusedPortal.color_primary}">
		<span>{focusedPortal.icon}</span>
		<span style="color: var(--c)">{nameOf(focusedPortal)}</span>
	</div>
{/if}

<!-- Exit button -->
{#if worldReady && mode === 'interior'}
	<button class="exit-btn" onclick={() => api?.exitToIndex()}>←</button>
{/if}

<!-- Fallback nav (if world fails) -->
{#if bootStatus === 'error'}
	<div class="fallback-nav">
		{#each data.galaxies as galaxy}
			<section>
				<h2>{galaxy.icon} {nameOf(galaxy)}</h2>
				{#each galaxy.portals as portal}
					<a href="/portals/enter/{portal.id}">{portal.icon} {nameOf(portal)}</a>
				{/each}
			</section>
		{/each}
	</div>
{/if}

<!-- Screen reader nav -->
<nav class="sr" aria-label="Portals">
	<h1>{$t('games.title')}</h1>
	{#each data.galaxies as galaxy}
		<section>
			<h2>{nameOf(galaxy)}</h2>
			{#each galaxy.portals as portal}
				<a href="/portals/enter/{portal.id}">{nameOf(portal)}</a>
			{/each}
		</section>
	{/each}
</nav>

<style>
	.boot {
		position: fixed;
		inset: 0;
		z-index: 99999;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		background: #050508;
		font-family: system-ui, sans-serif;
	}
	.boot-icon { font-size: 2.5rem; color: #c9a87c; }
	.boot-text { color: rgba(255,255,255,0.3); font-size: 0.7rem; letter-spacing: 0.3em; text-transform: uppercase; }
	.boot-err { color: #ef4444; font-size: 0.6rem; font-family: monospace; max-width: 90vw; overflow-x: auto; white-space: pre-wrap; text-align: center; padding: 0 1rem; }

	.canvas-host {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		z-index: 99998;
		background: #050508;
	}

	:global(.canvas-host canvas) {
		width: 100% !important;
		height: 100% !important;
		display: block;
	}

	.focus-label {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 99999;
		padding: 0.5rem 1.2rem;
		background: rgba(0,0,0,0.6);
		backdrop-filter: blur(12px);
		border-radius: 24px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		pointer-events: none;
		font-size: 0.9rem;
	}

	.exit-btn {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 99999;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid rgba(255,255,255,0.15);
		background: rgba(0,0,0,0.5);
		backdrop-filter: blur(10px);
		color: rgba(255,255,255,0.6);
		font-size: 1.1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.fallback-nav {
		position: fixed;
		inset: 0;
		z-index: 99999;
		overflow-y: auto;
		padding: 2rem 1.5rem;
		background: #050508;
		color: #e0e0e0;
		font-family: system-ui, sans-serif;
	}
	.fallback-nav h2 { font-size: 0.8rem; color: #888; text-transform: uppercase; margin: 1rem 0 0.3rem; }
	.fallback-nav a { display: block; padding: 0.4rem 0; color: #c9a87c; text-decoration: none; }

	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

	@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
