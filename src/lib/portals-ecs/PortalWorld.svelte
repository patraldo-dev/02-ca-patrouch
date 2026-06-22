<!--
	PortalWorld.svelte — Portals page with reactive visual layer

	Layout:
	- Full-width animated gradient background (reacts to active portal)
	- Carousel hero at top (video preview, auto-rotating)
	- Left rail of portal tabs → tap slides out a detail panel
	- Galaxy groupings as visual clusters in the rail
	- ECS canvas behind everything (progressive enhancement)
-->

<script>
	import { t } from '$lib/i18n';
	import { locale } from '$lib/i18n';
	import { onMount } from 'svelte';

	let { data } = $props();

	// ── State ──
	let containerEl = $state(null);
	let worldReady = $state(false);
	let focusedPortalId = $state(null);
	let hoveredPortalId = $state(null);

	// ── i18n ──
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

	// ── Carousel ──
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

	// ── Focused portal (for slide-out panel) ──
	let focusedPortal = $derived(
		allPortals.find((p) => p.id === focusedPortalId) || null
	);

	// ── Reactive background colors ──
	let bgColors = $derived.by(() => {
		const p = focusedPortal || activePortal;
		if (!p) return { a: '#0d0d14', b: '#05050a', glow: '#c9a87c' };
		return {
			a: p.color_primary || '#c9a87c',
			b: p.color_bg || '#1a1a2e',
			glow: p.color_primary || '#c9a87c',
		};
	});

	// ── ECS World boot (silent, progressive enhancement) ──
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

	function focusPortal(id) {
		focusedPortalId = focusedPortalId === id ? null : id;
	}
</script>

<!-- ── ECS Canvas (behind everything) ── -->
<div class="portal-canvas" class:ready={worldReady} bind:this={containerEl}></div>

<!-- ── Reactive animated background ── -->
<div
	class="reactive-bg"
	style="--bg-a: {bgColors.a}; --bg-b: {bgColors.b}; --bg-glow: {bgColors.glow};"
></div>

<!-- ── Accessible nav ── -->
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

