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
	let bumperVersion = $state(null);
	let bumperDone = $state(false);
	let debugLogs = $state([]);
	let serverDebug = $state(null);
	let crystalText = $state(null); // shown when crystal is tapped
	let xrSupport = $state({ ar: false, vr: false });

	const BUMPER_DURATION = 6500;
	const BUMPER_VERSIONS = [1, 2, 3, 4];

function nameOf(item) {
		const lang = $locale || 'es';
		if (lang === 'en') return item.name_en || item.name_es;
		if (lang === 'fr') return item.name_fr || item.name_es;
		return item.name_es;
	}

	onMount(() => {
		let cancelled = false;

		// Skip bumper entirely — boot ECS immediately.
		bumperDone = true;

		async function bootECS() {
			if (cancelled || api) return;
			try {
				bootStatus = 'loading';

				// Hard timeout on entire boot — if IWSDK hangs on this device,
				// fall through to the portal gallery instead of spinning forever.
				const bootPromise = (async () => {
					const { initPortalWorld } = await import('$lib/portals-ecs/world.js');
					if (cancelled || !containerEl) {
						throw new Error('Container not found');
					}
					const result = await initPortalWorld(containerEl, {
						portals: data.portals || [],
						galaxies: data.galaxies || [],
						featuredPortalId: data.featuredPortal?.id,
						sceneConfigs: data.sceneConfigs || {},
					});
					return result;
				})();

				const timeoutPromise = new Promise((_, reject) =>
					setTimeout(() => reject(new Error('IWSDK boot timeout after 15s')), 15000)
				);

				api = await Promise.race([bootPromise, timeoutPromise]);
				if (cancelled) return;

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
				worldError = (err.message || String(err)) + '\n' + (err.stack || '').split('\n').slice(0, 6).join('\n');
				bootStatus = 'error';
			}
		}


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

		function onDebug(e) {
			debugLogs = [...debugLogs, e.detail];
		}
		function onCrystalTap(e) {
			if (e.detail?.text) {
				crystalText = e.detail.text;
				// Auto-hide after 5 seconds
				setTimeout(() => { crystalText = null; }, 5000);
			}
		}
		window.addEventListener('crystal-tapped', onCrystalTap);

		// Check XR support on boot
		if (api?.checkSupport) {
			api.checkSupport().then(s => { xrSupport = s; });
		}

		window.addEventListener('portal-debug', onDebug);

		// Boot ECS immediately — no bumper gate.
		bootECS();

		return () => {
			cancelled = true;
			window.removeEventListener('portal-focus', onPortalFocus);
			window.removeEventListener('portal-enter', onPortalEnter);
			window.removeEventListener('portal-interior-ready', onInteriorReady);
			window.removeEventListener('portal-exit-to-index', onExitToIndex);
			window.removeEventListener('portal-debug', onDebug);
			window.removeEventListener('crystal-tapped', onCrystalTap);
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

<!-- Bumper iframe overlay — random version, ~6.5s, then ECS boots -->
{#if bumperVersion && !bumperDone}
	<div class="bumper-overlay">
		<iframe src="/portal-bumper-v{bumperVersion}.html" title="patrouch.ca" allow="autoplay"></iframe>
		<button class="bumper-skip" onclick={skipBumper}>Saltar →</button>
	</div>
{/if}

<!-- Boot / error indicator (only after bumper phase) -->
{#if bumperDone && bootStatus !== 'ready'}
	<div class="boot">
		{#if bootStatus === 'error'}
			<div class="boot-icon" style="color:#ef4444;">⚠</div>
			<pre class="boot-err">{worldError}</pre>
		{:else}
			<div class="boot-icon">⟡</div>
			<div class="boot-text">Cargando mundo…</div>
		{/if}
	</div>
{:else}
{/if}

<!-- Canvas container — covers entire viewport (hidden during bumper) -->
<div style="position:fixed !important;top:0 !important;left:0 !important;width:100vw !important;height:100vh !important;z-index:99998 !important;background:#0a0a12 !important;pointer-events:none;{bumperDone ? '' : 'visibility:hidden;'}" bind:this={containerEl}></div>

<!-- UI Overlay removed — using fixed positioning on each element instead -->

<!-- Focus label -->
{#if worldReady && mode === 'index' && focusedPortal}
	<div class="focus-label" style="--c: {focusedPortal.color_primary}; pointer-events:none; z-index:100001;">
		<span>{focusedPortal.icon}</span>
		<span style="color: var(--c)">{nameOf(focusedPortal)}</span>
	</div>
{/if}

<!-- Exit button + explore all -->
{#if worldReady && mode === 'interior'}
	<button class="exit-btn" style="pointer-events:auto !important;z-index:100002 !important;" onclick={(e) => { e.preventDefault(); e.stopPropagation(); api?.exitToIndex(); }}>←</button>
	<button class="explore-btn" style="pointer-events:auto !important;z-index:100002 !important;" onclick={(e) => { e.preventDefault(); e.stopPropagation(); api?.exitToIndex(); }}>⟡</button>

	<!-- XR Entry Buttons -->
	<div class="xr-buttons" style="pointer-events:auto !important;z-index:100002 !important;">
		{#if xrSupport.ar}
			<button class="xr-btn ar-btn" onclick={(e) => { e.preventDefault(); e.stopPropagation(); api?.enterAR(); }}>🥽 AR</button>
		{/if}
		{#if xrSupport.vr}
			<button class="xr-btn vr-btn" onclick={(e) => { e.preventDefault(); e.stopPropagation(); api?.enterVR(); }}>🕶️ VR</button>
		{/if}
	</div>
{/if}

<!-- Crystal Text Overlay -->
{#if crystalText}
	<div class="crystal-overlay" onclick={() => { crystalText = null; }}>
		<div class="crystal-text-card">
			<p>{crystalText}</p>
			<span class="crystal-close">× tap to dismiss</span>
		</div>
	</div>
{/if}

<!-- Fallback gallery (if world fails) — no loop, links to writing content -->
{#if bumperDone && bootStatus === 'error'}
	<div class="fallback-nav">
		<div class="fallback-header">
			<p class="fallback-msg">No se pudo cargar el mundo espacial.</p>
			<button class="retry-btn" onclick={() => location.reload()}>↻ Reintentar</button>
		</div>
		<div class="portal-gallery">
			{#each data.portals as portal}
				<a class="portal-card" href="/agora?portal={portal.id}" style="--c: {portal.color_primary}">
					<span class="portal-card-icon">{portal.icon}</span>
					<span class="portal-card-name">{nameOf(portal)}</span>
					{#if portal.active_writings_count}
						<span class="portal-card-count">{portal.active_writings_count} escritos</span>
					{/if}
				</a>
			{/each}
		</div>
	</div>
{/if}

<!-- Screen reader nav -->
<nav class="sr" aria-label="Portals">
	<h1>{$t('games.title')}</h1>
	{#each data.portals as portal}
		<a href="/agora?portal={portal.id}">{nameOf(portal)}</a>
	{/each}
</nav>

<!-- Debug overlays removed -->

<style>
	.bumper-overlay {
		position: fixed;
		inset: 0;
		z-index: 99999;
		background: #050508;
	}
	.bumper-overlay iframe {
		width: 100%;
		height: 100%;
		border: none;
		display: block;
	}
	.bumper-skip {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 100;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		color: rgba(255,255,255,0.4);
		padding: 0.4rem 1rem;
		border-radius: 20px;
		cursor: pointer;
		font-size: 0.75rem;
		backdrop-filter: blur(10px);
		transition: all 0.2s;
	}
	.bumper-skip:hover {
		color: #fff;
		border-color: rgba(255,255,255,0.3);
	}

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

	.explore-btn {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		z-index: 99999;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1px solid rgba(201, 168, 124, 0.3);
		background: rgba(0,0,0,0.5);
		backdrop-filter: blur(10px);
		color: #c9a87c;
		font-size: 1.3rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}
	.explore-btn:hover {
		border-color: rgba(201, 168, 124, 0.6);
		color: #fff;
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
	.fallback-header { text-align: center; margin-bottom: 2rem; }
	.fallback-msg { color: #888; font-size: 0.9rem; margin-bottom: 1rem; }
	.retry-btn {
		padding: 0.5rem 1.5rem;
		border-radius: 24px;
		border: 1px solid rgba(201,168,124,0.4);
		background: rgba(201,168,124,0.1);
		color: #c9a87c;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.portal-gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 1rem;
		max-width: 600px;
		margin: 0 auto;
	}
	.portal-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 1.5rem 1rem;
		border-radius: 12px;
		background: rgba(255,255,255,0.03);
		border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
		text-decoration: none;
		transition: all 0.2s;
	}
	.portal-card:hover {
		background: color-mix(in srgb, var(--c) 10%, transparent);
		border-color: var(--c);
	}
	.portal-card-icon { font-size: 2rem; }
	.portal-card-name { color: var(--c); font-size: 0.85rem; font-weight: 600; text-align: center; }
	.portal-card-count { color: #666; font-size: 0.7rem; }

	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

	.xr-buttons {
		position: fixed;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 99999;
		display: flex;
		gap: 0.6rem;
	}
	.xr-btn {
		padding: 0.5rem 1.2rem;
		border-radius: 20px;
		border: 1px solid rgba(255,255,255,0.2);
		background: rgba(0,0,0,0.6);
		backdrop-filter: blur(12px);
		color: #fff;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s;
		font-family: system-ui, sans-serif;
	}
	.xr-btn:hover {
		border-color: rgba(201, 168, 124, 0.6);
		background: rgba(201, 168, 124, 0.15);
	}
	.ar-btn { border-color: rgba(100, 200, 255, 0.3); }
	.vr-btn { border-color: rgba(200, 100, 255, 0.3); }

	.crystal-overlay {
		position: fixed;
		inset: 0;
		z-index: 100003;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0,0,0,0.4);
		backdrop-filter: blur(8px);
		cursor: pointer;
	}
	.crystal-text-card {
		max-width: 85vw;
		max-height: 60vh;
		overflow-y: auto;
		padding: 1.5rem 2rem;
		background: rgba(15, 15, 25, 0.9);
		border: 1px solid rgba(201, 168, 124, 0.3);
		border-radius: 12px;
		box-shadow: 0 0 40px rgba(201, 168, 124, 0.15);
	}
	.crystal-text-card p {
		color: #f0e6d6;
		font-size: 1.05rem;
		line-height: 1.6;
		font-family: 'Georgia', 'Times New Roman', serif;
		font-style: italic;
		margin: 0;
	}
	.crystal-close {
		display: block;
		margin-top: 0.8rem;
		font-size: 0.7rem;
		color: rgba(255,255,255,0.3);
		text-align: center; }

	.debug-overlay {
		position: fixed;
		top: 0.5rem;
		left: 0.5rem;
		right: 0.5rem;
		z-index: 100000;
		background: rgba(0,0,0,0.85);
		color: #0f0;
		font-family: monospace;
		font-size: 0.65rem;
		padding: 0.5rem;
		border-radius: 6px;
		border: 1px solid rgba(0,255,0,0.3);
		max-height: 40vh;
		overflow-y: auto;
		pointer-events: none;
	}
</style>
