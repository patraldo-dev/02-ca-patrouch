<script>
    import { t } from '$lib/i18n';
    import { THEMES } from '$lib/ar/portal/themes.js';

    const themeList = Object.values(THEMES);
</script>

<svelte:head>
    <title>{$t('games.title')} — Patrouch</title>
</svelte:head>

<section class="portals-page">
    <div class="constellation">
        {#each Array(7) as _, i}
            <span class="star" style="--i: {i}"></span>
        {/each}
        <div class="portal-orb">
            <span class="orb-glow"></span>
            <span class="orb-core">🌀</span>
        </div>
    </div>

    <h1 class="page-title">{$t('games.title')}</h1>
    <p class="page-subtitle">{$t('pages.home.works.games.desc')}</p>

    <!-- Seven Portals -->
    <div class="portal-grid">
        {#each themeList as theme, i}
            <a
                class="portal-card"
                href="/games/booty/arbooty?theme={theme.id}"
                style="--portal-color: {theme.colors.uiPrimary}; --portal-bg: {theme.colors.uiBackground};"
            >
                <span class="portal-icon">{theme.icon}</span>
                <div class="portal-info">
                    <h2 class="portal-name">{theme.name}</h2>
                    <span class="portal-name-en">{theme.nameEn}</span>
                    <p class="portal-desc">{theme.description}</p>
                </div>
                <span class="portal-enter">→</span>
            </a>
        {/each}
    </div>

    <!-- Event Portal (special) -->
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
        padding: 3rem 1.5rem 6rem;
    }

    .constellation {
        position: relative;
        width: 180px;
        height: 180px;
        margin: 0 auto 2rem;
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
        font-size: 2.5rem;
        color: var(--fg);
        text-align: center;
        margin-bottom: 0.4rem;
    }
    .page-subtitle {
        color: var(--muted);
        font-size: 1rem;
        text-align: center;
        margin-bottom: 2.5rem;
        font-style: italic;
    }

    .portal-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }
    @media (min-width: 560px) {
        .portal-grid {
            grid-template-columns: 1fr 1fr;
        }
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

    .portal-icon {
        font-size: 2rem;
        flex-shrink: 0;
    }

    .portal-info {
        flex: 1;
        min-width: 0;
    }
    .portal-name {
        font-family: var(--font-heading);
        font-size: 1.1rem;
        color: var(--portal-color);
        margin: 0;
        line-height: 1.2;
    }
    .portal-name-en {
        font-size: 0.75rem;
        color: var(--muted);
        display: block;
        margin-top: 1px;
    }
    .portal-desc {
        font-size: 0.8rem;
        color: var(--text-dim);
        margin: 4px 0 0;
        line-height: 1.3;
    }

    .portal-enter {
        color: var(--portal-color);
        font-size: 1.2rem;
        opacity: 0.5;
        transition: opacity 0.2s;
        flex-shrink: 0;
    }
    .portal-card:hover .portal-enter {
        opacity: 1;
    }

    .event-portal {
        --portal-color: #c9a87c;
        --portal-bg: rgba(255, 248, 225, 0.9);
        border-left-width: 3px;
        margin-top: 0.5rem;
    }
</style>
