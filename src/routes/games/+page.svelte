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

    // Auto-rotating portal preview
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
</script>

<svelte:head>
    <title>{$t('games.title')} — Patrouch</title>
</svelte:head>

<section class="portals-page">
    <!-- Portal Preview -->
    {#if activePortal}
        <a class="portal-preview" href="/games/booty/arbooty?theme={activePortal.id}" style="--pv-color: {activePortal.color_primary}; --pv-bg: {activePortal.color_bg};">
            {#if activePortal.video_url}
                <div class="preview-video">
                    <iframe
                        src="{activePortal.video_url}"
                        frameborder="0"
                        scrolling="no"
                        allow="autoplay; encrypted-media"
                        title={nameOf(activePortal)}
                    ></iframe>
                </div>
            {:else}
                <div class="preview-icon">{activePortal.icon}</div>
            {/if}
            <div class="preview-overlay">
                <span class="preview-name" style="color: {activePortal.color_primary}">{nameOf(activePortal)}</span>
                <div class="preview-dots">
                    {#each allPortals as _, i}
                        <span class="dot" class:active={i === activeIdx}></span>
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

    .portal-preview {
        display: block;
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        margin-bottom: 1rem;
        border-radius: 14px;
        overflow: hidden;
        border: 3px solid var(--pv-color, var(--border));
        background: var(--pv-color, var(--surface));
        text-decoration: none;
        color: var(--fg);
        transition: border-color 0.8s ease;
        animation: portal-fade 0.6s ease;
        cursor: pointer;
    }
    .portal-preview:hover {
        opacity: 0.95;
    }
    @keyframes portal-fade {
        from { opacity: 0.3; }
        to { opacity: 1; }
    }
    .preview-icon {
        font-size: 3rem;
        line-height: 1;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
    .preview-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
    }
    .preview-video iframe {
        width: 100%;
        height: 100%;
        border: none;
        pointer-events: none;
        object-fit: cover;
    }
    .preview-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 0.5rem 0.75rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
    }
    .preview-name {
        font-family: var(--font-heading);
        font-size: 0.85rem;
        font-weight: 600;
        text-shadow: 0 1px 3px rgba(0,0,0,0.8);
    }
    .preview-dots {
        display: flex;
        gap: 4px;
        margin-top: 2px;
    }
    .dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--border);
        transition: background 0.3s;
    }
    .dot.active {
        background: var(--pv-color);
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
