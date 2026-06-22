<!--
	PortalWorld.svelte — Bridge between Svelte SSR layer and IWSDK ECS World

	Browser-only. Dynamically imports @iwsdk/core (heavy, not SSR-safe).
	Provides:
	  - Canvas container for the IWSDK World renderer
	  - Graceful degradation: if WebGL/IWSDK fails, DOM fallback shows
	  - Accessible sr-only nav behind the canvas for crawlers/screen readers
	  - Svelte reactive state that mirrors ECS state via CustomEvents
	  - Bumper gate: hides content overlay until bumper completes
-->

<script>
	import { t } from '$lib/i18n';
	import { locale } from '$lib/i18n';
	import { onMount } from 'svelte';

	let { data } = $props();

	// ── State ──
	let containerEl = $state(null);
	let worldReady = $state(false);
	let worldError = $state(null);
	let activePortalId = $state(null);
	let activePortal = $derived(
		data.portals?.find((p) => p.id === activePortalId) || data.portals?.[0] || null
	);

	// ── i18n helpers (same as original page) ──
	function nameOf(item) {
		const lang = $locale || 'es';
		if (lang === 'en') return item.name_en || item.name_es;
		if (lang === 'fr') return item.name_fr || item.name_es;
		return item.name_es;
	}

	function descOf(item) {
		const lang = $locale || 'es';
		if (lang === 'en') return item.description_en || item.description_es;
		if (lang === 'fr') return item.description_fr || item.description_es;
		return item.description_es;
	}

	// ── Launch into AR ──
	function enterPortal(portalId) {
		if (worldInstance?.globals) {
			worldInstance.globals.launchPortal?.(portalId);
		} else {
			// Fallback: navigate to AR page directly
			window.location.href = `/portals/booty/arbooty?theme=${portalId}`;
		}
	}

	let worldInstance = null;

	onMount(() => {
		let cancelled = false;

		async function boot() {
			try {
				// Dynamic import — keeps @iwsdk out of SSR bundle
				const { initPortalWorld } = await import('./world.js');
				if (cancelled || !containerEl) return;

				const result = await initPortalWorld(containerEl, {
					portals: data.portals || [],
					galaxies: data.galaxies || [],
				});

				if (cancelled) return;

				worldInstance = result.world;
				worldReady = true;

				// Listen for ECS → Svelte events
				window.addEventListener('portal-bumper-done', () => {}, { once: true });

				window.addEventListener('portal-focus', (e) => {
					activePortalId = e.detail.portalId;
				});

				window.addEventListener('portal-carousel', (e) => {
					activePortalId = e.detail.portalId;
				});
			} catch (err) {
				console.error('[PortalWorld] Failed to boot IWSDK World:', err);
				worldError = err.message || 'WebXR unavailable';
				// Graceful degradation: DOM fallback is visible by default
			}
		}

		boot();

		return () => {
			cancelled = true;
			if (worldInstance) {
				import('./world.js').then(({ destroyPortalWorld }) => {
					destroyPortalWorld(worldInstance);
				});
			}
		};
	});
</script>

<!-- ── ECS Canvas Container (fixed, fullscreen behind DOM) ── -->
<div
	class="portal-canvas"
	class:ready={worldReady}
	class:hidden={worldError}
	bind:this={containerEl}
></div>

