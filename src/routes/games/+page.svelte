<script>
    import { t } from '$lib/i18n';
    import { locale } from '$lib/i18n';

    let { data } = $props();

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

    let portalCount = $derived(data.portals?.length || 0);
</script>

<svelte:head>
    <title>{$t('games.title')} — Patrouch</title>
</svelte:head>

<section class="portals-page">
    <div class="constellation">
        {#each Array(portalCount) as _, i}
            <span class="star" style="--i: {i}"></span>
        {/each}
        <div class="portal-orb">
            <span class="orb-glow"></span>
            <span class="orb-core">🌀</span>
        </div>
    </div>

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
                    <div class="portal-grid">
                        {#each galaxy.portals as portal}
                            <a
                                class="portal-card"
                                href="/games/booty/arbooty?theme={portal.id}"
                                style="--portal-color: {portal.color_primary}; --portal-bg: {portal.color_bg};"
                            >
                                <span class="portal-icon">{portal.icon}</span>
                                <div class="portal-info">
                                    <h2 class="portal-name" style="color: {portal.color_primary}">{nameOf(portal)}</h2>
                                    <p class="portal-desc">{descOf(portal)}</p>
                                </div>
                                {#if portal.active_writings_count > 0}
                                    <span class="portal-writings">{portal.active_writings_count}</span>
                                {/if}
                                <span class="portal-enter">→</span>
                            </a>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="loading">
            <div class="spinner"></div>
        </div>
    {/if}

    <!-- Event Portal (special, outside galaxy system) -->
    <a class="portal-card event-portal" href="/games/booty/arbooty?mode=event">
        <span class="portal-icon">🎉</span>
        <div class="portal-info">
            <h2 class="portal-name">Evento de Celebración</h2>
            <p class="portal-desc">Mensajes ocultos con cámara AR</p>
        </div>
        <span class="portal-enter">→</span>
    </a>
</section>

<style>
    .portals-page {
        max-width: 700px;
        margin: 0 auto;
        padding: 1.5rem 1.5rem 4rem;
    }

    .constellation {
        position: relative;
        width: 180px;
        height: 180px;
        margin: 0 auto 1.25rem;
    }

    .star {
        position: absolute;
        width: 2px;
        height: 2px;
        background: var(--accent);
        border-radius: 50%;
        opacity: 0.4;
        animation: twinkle 3s ease-in-out infinite;
        animation-delay: calc(var(--i) * 0.4s);
    }
    .star:nth-child(1) { top: 15%; left: 10%; }
    .star:nth-child(2) { top: 25%; left: 85%; }
    .star:nth-child(3) { top: 60%; left: 5%; }
    .star:nth-child(4) { top: 70%; left: 90%; }
    .star:nth-child(5) { top: 85%; left: 30%; }
    .star:nth-child(6) { top: 10%; left: 50%; }
    .star:nth-child(7) { top: 40%; left: 95%; }
    .star:nth-child(8) { top: 50%; left: 15%; }
    .star:nth-child(9) { top: 30%; left: 35%; }
    .star:nth-child(10) { top: 80%; left: 60%; }
    .star:nth-child(n+11) { top: 5%; left: 75%; }

    @keyframes twinkle {
        0%, 100% { opacity: 0.15; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.5); }
    }

    .portal-orb {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
    .orb-glow {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
        opacity: 0.12;
        animation: pulse 4s ease-in-out infinite;
    }
    .orb-core {
        font-size: 2.5rem;
        display: inline-block;
        animation: spin 8s linear infinite;
        filter: drop-shadow(0 0 10px var(--accent));
    }
    @keyframes pulse {
        0%, 100% { opacity: 0.08; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.2; transform: translate(-50%, -50%) scale(1.3); }
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .page-title {
        font-family: var(--font-heading);
        font-size: 2rem;
        color: var(--fg);
        text-align: center;
        margin-bottom: 0.25rem;
    }
    .page-subtitle {
        color: var(--muted);
        font-size: 1rem;
        text-align: center;
        margin-bottom: 1.5rem;
        font-style: italic;
    }

    .galaxies {
        display: flex;
        flex-direction: column;
        gap: 1.75rem;
        margin-bottom: 1.5rem;
    }

    .galaxy-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        padding: 0 0.25rem;
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
        background: var(--portal-bg, var(--surface));
        border-color: var(--portal-color);
        transform: translateX(4px);
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }

    .portal-icon { font-size: 2rem; flex-shrink: 0; }
    .portal-info { flex: 1; min-width: 0; }
    .portal-name {
        font-family: var(--font-heading);
        font-size: 1.1rem;
        margin: 0;
        line-height: 1.2;
    }
    .portal-desc {
        font-size: 0.8rem;
        color: var(--text-dim);
        margin: 4px 0 0;
        line-height: 1.3;
    }
    .portal-writings {
        font-size: 0.7rem;
        background: var(--portal-color);
        color: white;
        border-radius: 10px;
        padding: 2px 8px;
        flex-shrink: 0;
    }
    .portal-enter {
        color: var(--portal-color);
        font-size: 1.2rem;
        opacity: 0.5;
        transition: opacity 0.2s;
        flex-shrink: 0;
    }
    .portal-card:hover .portal-enter { opacity: 1; }

    .event-portal {
        --portal-color: #c9a87c;
        --portal-bg: rgba(255, 248, 225, 0.9);
        border-left-width: 3px;
        margin-top: 0.5rem;
    }

    .loading {
        text-align: center;
        padding: 3rem;
    }
    .spinner {
        width: 32px;
        height: 32px;
        border: 2px solid var(--border);
        border-top-color: var(--accent);
        border-radius: 50%;
        margin: 0 auto;
        animation: spin 1s linear infinite;
    }
</style>
