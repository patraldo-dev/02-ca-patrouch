<!--
	/portals/enter/[id] — Text-based portal fallback

	The primary entry is now /portals (the spatial world). This route
	serves as the no-WebGL fallback: portal info, narrator greeting,
	and link back to the spatial experience.
-->
<script>
	import { t } from '$lib/i18n';
	import { locale } from '$lib/i18n';

	let { data } = $props();

	const portal = $derived(data.portalConfig);

	function nameOf(p) {
		const lang = $locale || 'es';
		if (lang === 'en') return p?.name_en || p?.name_es;
		if (lang === 'fr') return p?.name_fr || p?.name_es;
		return p?.name_es;
	}
	function descOf(p) {
		const lang = $locale || 'es';
		if (lang === 'en') return p?.description_en || p?.description_es;
		if (lang === 'fr') return p?.description_fr || p?.description_es;
		return p?.description_es;
	}
</script>

<svelte:head>
	<title>{nameOf(portal)} — {$t('games.title')}</title>
</svelte:head>

<div class="portal-fallback" style="--portal-color: {portal?.color_primary || '#c9a87c'}">
	<a class="back-link" href="/portals">← {$t('games.title')}</a>

	<div class="portal-card">
		<div class="portal-icon">{portal?.icon || '🔮'}</div>
		<h1 class="portal-name">{nameOf(portal)}</h1>
		<p class="portal-desc">{descOf(portal)}</p>

		{#if portal?.narrator_greeting}
			<blockquote class="narrator-greeting">{portal.narrator_greeting}</blockquote>
		{/if}

		{#if portal?.narrator_tone}
			<p class="narrator-tone">{portal.narrator_tone}</p>
		{/if}

		<a class="enter-spatial" href="/portals">
			⟡ {$t('games.enter') || 'Mundo Espacial'}
		</a>

		<a class="enter-agora" href="/agora?portal={portal?.id}">
			📝 Escritos
		</a>

		{#if portal?.active_writings_count > 0}
			<p class="writings-count">
				{portal.active_writings_count} {$t('games.writings') || 'writings'}
			</p>
		{/if}
	</div>
</div>

<style>
	.portal-fallback {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		background:
			radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--portal-color) 15%, transparent), transparent),
			#050508;
	}
	.back-link {
		position: fixed; top: 1rem; left: 1rem;
		color: var(--muted); text-decoration: none; font-size: 0.85rem;
	}
	.portal-card {
		text-align: center;
		max-width: 400px;
	}
	.portal-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		animation: float 3s ease-in-out infinite;
	}
	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-8px); }
	}
	.portal-name {
		font-family: var(--font-heading);
		font-size: 1.8rem;
		color: var(--portal-color);
		margin: 0 0 0.5rem;
	}
	.portal-desc {
		color: var(--text-dim);
		font-style: italic;
		margin-bottom: 1.5rem;
	}
	.narrator-greeting {
		border-left: 2px solid var(--portal-color);
		padding: 0.5rem 1rem;
		margin: 1rem 0;
		color: var(--text-dim);
		font-style: italic;
		font-size: 0.9rem;
	}
	.narrator-tone {
		color: var(--muted);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
	.enter-spatial {
		display: inline-block;
		margin-top: 2rem;
		padding: 0.7rem 2rem;
		border: 1px solid var(--portal-color);
		color: var(--portal-color);
		font-family: var(--font-heading);
		font-size: 0.95rem;
		border-radius: 28px;
		text-decoration: none;
		transition: all 0.2s;
	}
	.enter-spatial:hover {
		background: var(--portal-color);
		color: #050508;
	}
	.enter-agora {
		display: inline-block;
		margin-top: 1rem;
		color: var(--text-dim);
		font-size: 0.85rem;
		text-decoration: none;
		border-bottom: 1px solid transparent;
		transition: border-color 0.2s;
	}
	.enter-agora:hover { border-color: var(--text-dim); }
	.writings-count {
		color: var(--muted);
		font-size: 0.75rem;
		margin-top: 1rem;
	}
</style>