<!-- ── Page Content ── -->
<section class="portals-page">

	<!-- Carousel hero -->
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

	<!-- Title -->
	<h1 class="page-title">{$t('games.title')}</h1>
	<p class="page-subtitle">{$t('pages.home.works.games.desc')}</p>

	<!-- Portal rail + slide-out panel -->
	{#if data.galaxies?.length > 0}
		<div class="portal-layout" class:panel-open={focusedPortal}>
			<!-- Left rail: portal tabs -->
			<aside class="portal-rail">
				{#each data.galaxies as galaxy, gi}
					{#if gi > 0}<div class="rail-divider"></div>{/if}
					<div class="rail-group-label">{galaxy.icon}</div>
					{#each galaxy.portals as portal}
						<button
							class="rail-tab"
							class:focused={focusedPortalId === portal.id}
							class:hovered={hoveredPortalId === portal.id}
							style="--tab-color: {portal.color_primary};"
							onclick={() => focusPortal(portal.id)}
							onmouseenter={() => hoveredPortalId = portal.id}
							onmouseleave={() => hoveredPortalId = null}
							aria-label={nameOf(portal)}
							title={nameOf(portal)}
						>
							<span class="rail-icon">{portal.icon}</span>
							<span class="rail-label">{nameOf(portal)}</span>
							{#if portal.active_writings_count > 0}
								<span class="rail-badge">{portal.active_writings_count}</span>
							{/if}
							<span class="rail-indicator"></span>
						</button>
					{/each}
				{/each}
			</aside>

			<!-- Slide-out detail panel -->
			{#if focusedPortal}
				<div class="portal-panel" style="--panel-color: {focusedPortal.color_primary}; --panel-bg: {focusedPortal.color_bg};">
					<button class="panel-close" onclick={() => focusedPortalId = null} aria-label="Close">×</button>
					<span class="panel-icon">{focusedPortal.icon}</span>
					<h2 class="panel-name" style="color: {focusedPortal.color_primary}">{nameOf(focusedPortal)}</h2>
					<p class="panel-desc">{descOf(focusedPortal)}</p>
					{#if focusedPortal.active_writings_count > 0}
						<span class="panel-writings">{focusedPortal.active_writings_count} {$t('games.writings')}</span>
					{/if}
					<a class="panel-enter" href="/portals/booty/arbooty?theme={focusedPortal.id}">
						{$t('games.enter')} →
					</a>
				</div>
			{:else}
				<!-- Grid view when no panel open -->
				<div class="portal-grid-area">
					{#each data.galaxies as galaxy}
						<div class="galaxy-section">
							<div class="galaxy-header">
								<span>{galaxy.icon}</span>
								<span>{nameOf(galaxy)}</span>
							</div>
							<div class="portal-cards">
								{#each galaxy.portals as portal}
									<a
										class="portal-card"
										href="/portals/booty/arbooty?theme={portal.id}"
										style="--portal-color: {portal.color_primary};"
										onmouseenter={() => hoveredPortalId = portal.id}
										onmouseleave={() => hoveredPortalId = null}
									>
										<span class="card-icon">{portal.icon}</span>
										<span class="card-name">{nameOf(portal)}</span>
										{#if portal.active_writings_count > 0}
											<span class="card-badge">{portal.active_writings_count}</span>
										{/if}
									</a>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</section>

<style>
	/* ── ECS Canvas ── */
	.portal-canvas {
		position: fixed;
		inset: 0;
		z-index: 0;
		opacity: 0;
		transition: opacity 0.8s ease;
		pointer-events: none;
	}
	.portal-canvas.ready { opacity: 1; }
	.portal-canvas :global(canvas) {
		width: 100% !important;
		height: 100% !important;
	}

	/* ── Reactive background ── */
	.reactive-bg {
		position: fixed;
		inset: 0;
		z-index: 0;
		background:
			radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, var(--bg-glow) 8%, transparent), transparent),
			linear-gradient(180deg, color-mix(in srgb, var(--bg-a) 12%, #0a0a0e), color-mix(in srgb, var(--bg-b) 8%, #050508));
		transition: background 1.5s ease;
	}

	/* ── Page container ── */
	.portals-page {
		position: relative;
		z-index: 2;
		max-width: 700px;
		margin: 0 auto;
		padding: 1.5rem 1.5rem 4rem;
	}

	/* ── Carousel hero ── */
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
	@keyframes hero-fade {
		from { opacity: 0.3; }
		to { opacity: 1; }
	}
	.hero-video, .hero-fallback {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.hero-video iframe {
		width: 100%;
		height: 100%;
		border: none;
		pointer-events: none;
	}
	.hero-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--pv-color, #c9a87c) 10%, #0a0a0e);
	}
	.hero-icon { font-size: 3.5rem; }
	.hero-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 0.6rem 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: linear-gradient(to top, rgba(0,0,0,0.75), transparent);
	}
	.hero-name {
		font-family: var(--font-heading);
		font-size: 0.9rem;
		font-weight: 600;
		text-shadow: 0 1px 4px rgba(0,0,0,0.9);
	}
	.hero-dots {
		display: flex;
		gap: 6px;
	}
	.hero-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		border: none;
		background: rgba(255,255,255,0.25);
		cursor: pointer;
		padding: 0;
		transition: all 0.3s;
	}
	.hero-dot.active {
		background: var(--pv-color, #c9a87c);
		transform: scale(1.3);
	}

	/* ── Title ── */
	.page-title {
		font-family: var(--font-heading);
		font-size: 1.75rem;
		text-align: center;
		margin-bottom: 0.2rem;
	}
	.page-subtitle {
		color: var(--muted);
		font-size: 0.9rem;
		text-align: center;
		margin-bottom: 1.5rem;
		font-style: italic;
	}

	/* ── Portal layout: rail + panel/grid ── */
	.portal-layout {
		display: flex;
		gap: 1rem;
		min-height: 300px;
	}

	/* ── Left rail ── */
	.portal-rail {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex-shrink: 0;
		padding-right: 0.5rem;
		border-right: 1px solid var(--border);
	}
	.rail-divider {
		height: 1px;
		background: var(--border);
		margin: 6px 0;
	}
	.rail-group-label {
		font-size: 0.9rem;
		text-align: center;
		opacity: 0.5;
		padding: 2px 0;
	}
	.rail-tab {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.6rem;
		border: none;
		background: transparent;
		color: var(--fg);
		cursor: pointer;
		border-radius: 10px;
		transition: all 0.2s ease;
		position: relative;
		text-align: left;
		width: 100%;
		min-height: 44px;
	}
	.rail-tab:hover {
		background: color-mix(in srgb, var(--tab-color) 10%, transparent);
	}
	.rail-tab.focused {
		background: color-mix(in srgb, var(--tab-color) 15%, transparent);
	}
	.rail-icon {
		font-size: 1.3rem;
		flex-shrink: 0;
		filter: grayscale(0.3);
		transition: filter 0.2s;
	}
	.rail-tab:hover .rail-icon,
	.rail-tab.focused .rail-icon {
		filter: grayscale(0);
	}
	.rail-label {
		font-size: 0.78rem;
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.rail-badge {
		font-size: 0.65rem;
		background: var(--tab-color);
		color: #fff;
		border-radius: 8px;
		padding: 1px 6px;
	}
	.rail-indicator {
		position: absolute;
		right: -0.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 3px;
		height: 0;
		background: var(--tab-color);
		border-radius: 2px;
		transition: height 0.2s ease;
	}
	.rail-tab.focused .rail-indicator {
		height: 60%;
	}

	/* ── Slide-out detail panel ── */
	.portal-panel {
		flex: 1;
		background: color-mix(in srgb, var(--panel-bg, var(--surface)) 15%, var(--surface));
		border: 1px solid color-mix(in srgb, var(--panel-color, var(--border)) 30%, var(--border));
		border-left: 3px solid var(--panel-color, var(--accent));
		border-radius: 16px;
		padding: 1.5rem;
		animation: panel-slide 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
	}
	@keyframes panel-slide {
		from {
			opacity: 0;
			transform: translateX(-20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	.panel-close {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: var(--muted);
		font-size: 1.5rem;
		cursor: pointer;
		border-radius: 8px;
		transition: all 0.15s;
	}
	.panel-close:hover {
		background: var(--border);
		color: var(--fg);
	}
	.panel-icon { font-size: 2.5rem; }
	.panel-name {
		font-family: var(--font-heading);
		font-size: 1.4rem;
		margin: 0;
	}
	.panel-desc {
		color: var(--text-dim);
		font-size: 0.9rem;
		line-height: 1.4;
		margin: 0;
	}
	.panel-writings {
		font-size: 0.7rem;
		background: var(--panel-color);
		color: #fff;
		border-radius: 10px;
		padding: 2px 8px;
	}
	.panel-enter {
		display: inline-block;
		margin-top: 0.5rem;
		padding: 0.6rem 1.5rem;
		border: 1px solid var(--panel-color);
		color: var(--panel-color);
		font-family: var(--font-heading);
		font-size: 0.9rem;
		border-radius: 24px;
		text-decoration: none;
		transition: all 0.2s;
	}
	.panel-enter:hover {
		background: var(--panel-color);
		color: #fff;
	}

	/* ── Grid view (no panel open) ── */
	.portal-grid-area {
		flex: 1;
	}
	.galaxy-section {
		margin-bottom: 1.25rem;
	}
	.galaxy-header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.5rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted);
	}
	.portal-cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.6rem;
	}
	.portal-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.8rem 0.5rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-top: 2px solid var(--portal-color);
		border-radius: 12px;
		text-decoration: none;
		color: var(--fg);
		transition: all 0.2s ease;
		position: relative;
	}
	.portal-card:hover {
		border-color: var(--portal-color);
		transform: translateY(-2px);
		box-shadow: 0 4px 16px color-mix(in srgb, var(--portal-color) 15%, transparent);
	}
	.card-icon { font-size: 1.6rem; }
	.card-name {
		font-size: 0.75rem;
		text-align: center;
		line-height: 1.2;
	}
	.card-badge {
		position: absolute;
		top: 4px;
		right: 4px;
		font-size: 0.6rem;
		background: var(--portal-color);
		color: #fff;
		border-radius: 8px;
		padding: 1px 5px;
	}

	/* ── Mobile: rail becomes horizontal scroll ── */
	@media (max-width: 560px) {
		.portal-layout {
			flex-direction: column;
			gap: 0.75rem;
		}
		.portal-rail {
			flex-direction: row;
			overflow-x: auto;
			border-right: none;
			border-bottom: 1px solid var(--border);
			padding: 0 0 0.5rem;
			gap: 6px;
			scrollbar-width: thin;
		}
		.rail-divider {
			width: 1px;
			height: auto;
			margin: 0 2px;
		}
		.rail-group-label {
			font-size: 0.8rem;
			padding: 0 2px;
		}
		.rail-tab {
			flex-shrink: 0;
			min-height: 40px;
			padding: 0.4rem 0.5rem;
		}
		.rail-label { display: none; }
		.rail-badge { font-size: 0.55rem; }
		.rail-indicator {
			right: 50%;
			transform: translateX(50%);
			bottom: -0.5rem;
			top: auto;
			width: 0;
			height: 3px;
		}
		.rail-tab.focused .rail-indicator {
			width: 60%;
			height: 3px;
		}
		.portal-panel {
			animation: panel-slide-up 0.3s ease;
		}
		@keyframes panel-slide-up {
			from { opacity: 0; transform: translateY(10px); }
			to { opacity: 1; transform: translateY(0); }
		}
	}

	/* ── Utilities ── */
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
</style>
