<!--
	PortalWorld.svelte — Portals page with reactive visual layer

	Layout:
	- Reactive gradient background (tints toward active/focused portal)
	- Carousel hero at top (video preview, auto-rotating)
	- Portal cards in full-width rows, tap to slide-open detail
	- Galaxy groupings as section headers
	- ECS canvas behind everything (progressive enhancement)
-->

<script>
	import { t } from '$lib/i18n';
	import { locale } from '$lib/i18n';
	import { onMount } from 'svelte';

	let { data } = $props();

	let containerEl = $state(null);
	let worldReady = $state(false);
	let focusedPortalId = $state(null);

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

	// Carousel
	let activeIdx = $state(0);
	let allPortals = $derived(data.portals || []);
	let activePortal = $derived(allPortals[activeIdx] || allPortals[0]);

	$effect(() => {
		if (allPortals.length <= 1) return;
		const timer = setInterval(() => {
			activeIdx = (activeIdx + 1) % allPortals.length;
		}, 6000);
		return () => clearInterval(timer);
	});

	// Background follows focused portal, or carousel if none focused
	let bgPortal = $derived(allPortals.find((p) => p.id === focusedPortalId) || activePortal);

	// ECS boot
	let worldInstance = null;
	onMount(() => {
		let cancelled = false;
		async function boot() {
			try {
				const { initPortalWorld } = await import('./world.js');
				if (cancelled || !containerEl) return;
				const result = await initPortalWorld(containerEl, {
					portals: data.portals || [],
					galaxies: data.galaxies || [],
				});
				if (cancelled) return;
				worldInstance = result.world;
				worldReady = true;
			} catch (err) {
				console.error('[PortalWorld] IWSDK unavailable:', err);
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

	function togglePortal(id) {
		focusedPortalId = focusedPortalId === id ? null : id;
	}
</script>

<!-- ECS Canvas -->
<div class="portal-canvas" class:ready={worldReady} bind:this={containerEl}></div>

<!-- Reactive background -->
<div
	class="reactive-bg"
	style="--bg-a: {bgPortal?.color_primary || '#c9a87c'}; --bg-b: {bgPortal?.color_bg || '#1a1a2e'};"
></div>

<!-- Accessible nav -->
<nav class="sr-only" aria-label="Portals">
	{#each data.galaxies as galaxy}
		<section>
			<h2>{galaxy.icon} {nameOf(galaxy)}</h2>
			{#each galaxy.portals as portal}
				<a href="/portals/booty/arbooty?theme={portal.id}">
					{nameOf(portal)} — {descOf(portal)}
				</a>
			{/each}
		</section>
	{/each}
</nav>

<!-- Page content -->
<section class="portals-page">

	<!-- Carousel -->
	{#if activePortal}
		<a
			class="carousel-hero"
			href="/portals/booty/arbooty?theme={activePortal.id}"
			style="--pv-color: {activePortal.color_primary};"
		>
			{#if activePortal.video_url}
				<div class="hero-video">
					<iframe
						src={activePortal.video_url}
						frameborder="0"
						scrolling="no"
						allow="autoplay; encrypted-media"
						title={nameOf(activePortal)}
					></iframe>
				</div>
			{:else}
				<div class="hero-fallback">
					<span class="hero-icon">{activePortal.icon}</span>
				</div>
			{/if}
			<div class="hero-bar">
				<span class="hero-name" style="color: {activePortal.color_primary}">
					{activePortal.icon} {nameOf(activePortal)}
				</span>
				<div class="hero-dots">
					{#each allPortals as _, i}
						<button
							class="hero-dot"
							class:active={i === activeIdx}
							onclick={(e) => { e.preventDefault(); activeIdx = i; }}
							aria-label="Slide {i + 1}"
						></button>
					{/each}
				</div>
			</div>
		</a>
	{/if}

	<h1 class="page-title">{$t('games.title')}</h1>
	<p class="page-subtitle">{$t('pages.home.works.games.desc')}</p>

	{#if data.galaxies?.length > 0}
		<div class="galaxies">
			{#each data.galaxies as galaxy}
				<div class="galaxy-group">
					<div class="galaxy-header">
						<span class="galaxy-icon">{galaxy.icon}</span>
						<span class="galaxy-name">{nameOf(galaxy)}</span>
					</div>
					<div class="portal-list">
						{#each galaxy.portals as portal}
							<div
								class="portal-item"
								class:open={focusedPortalId === portal.id}
								style="--portal-color: {portal.color_primary}; --portal-bg: {portal.color_bg};"
							>
								<button
									class="portal-row"
									onclick={() => togglePortal(portal.id)}
									aria-expanded={focusedPortalId === portal.id}
								>
									<span class="portal-icon">{portal.icon}</span>
									<div class="portal-info">
										<h2 class="portal-name" style="color: {portal.color_primary}">{nameOf(portal)}</h2>
										<p class="portal-desc">{descOf(portal)}</p>
									</div>
									{#if portal.active_writings_count > 0}
										<span class="portal-writings">{portal.active_writings_count}</span>
									{/if}
									<span class="portal-chevron" class:rotated={focusedPortalId === portal.id}>›</span>
								</button>

								<!-- Slide-down detail panel -->
								{#if focusedPortalId === portal.id}
									<div class="portal-detail">
										<a class="portal-enter" href="/portals/booty/arbooty?theme={portal.id}">
											{$t('games.enter')} →
										</a>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.portal-canvas {
		position: fixed;
		inset: 0;
		z-index: 0;
		opacity: 0;
		transition: opacity 0.8s ease;
		pointer-events: none;
	}
	.portal-canvas.ready { opacity: 1; }
	.portal-canvas :global(canvas) { width: 100% !important; height: 100% !important; }

	.reactive-bg {
		position: fixed;
		inset: 0;
		z-index: 0;
		background:
			radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, var(--bg-a) 8%, transparent), transparent),
			linear-gradient(180deg, color-mix(in srgb, var(--bg-a) 12%, #0a0a0e), color-mix(in srgb, var(--bg-b) 8%, #050508));
		transition: background 1.5s ease;
	}

	.portals-page {
		position: relative;
		z-index: 2;
		max-width: 700px;
		margin: 0 auto;
		padding: 1.5rem 1.5rem 4rem;
	}

	/* Carousel */
	.carousel-hero {
		display: block;
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		margin-bottom: 1.5rem;
		border-radius: 16px;
		overflow: hidden;
		border: 2px solid color-mix(in srgb, var(--pv-color, #c9a87c) 40%, transparent);
		background: #0a0a0e;
		text-decoration: none;
		color: var(--fg);
		transition: border-color 0.8s ease;
		animation: hero-fade 0.6s ease;
	}
	@keyframes hero-fade { from { opacity: 0.3; } to { opacity: 1; } }
	.hero-video, .hero-fallback {
		position: absolute; inset: 0; width: 100%; height: 100%;
	}
	.hero-video iframe {
		width: 100%; height: 100%; border: none; pointer-events: none;
	}
	.hero-fallback {
		display: flex; align-items: center; justify-content: center;
		background: color-mix(in srgb, var(--pv-color, #c9a87c) 10%, #0a0a0e);
	}
	.hero-icon { font-size: 3.5rem; }
	.hero-bar {
		position: absolute; bottom: 0; left: 0; right: 0;
		padding: 0.6rem 1rem;
		display: flex; justify-content: space-between; align-items: center;
		background: linear-gradient(to top, rgba(0,0,0,0.75), transparent);
	}
	.hero-name {
		font-family: var(--font-heading);
		font-size: 0.9rem; font-weight: 600;
		text-shadow: 0 1px 4px rgba(0,0,0,0.9);
	}
	.hero-dots { display: flex; gap: 6px; }
	.hero-dot {
		width: 7px; height: 7px; border-radius: 50%; border: none;
		background: rgba(255,255,255,0.25); cursor: pointer; padding: 0;
		transition: all 0.3s;
	}
	.hero-dot.active {
		background: var(--pv-color, #c9a87c);
		transform: scale(1.3);
	}

	/* Title */
	.page-title {
		font-family: var(--font-heading);
		font-size: 1.75rem;
		text-align: center;
		margin-bottom: 0.2rem;
	}
	.page-subtitle {
		color: var(--muted); font-size: 0.9rem; text-align: center;
		margin-bottom: 1.5rem; font-style: italic;
	}

	/* Galaxy groups */
	.galaxies {
		display: flex; flex-direction: column; gap: 1.5rem;
	}
	.galaxy-header {
		display: flex; align-items: center; gap: 0.5rem;
		margin-bottom: 0.5rem; padding: 0 0.25rem;
	}
	.galaxy-icon { font-size: 1.1rem; }
	.galaxy-name {
		font-family: var(--font-heading); font-size: 0.8rem;
		text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);
	}

	/* Portal items — full width, slide-open on tap */
	.portal-list {
		display: flex; flex-direction: column; gap: 0.6rem;
	}
	.portal-item {
		background: var(--surface);
		border: 1px solid var(--border);
		border-left: 3px solid var(--portal-color);
		border-radius: 12px;
		overflow: hidden;
		transition: all 0.2s ease;
	}
	.portal-item.open {
		border-color: var(--portal-color);
		background: color-mix(in srgb, var(--portal-bg, var(--surface)) 10%, var(--surface));
		box-shadow: 0 4px 20px color-mix(in srgb, var(--portal-color) 12%, transparent);
	}
	.portal-row {
		display: flex; align-items: center; gap: 1rem;
		padding: 1rem 1.25rem;
		border: none; background: transparent;
		width: 100%; text-align: left; cursor: pointer;
		color: var(--fg);
	}
	.portal-icon { font-size: 1.8rem; flex-shrink: 0; }
	.portal-info { flex: 1; min-width: 0; }
	.portal-name {
		font-family: var(--font-heading); font-size: 1.05rem;
		margin: 0; line-height: 1.2;
	}
	.portal-desc {
		font-size: 0.78rem; color: var(--text-dim);
		margin: 2px 0 0; line-height: 1.3;
	}
	.portal-writings {
		font-size: 0.7rem; background: var(--portal-color);
		color: #fff; border-radius: 10px; padding: 2px 8px; flex-shrink: 0;
	}
	.portal-chevron {
		color: var(--portal-color); font-size: 1.4rem;
		opacity: 0.5; transition: all 0.25s ease;
		flex-shrink: 0; transform: rotate(0deg);
	}
	.portal-chevron.rotated {
		transform: rotate(90deg);
		opacity: 1;
	}

	/* Slide-down detail */
	.portal-detail {
		padding: 0 1.25rem 1rem;
		animation: detail-slide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes detail-slide {
		from { opacity: 0; transform: translateY(-8px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.portal-enter {
		display: inline-block;
		padding: 0.5rem 1.5rem;
		border: 1px solid var(--portal-color);
		color: var(--portal-color);
		font-family: var(--font-heading);
		font-size: 0.85rem;
		border-radius: 24px;
		text-decoration: none;
		transition: all 0.2s;
	}
	.portal-enter:hover {
		background: var(--portal-color);
		color: #fff;
	}

	.sr-only {
		position: absolute; width: 1px; height: 1px;
		padding: 0; margin: -1px; overflow: hidden;
		clip: rect(0,0,0,0); white-space: nowrap; border: 0;
	}
</style>
