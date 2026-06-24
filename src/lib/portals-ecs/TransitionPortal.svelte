<!--
	TransitionPortal.svelte — AR → VR Portal Entry

	The user journey:
	1. Page loads → preview shows portal ring (non-immersive 3D)
	2. Tap "Enter AR" → camera passthrough, ring appears in room
	3. Tap ring → transition begins (ring pulses, fades)
	4. Auto-switch to VR → immersive world takes over

	Fallback: If WebXR AR not supported, offer "Enter VR" directly
	(or DOM-based portal cards if no XR at all)
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { t } from '$lib/i18n';
	import { locale } from '$lib/i18n';

	let { portalConfig } = $props();

	let containerEl = $state(null);
	let api = $state(null);
	let phase = $state('preview'); // preview | ar | transitioning | vr | unsupported
	let errorMsg = $state(null);
	let supports = $state({ ar: false, vr: false });

	function portalName() {
		if (!portalConfig) return 'Portal';
		const lang = $locale || 'es';
		if (lang === 'en') return portalConfig.name_en || portalConfig.name_es;
		if (lang === 'fr') return portalConfig.name_fr || portalConfig.name_es;
		return portalConfig.name_es;
	}

	onMount(() => {
		let cancelled = false;
		async function boot() {
			try {
				const { initTransitionWorld } = await import('./transition-world.js');
				if (cancelled || !containerEl) return;
				api = await initTransitionWorld(containerEl, portalConfig);
				if (cancelled) return;

				// Check XR support
				supports = await api.checkSupport();
				if (!supports.ar && !supports.vr) {
					phase = 'unsupported';
				}

				// Listen for transition-ready event from ECS
				window.addEventListener('portal-transition-ready', handleTransitionReady);
				window.addEventListener('portal-session-ended', handleSessionEnded);
			} catch (err) {
				console.error('[TransitionPortal] Boot failed:', err);
				errorMsg = err.message;
				phase = 'unsupported';
			}
		}
		boot();

		// Tap listener directly on container (not overlay) — works in AR
		function onTouchEnd(e) {
			if (!api || phase !== 'ar') return;
			if (e.changedTouches.length === 0) return;
			const touch = e.changedTouches[0];
			const rect = containerEl.getBoundingClientRect();
			const ndcX = (touch.clientX - rect.left) / rect.width * 2 - 1;
			const ndcY = -((touch.clientY - rect.top) / rect.height * 2 - 1);
			const tapped = api.handleTap(ndcX, ndcY);
			if (tapped) phase = 'transitioning';
		}
		function onClick(e) {
			if (!api || phase !== 'ar') return;
			const rect = containerEl.getBoundingClientRect();
			const ndcX = (e.clientX - rect.left) / rect.width * 2 - 1;
			const ndcY = -((e.clientY - rect.top) / rect.height * 2 - 1);
			const tapped = api.handleTap(ndcX, ndcY);
			if (tapped) phase = 'transitioning';
		}
		containerEl?.addEventListener('click', onClick);
		containerEl?.addEventListener('touchend', onTouchEnd);

		return () => {
			cancelled = true;
			window.removeEventListener('portal-transition-ready', handleTransitionReady);
			window.removeEventListener('portal-session-ended', handleSessionEnded);
			containerEl?.removeEventListener('click', onClick);
			containerEl?.removeEventListener('touchend', onTouchEnd);
		};
	});

	onDestroy(() => {
		if (api) {
			import('./transition-world.js').then(({ destroyTransitionWorld }) => {
				destroyTransitionWorld(api.world);
			});
		}
	});

	function handleSessionEnded() {
		phase = 'preview';
	}

	function handleTransitionReady() {
		phase = 'transitioning';
		// Small delay for visual effect, then enter VR
		setTimeout(async () => {
			if (!api) return;
			try {
				await api.enterVR();
				phase = 'vr';
			} catch (err) {
				console.error('[TransitionPortal] VR entry failed:', err);
				errorMsg = err.message;
				phase = 'ar';
			}
		}, 500);
	}

	async function handleEnterAR() {
		if (!api) return;
		try {
			await api.enterAR();
			phase = 'ar';
		} catch (err) {
			console.error('[TransitionPortal] AR entry failed:', err);
			errorMsg = err.message;
		}
	}

	async function handleEnterVRDirect() {
		if (!api) return;
		try {
			await api.enterVR();
			phase = 'vr';
		} catch (err) {
			console.error('[TransitionPortal] VR direct entry failed:', err);
			errorMsg = err.message;
		}
	}

	function handleExit() {
		if (api) api.exit();
		phase = 'preview';
	}
