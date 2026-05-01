<script>
    import { page } from '$app/stores';
    import { t } from '$lib/i18n';
    import PhysicalBottles from '$lib/components/PhysicalBottles.svelte';
    import ArbootyAR from '$lib/components/ArbootyAR.svelte';

    let { data } = $props();
    let showAR = $state(false);

    let mode = $derived($page.url.searchParams.get('mode') || 'pirate');
    let isFiesta = $derived(mode === 'fiesta');
</script>

<svelte:head>
    <title>{isFiesta ? '🎉 Modo Fiesta' : $t('booty.arbooty.title')} — patrouch.ca</title>
</svelte:head>

<section class="bottles-page">
    <a href="/games/booty" class="back-link">← {isFiesta ? 'Volver' : $t('booty.arbooty.back')}</a>
    <h1 class="page-title">
        {#if isFiesta}
            🎉 <span class="title-accent fiesta">¡Fiesta de Victor!</span>
            <p class="page-subtitle">🎂 60 años joven 🎂</p>
        {:else}
            🏴‍☠️ Arbooty <span class="title-accent">— Búsqueda del Tesoro</span>
        {/if}
    </h1>
    <p class="page-desc">{isFiesta ? 'Encuentra los mensajes de cumpleaños' : $t('booty.arbooty.description')}</p>

    {#if data.myPlayer}
        <a href="/games/booty/arbooty/create?mode={mode}" class="create-link">
            {isFiesta ? '🎁 Esconder un Mensaje' : '🏴‍☠️ Lanzar una Botella'}
        </a>
        <button class="ar-toggle {mode}" onclick={() => showAR = !showAR}>
            {showAR ? '🗺️ Ver Mapa' : isFiesta ? '🎉 Activar Fiesta AR' : '🔭 Modo AR'}
        </button>

        {#if showAR}
            <ArbootyAR player={data.myPlayer} bottles={data.bottles} theme={mode} />
        {:else}
            <PhysicalBottles player={data.myPlayer} />
        {/if}
    {:else}
        <div class="join-prompt">
            <p>{isFiesta ? 'Inicia sesión para encontrar mensajes' : $t('booty.arbooty.join_required')}</p>
            <a href="/games/booty" class="btn-accent">🏁 {isFiesta ? 'Iniciar Sesión' : $t('booty.arbooty.join_btn')}</a>
        </div>
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
    }
    .title-accent {
        color: var(--accent);
    }
    .title-accent.fiesta {
        color: #c9a87c;
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
    }
    .ar-toggle {
        display: block;
        width: 100%;
        padding: 0.75rem;
        background: var(--surface);
        color: var(--accent);
        border: 1px solid var(--accent);
        border-radius: var(--radius);
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 1.5rem;
        transition: all 0.2s;
    }
    .ar-toggle.fiesta {
        color: #881337;
        border-color: #881337;
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
