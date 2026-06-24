<!--
	PortalWorld.svelte — The space IS the experience.

	No menu. No AR/VR choice. No grid of cards.

	The ECS canvas loads full-screen. Floating portal mouths pulse in space.
	Touch + hold one → it grows → the world dissolves into the portal interior.

	Semantic nav lives in sr-only for accessibility + SEO.
	A minimal status overlay shows portal names on focus.
	Fallback link to text-based portal list for non-WebGL devices.
-->
<script>
	import { t } from '$lib/i18n';
	import { locale } from '$lib/i18n';
	import { onMount, onDestroy } from 'svelte';

	let { data } = $props();

	let containerEl = $state(null);
	let worldReady = $state(false);
	let worldError = $state(null);
	let api = null;

	// Reactive UI state (driven by ECS CustomEvents, minimal)
	let focusedPortal = $state(null);  // { id, name, icon, color }
	let interiorPortal = $state(null); // when inside a portal
	let mode = $state('index');        // 'index' | 'transitioning' | 'interior'

	// Bumper
	let showBumper = $state(false);
	let bumperSrc = $state('');
	const BUMPER_VERSIONS = [
		'/portal-bumper-v1.html',
		'/portal-bumper-v2.html',
		'/portal-bumper-v3.html',
		'/portal-bumper-v4.html',
	];

	function nameOf(item) {
		const lang = $locale || 'es';
		if (lang === 'en') return item.name_en || item.name_es;
		if (lang === 'fr') return item.name_fr || item.name_es;
		return item.name_es;
	}

	onMount(() => {
		// Bumper — once per session
		if (!sessionStorage.getItem('patrouch-bumper-played')) {
			bumperSrc = BUMPER_VERSIONS[Math.floor(Math.random() * BUMPER_VERSIONS.length)];
			showBumper = true;
			sessionStorage.setItem('patrouch-bumper-played', '1');
			setTimeout(() => { showBumper = false; }, 6500);
		}

		let cancelled = false;
		async function boot() {
			try {
				const { initPortalWorld } = await import('$lib/portals-ecs/world.js');
				if (cancelled || !containerEl) return;
				api = await initPortalWorld(containerEl, {
					portals: data.portals || [],
					galaxies: data.galaxies || [],
				});
				if (cancelled) return;
				worldReady = true;
			} catch (err) {
				console.error('[PortalWorld] IWSDK boot failed:', err);
				worldError = err.message;
			}
		}
		boot();

		// ECS → Svelte event bridge
		function onPortalFocus(e) {
			const portal = (data.portals || []).find(p => p.id === e.detail.portalId);
			focusedPortal = portal || null;
		}
		function onPortalEnter(e) {
			const portal = (data.portals || []).find(p => p.id === e.detail.portalId);
			interiorPortal = portal || null;
			mode = 'transitioning';
		}
		function onInteriorReady() {
			mode = 'interior';
		}
		function onExitToIndex() {
			mode = 'index';
			interiorPortal = null;
			focusedPortal = null;
		}

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

	function handleExit() {
		api?.exitToIndex();
	}

	async function handleEnterAR() {
		if (!api) return;
		try {
			await api.enterAR();
		} catch (err) {
			console.error('AR entry failed:', err);
		}
	}
</script>

<!-- Bumper -->
{#if showBumper}
	<div class="bumper-overlay">
		<iframe src={bumperSrc} frameborder="0" allow="autoplay"></iframe>
		<button class="bumper-skip" onclick={() => showBumper = false}>Skip</button>
	</div>
{/if}

<!-- ECS Canvas — full screen, this IS the page -->
<div class="portal-canvas" class:ready={worldReady} bind:this={containerEl}>
	{#if !worldReady && !worldError}
		<div class="boot-indicator">
			<span class="boot-icon">⟡</span>
			<span class="boot-text">...</span>
		</div>
	{/if}
</div>

<!-- Fallback: if WebGL/IWSDK failed -->
{#if worldError}
	<div class="fallback">
		<h1>{$t('games.title')}</h1>
		<div class="fallback-list">
			{#each data.galaxies as galaxy}
				<section>
					<h2>{galaxy.icon} {nameOf(galaxy)}</h2>
					{#each galaxy.portals as portal}
						<a href="/portals/enter/{portal.id}">
							{portal.icon} {nameOf(portal)}
						</a>
					{/each}
				</section>
			{/each}
		</div>
	</div>
{/if}

<!-- Minimal overlay — portal name on focus, exit button in interior -->
{#if worldReady && !worldError}

	<!-- Index mode: show focused portal name -->
	{#if mode === 'index' && focusedPortal}
		<div class="focus-label" style="--portal-color: {focusedPortal.color_primary}">
			<span class="focus-icon">{focusedPortal.icon}</span>
			<span class="focus-name">{nameOf(focusedPortal)}</span>
			<span class="focus-hold">⟡</span>
		</div>
	{/if}

	<!-- Transitioning: dissolve overlay -->
	{#if mode === 'transitioning'}
		<div class="dissolve-overlay"></div>
	{/if}

	<!-- Interior mode: exit button + narrative hint -->
	{#if mode === 'interior'}
		<button class="exit-btn" onclick={handleExit}>←</button>
		<div class="interior-hint">
			<span>{interiorPortal?.icon || '🔮'}</span>
		</div>
	{/if}
{/if}

<!-- Accessible nav (sr-only, for SEO + screen readers) -->
<nav class="sr-only" aria-label="Portals">
	<h1>{$t('games.title')}</h1>
	{#each data.galaxies as galaxy}
		<section>
			<h2>{galaxy.icon} {nameOf(galaxy)}</h2>
			{#each galaxy.portals as portal}
				<a href="/portals/enter/{portal.id}">
					{nameOf(portal)} — {portal.active_writings_count} writings
				</a>
			{/each}
		</section>
	{/each}
</nav>

<style>
	/* Canvas = full screen page */
	.portal-canvas {
		position: fixed;
		inset: 0;
		z-index: 0;
		opacity: 0;
		transition: opacity 1s ease;
	}
	.portal-canvas.ready { opacity: 1; }
	.portal-canvas :global(canvas) {
		width: 100% !important;
		height: 100% !important;
		display: block;
	}

	.boot-indicator {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		background: #050508;
	}
	.boot-icon {
		font-size: 2.5rem;
		color: #c9a87c;
		animation: boot-spin 2s linear infinite;
	}
	.boot-text {
		color: rgba(255,255,255,0.3);
		font-size: 0.7rem;
		letter-spacing: 0.3em;
		text-transform: uppercase;
	}
	@keyframes boot-spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Bumper */
	.bumper-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: #050508;
	}
	.bumper-overlay iframe { width: 100%; height: 100%; border: none; }
	.bumper-skip {
		position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 10000;
		background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
		color: rgba(255,255,255,0.4); padding: 0.4rem 1rem; border-radius: 20px;
		cursor: pointer; font-size: 0.75rem; backdrop-filter: blur(10px);
		transition: all 0.2s;
	}
	.bumper-skip:hover { color: #fff; border-color: rgba(255,255,255,0.3); }

	/* Focus label — minimal, floats at bottom */
	.focus-label {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1.2rem;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(12px);
		border-radius: 24px;
		z-index: 10;
		pointer-events: none;
		animation: focus-fade-in 0.3s ease;
	}
	@keyframes focus-fade-in {
		from { opacity: 0; transform: translateX(-50%) translateY(8px); }
		to { opacity: 1; transform: translateX(-50%) translateY(0); }
	}
	.focus-icon { font-size: 1.2rem; }
	.focus-name {
		font-family: var(--font-heading);
		color: var(--portal-color, #c9a87c);
		font-size: 0.9rem;
		font-weight: 500;
	}
	.focus-hold {
		color: var(--portal-color, #c9a87c);
		animation: pulse 1s ease-in-out infinite;
	}
	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}

	/* Dissolve overlay */
	.dissolve-overlay {
		position: fixed;
		inset: 0;
		z-index: 5;
		background: #050508;
		opacity: 0;
		animation: dissolve 1.2s ease forwards;
		pointer-events: none;
	}
	@keyframes dissolve {
		0% { opacity: 0; }
		40% { opacity: 0.7; }
		100% { opacity: 0; }
	}

	/* Interior controls */
	.exit-btn {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 10;
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
		transition: all 0.2s;
	}
	.exit-btn:hover {
		color: #fff;
		border-color: rgba(255,255,255,0.3);
	}

	.interior-hint {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 10;
		font-size: 1.5rem;
		opacity: 0.4;
		pointer-events: none;
	}

	/* Fallback (no WebGL) */
	.fallback {
		position: relative;
		z-index: 2;
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		color: var(--fg, #e0e0e0);
	}
	.fallback h1 {
		font-family: var(--font-heading);
		text-align: center;
		margin-bottom: 2rem;
	}
	.fallback-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.fallback-list h2 {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted, #888);
		margin-bottom: 0.5rem;
	}
	.fallback-list a {
		display: block;
		padding: 0.6rem 0.8rem;
		color: var(--fg, #e0e0e0);
		text-decoration: none;
		border-left: 2px solid var(--border, #333);
		transition: border-color 0.2s;
	}
	.fallback-list a:hover { border-color: #c9a87c; }

	.sr-only {
		position: absolute; width: 1px; height: 1px;
		padding: 0; margin: -1px; overflow: hidden;
		clip: rect(0,0,0,0); white-space: nowrap; border: 0;
	}
</style>
