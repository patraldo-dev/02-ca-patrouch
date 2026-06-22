<script>
    import { page } from '$app/stores';
    import { t } from '$lib/i18n';
    import { locale } from '$lib/i18n';
    import PhysicalBottles from '$lib/components/PhysicalBottles.svelte';
    import ArbootyAR from '$lib/components/ArbootyAR.svelte';
    import EventScoreboard from '$lib/components/EventScoreboard.svelte';

    let { data } = $props();
    let showAR = $state(false);

    $effect(() => {
        if (data.myPlayer) window.__bqPlayer = data.myPlayer;
    });

    let mode = $derived($page.url.searchParams.get('mode') || 'pirate');
    let isEvent = $derived(mode === 'event');
    let portal = $derived(data.portalConfig);

    function portalName() {
        if (!portal) return null;
        const lang = $locale || 'es';
        if (lang === 'en') return portal.name_en;
        if (lang === 'fr') return portal.name_fr;
        return portal.name_es;
    }

    function portalDesc() {
        if (!portal) return null;
        const lang = $locale || 'es';
        if (lang === 'en') return portal.description_en;
        if (lang === 'fr') return portal.description_fr;
        return portal.description_es;
    }
</script>

<svelte:head>
    <title>{portal ? portalName() : (isEvent ? '🎉 Evento' : $t('booty.arbooty.title'))} — patrouch.ca</title>
</svelte:head>

<section class="bottles-page" style={portal ? `--portal-accent: ${portal.color_primary};` : ''}>
    <a href="/portals" class="back-link">← {$t('games.title')}</a>

    {#if portal}
        <!-- Portal-themed header -->
        <h1 class="page-title portal-title">
            <span class="portal-icon">{portal.icon}</span>
            <span class="title-accent" style="color: {portal.color_primary}">{portalName()}</span>
        </h1>
        {#if portal.narrator_greeting}
            <p class="portal-greeting" style="color: {portal.color_text || 'var(--text-dim)'}; background: {portal.color_bg || 'var(--surface)'}">{portal.narrator_greeting}</p>
        {/if}
        <p class="page-desc">{portalDesc()}</p>
    {:else if isEvent}
        <h1 class="page-title">
            🎉 <span class="title-accent event">Evento de Celebración</span>
        </h1>
        <p class="page-subtitle">Encuentra los mensajes ocultos</p>
        <p class="page-desc">Busca y captura los mensajes del evento</p>
    {:else}
        <h1 class="page-title">
            🏴‍☠️ Arbooty <span class="title-accent">— Búsqueda del Tesoro</span>
        </h1>
        <p class="page-desc">{$t('booty.arbooty.description')}</p>
    {/if}

    {#if data.myPlayer || isEvent || portal}
        {#if data.myPlayer && !portal}
        <a href="/portals/booty/arbooty/create?mode={mode}" class="create-link">
            {isEvent ? '🎁 Esconder un Mensaje' : '🏴‍☠️ Lanzar una Botella'}
        </a>
        {/if}
        <button class="ar-toggle {mode}" onclick={() => showAR = !showAR}>
            {showAR ? '🗺️ Ver Mapa' : isEvent ? '🎉 Activar AR' : portal ? `🔮 Entrar a ${portalName()}` : '🔭 Modo AR'}
        </button>

        {#if showAR}
            <ArbootyAR player={data.myPlayer} bottles={data.bottles} theme={portal ? 'pirate' : mode} portalConfig={portal} />
        {:else}
            <PhysicalBottles player={data.myPlayer} />
        {/if}
    {:else}
        <div class="join-prompt">
            <p>{isEvent ? 'Inicia sesión para participar' : $t('booty.arbooty.join_required')}</p>
            <a href="/login" class="btn-accent">🏁 {isEvent ? 'Iniciar Sesión' : $t('booty.arbooty.join_btn')}</a>
        </div>
    {/if}

    {#if isEvent}
        <EventScoreboard />
    {/if}
</section>

<style>
    .bottles-page {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem 1rem;
        overflow: hidden;
    }
    .back-link {
        display: inline-block;
        color: var(--accent);
        text-decoration: none;
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }
    .back-link:hover { text-decoration: underline; }
    .page-title {
        font-family: Playfair Display, serif;
        font-size: 2rem;
        color: var(--text);
        margin-bottom: 0.5rem;
        text-align: center;
    }
    .portal-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
    }
    .portal-icon { font-size: 2.5rem; }
    .title-accent { color: var(--accent); }
    .title-accent.event { color: #c9a87c; }
    .portal-greeting {
        font-style: italic;
        font-size: 0.95rem;
        text-align: center;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        margin: 1rem 0;
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
    }
    .page-subtitle {
        font-size: 1.2rem;
        color: #c9a87c;
        text-align: center;
        margin: 0.5rem 0 0;
        font-weight: 600;
    }
    .page-desc {
        color: var(--text-dim);
        font-size: 1rem;
        margin-bottom: 2rem;
        text-align: center;
    }
    .ar-toggle {
        display: block;
        width: 100%;
        padding: 0.75rem;
        background: var(--surface);
        color: var(--portal-accent, var(--accent));
        border: 1px solid var(--portal-accent, var(--accent));
        border-radius: var(--radius);
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 1.5rem;
        transition: all 0.2s;
    }
    .ar-toggle.event {
        color: #c9a87c;
        border-color: #c9a87c;
    }
    .ar-toggle:hover { opacity: 0.9; }
    .create-link {
        display: block;
        text-align: center;
        padding: 0.7rem;
        color: var(--text-dim);
        text-decoration: none;
        font-size: 0.95rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .create-link:hover { color: var(--accent); }
    .join-prompt {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--text-dim);
    }
    .join-prompt p { margin-bottom: 1rem; }
    .btn-accent {
        display: inline-block;
        padding: 0.75rem 2rem;
        background: var(--accent);
        color: var(--bg);
        font-weight: 600;
        border-radius: var(--radius);
        text-decoration: none;
    }
    .btn-accent:hover { opacity: 0.9; }
</style>