<!-- ── Accessible fallback nav (always in DOM for SEO/a11y) ── -->
<nav class="sr-only" aria-label="Portals">
	{#each data.galaxies as galaxy}
		<section>
			<h2>{galaxy.icon} {galaxy.name_es}</h2>
			{#each galaxy.portals as portal}
				<a href="/portals/booty/arbooty?theme={portal.id}">
					{nameOf(portal)} — {descOf(portal)}
				</a>
			{/each}
		</section>
	{/each}
</nav>

<!-- ── Content overlay (Svelte DOM over canvas) ── -->
<div class="portal-overlay">
	<!-- Active portal info panel — reacts to ECS focus state -->
	{#if activePortal}
		<div class="portal-info-panel" style="--portal-color: {activePortal.color_primary};">
			<span class="portal-icon-large">{activePortal.icon}</span>
			<h1 class="portal-title" style="color: {activePortal.color_primary}">
				{nameOf(activePortal)}
			</h1>
			<p class="portal-description">{descOf(activePortal)}</p>
			{#if activePortal.active_writings_count > 0}
				<span class="portal-writings">
					{activePortal.active_writings_count} {$t('games.writings')}
				</span>
			{/if}
			<button class="enter-portal-btn" onclick={() => enterPortal(activePortal.id)}>
				{$t('games.enter')} →
			</button>
		</div>
	{/if}

	<!-- Loading indicator while World boots -->
	{#if !worldReady && !worldError}
		<div class="portal-loading">
			<div class="portal-spinner"></div>
		</div>
	{/if}
</div>

<!-- ── Fallback: original portal grid (visible if IWSDK fails) ── -->
{#if worldError}
	<section class="portals-fallback">
		{#each data.galaxies as galaxy}
			<div class="galaxy-group">
				<div class="galaxy-header">
					<span class="galaxy-icon">{galaxy.icon}</span>
					<span class="galaxy-name">{nameOf(galaxy)}</span>
				</div>
				<div class="portal-grid">
					{#each galaxy.portals as portal}
						<a
							class="portal-card"
							href="/portals/booty/arbooty?theme={portal.id}"
							style="--portal-color: {portal.color_primary}; --portal-bg: {portal.color_bg};"
						>
							<span class="portal-icon">{portal.icon}</span>
							<div class="portal-info">
								<h2 class="portal-name" style="color: {portal.color_primary}">
									{nameOf(portal)}
								</h2>
								<p class="portal-desc">{descOf(portal)}</p>
							</div>
							<span class="portal-enter">→</span>
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</section>
{/if}

<style>
	/* Canvas layer */
	.portal-canvas {
		position: fixed;
		inset: 0;
		z-index: 0;
		opacity: 0;
		transition: opacity 0.8s ease;
	}
	.portal-canvas.ready {
		opacity: 1;
	}
	.portal-canvas.hidden {
		display: none;
	}
	/* The canvas element IWSDK inserts */
	.portal-canvas :global(canvas) {
		width: 100% !important;
		height: 100% !important;
		display: block;
	}

	/* Overlay layer — Svelte DOM above canvas */
	.portal-overlay {
		position: relative;
		z-index: 2;
		max-width: 700px;
		margin: 0 auto;
		padding: 1.5rem 1.5rem 4rem;
	}

	/* Info panel — floats at bottom, reacts to active portal */
	.portal-info-panel {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		max-width: 480px;
		width: calc(100% - 3rem);
		padding: 1.5rem 2rem;
		background: rgba(10, 10, 14, 0.85);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid var(--portal-color, var(--border));
		border-radius: 16px;
		text-align: center;
		z-index: 10;
		transition: border-color 0.4s ease;
	}

	.portal-icon-large {
		font-size: 2.5rem;
		display: block;
		margin-bottom: 0.5rem;
	}

	.portal-title {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		margin: 0 0 0.25rem;
	}

	.portal-description {
		color: var(--text-dim, #999);
		font-size: 0.85rem;
		margin: 0 0 0.75rem;
		line-height: 1.4;
	}

	.portal-writings {
		display: inline-block;
		font-size: 0.7rem;
		background: var(--portal-color);
		color: white;
		border-radius: 10px;
		padding: 2px 8px;
		margin-bottom: 0.75rem;
	}

	.enter-portal-btn {
		display: inline-block;
		padding: 0.6rem 2rem;
		background: transparent;
		border: 1px solid var(--portal-color);
		color: var(--portal-color);
		font-family: var(--font-heading);
		font-size: 0.9rem;
		border-radius: 24px;
		cursor: pointer;
		transition: all 0.2s;
	}
	.enter-portal-btn:hover {
		background: var(--portal-color);
		color: #fff;
	}

	/* Loading spinner */
	.portal-loading {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 5;
	}
	.portal-spinner {
		width: 40px;
		height: 40px;
		border: 2px solid var(--border);
		border-top-color: #c9a87c;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	/* Fallback grid (only shows on error) */
	.portals-fallback {
		position: relative;
		z-index: 2;
		max-width: 700px;
		margin: 0 auto;
		padding: 1.5rem 1.5rem 4rem;
	}
	.galaxy-group { margin-bottom: 1.75rem; }
	.galaxy-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.galaxy-icon { font-size: 1.1rem; }
	.galaxy-name {
		font-family: var(--font-heading);
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted);
	}
	.portal-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
	}
	@media (min-width: 560px) {
		.portal-grid { grid-template-columns: 1fr 1fr; }
	}
	.portal-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem 1.5rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-left: 3px solid var(--portal-color);
		border-radius: 12px;
		text-decoration: none;
		color: var(--fg);
		transition: all 0.2s ease;
	}
	.portal-card:hover {
		border-color: var(--portal-color);
		transform: translateX(4px);
	}
	.portal-icon { font-size: 2rem; }
	.portal-info { flex: 1; }
	.portal-name {
		font-family: var(--font-heading);
		font-size: 1.1rem;
		margin: 0;
	}
	.portal-desc {
		font-size: 0.8rem;
		color: var(--text-dim);
		margin: 4px 0 0;
	}
	.portal-enter {
		color: var(--portal-color);
		font-size: 1.2rem;
		opacity: 0.5;
	}

	/* Screen-reader only */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