</script>

<svelte:head>
	<title>{portalName()} — {$t('games.title')}</title>
</svelte:head>

<div class="transition-container" bind:this={containerEl}>
	<!-- ECS canvas mounts here -->
</div>

<!-- UI Overlay -->
{#if phase === 'preview'}
	<div class="overlay preview-overlay">
		<div class="portal-preview" style="--portal-color: {portalConfig?.color_primary || '#c9a87c'};">
			<div class="portal-icon-large">{portalConfig?.icon || '🔮'}</div>
			<h1 class="portal-title">{portalName()}</h1>
			{#if portalConfig?.narrator_greeting}
				<p class="portal-greeting">{portalConfig.narrator_greeting}</p>
			{/if}
			<p class="portal-hint">{$t('games.tap_portal_hint') || 'Toca el portal para entrar'}</p>

			<div class="entry-buttons">
				{#if supports.ar}
					<button class="btn-primary" onclick={handleEnterAR}>
						🔭 Entrar en AR
					</button>
				{/if}
				{#if supports.vr}
					<button class="btn-secondary" onclick={handleEnterVRDirect}>
						🥽 Entrar en VR
					</button>
				{/if}
				{#if !supports.ar && !supports.vr}
					<a class="btn-secondary" href="/portals/enter/{portalConfig?.id || ''}">
						📱 Ver sin XR
					</a>
				{/if}
			</div>
		</div>
	</div>
{:else if phase === 'ar'}
	<div class="overlay ar-overlay">
		<div class="ar-controls">
			<button class="btn-cross" onclick={() => { if (api) { api.focusPortal(); phase = 'transitioning'; } }}>
				Cruzar el portal →
			</button>
			<button class="btn-ghost" onclick={handleExit}>← Salir</button>
		</div>
	</div>
{:else if phase === 'transitioning'}
	<div class="overlay transition-overlay">
		<div class="transition-text">
			<span class="portal-icon-spin">{portalConfig?.icon || '🔮'}</span>
			<p>Cruzando el umbral...</p>
		</div>
	</div>
{:else if phase === 'vr'}
	<div class="overlay vr-overlay">
		<button class="btn-ghost vr-exit" onclick={handleExit}>← Salir</button>
	</div>
{:else if phase === 'unsupported'}
	<div class="overlay unsupported-overlay">
		<div class="fallback-content">
			<h2>{portalName()}</h2>
			{#if errorMsg}
				<p class="error">{errorMsg}</p>
			{/if}
			<p>Tu dispositivo no soporta WebXR inmersivo.</p>
			<a class="btn-secondary" href="/portals/enter/{portalConfig?.id || ''}">
				📱 Ver experiencia alternativa
			</a>
		</div>
	</div>
{/if}

{#if errorMsg && phase !== 'unsupported'}
	<div class="error-toast">{errorMsg}</div>
{/if}

<style>
	.transition-container {
		position: fixed;
		inset: 0;
		z-index: 0;
	}
	.transition-container :global(canvas) {
		width: 100% !important;
		height: 100% !important;
	}

	.overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		pointer-events: none;
	}
	.overlay > * { pointer-events: auto; }

	/* Preview */
	.preview-overlay {
		background: linear-gradient(180deg,
			color-mix(in srgb, var(--portal-color, #c9a87c) 10%, #050508),
			#050508);
	}
	.portal-preview {
		text-align: center;
		max-width: 400px;
		padding: 2rem;
	}
	.portal-icon-large {
		font-size: 4rem;
		margin-bottom: 1rem;
		animation: float 3s ease-in-out infinite;
	}
	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10px); }
	}
	.portal-title {
		font-family: var(--font-heading);
		font-size: 1.8rem;
		color: var(--portal-color, #c9a87c);
		margin: 0 0 0.5rem;
	}
	.portal-greeting {
		color: var(--text-dim);
		font-style: italic;
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}
	.portal-hint {
		color: var(--muted);
		font-size: 0.8rem;
		margin-bottom: 2rem;
	}
	.entry-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: center;
	}

	/* Buttons */
	.btn-primary, .btn-secondary, .btn-ghost {
		font-family: var(--font-heading);
		font-size: 0.95rem;
		padding: 0.8rem 2rem;
		border-radius: 28px;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
		text-decoration: none;
	}
	.btn-primary {
		background: var(--portal-color, #c9a87c);
		color: #050508;
		font-weight: 600;
	}
	.btn-primary:hover { transform: scale(1.05); box-shadow: 0 4px 20px color-mix(in srgb, var(--portal-color, #c9a87c) 40%, transparent); }
	.btn-secondary {
		background: transparent;
		color: var(--portal-color, #c9a87c);
		border: 1px solid var(--portal-color, #c9a87c);
	}
	.btn-secondary:hover { background: color-mix(in srgb, var(--portal-color, #c9a87c) 10%, transparent); }
	.btn-ghost {
		background: rgba(0,0,0,0.5);
		color: rgba(255,255,255,0.6);
		padding: 0.5rem 1.2rem;
		font-size: 0.85rem;
		backdrop-filter: blur(10px);
	}

	/* AR overlay */
	.ar-overlay {
		pointer-events: none;
	}
	.ar-controls {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		pointer-events: auto;
	}
	.btn-cross {
		font-family: var(--font-heading);
		font-size: 1rem;
		padding: 0.9rem 2.5rem;
		border-radius: 28px;
		border: none;
		cursor: pointer;
		background: var(--portal-color, #c9a87c);
		color: #050508;
		font-weight: 600;
		box-shadow: 0 4px 20px rgba(0,0,0,0.5);
		animation: pulse-glow 2s ease-in-out infinite;
	}
	@keyframes pulse-glow {
		0%, 100% { box-shadow: 0 4px 20px color-mix(in srgb, var(--portal-color, #c9a87c) 40%, transparent); }
		50% { box-shadow: 0 4px 30px color-mix(in srgb, var(--portal-color, #c9a87c) 70%, transparent); }
	}

	/* Transition overlay */
	.transition-overlay {
		background: rgba(5, 5, 8, 0);
		transition: background 1.5s ease;
	}
	.transition-text {
		text-align: center;
		color: var(--portal-color, #c9a87c);
		font-family: var(--font-heading);
	}
	.portal-icon-spin {
		font-size: 3rem;
		display: block;
		margin-bottom: 1rem;
		animation: spin 2s linear infinite;
	}
	@keyframes spin {
		from { transform: rotate(0deg) scale(1); }
		50% { transform: rotate(180deg) scale(1.3); }
		to { transform: rotate(360deg) scale(1); }
	}

	/* VR overlay — minimal */
	.vr-overlay {
		pointer-events: none;
	}
	.vr-exit {
		position: fixed;
		top: 1rem;
		left: 1rem;
		pointer-events: auto;
	}

	/* Unsupported */
	.unsupported-overlay {
		background: #050508;
	}
	.fallback-content {
		text-align: center;
		max-width: 350px;
		padding: 2rem;
	}
	.fallback-content h2 {
		font-family: var(--font-heading);
		color: var(--portal-color, #c9a87c);
		margin-bottom: 1rem;
	}
	.error {
		color: #ef4444;
		font-size: 0.8rem;
		margin-bottom: 1rem;
		font-family: monospace;
	}

	/* Error toast */
	.error-toast {
		position: fixed;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(239, 68, 68, 0.9);
		color: white;
		padding: 0.5rem 1.5rem;
		border-radius: 20px;
		font-size: 0.8rem;
		z-index: 100;
	}
</style>
