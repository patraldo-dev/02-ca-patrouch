<script>
    import { t } from '$lib/i18n';
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

    <!-- Active Portal Entries -->
    <div class="portal-cards">
        <a class="portal-card wreckage" href="/games/booty/arbooty">
            <span class="portal-card-icon">🏴‍☠️</span>
            <div class="portal-card-body">
                <h2>The Wreckage</h2>
                <p>{$t('booty.arbooty.description') || 'Búsqueda del tesoro en realidad aumentada'}</p>
            </div>
        </a>
        <a class="portal-card celebration" href="/games/booty/arbooty?mode=event">
            <span class="portal-card-icon">🎉</span>
            <div class="portal-card-body">
                <h2>Evento de Celebración</h2>
                <p>Crea y encuentra mensajes ocultos con la cámara AR</p>
            </div>
        </a>
    </div>

    <!-- Multiverse Teaser -->
    <div class="coming-soon">
        <div class="divider"></div>
        <p class="vision-text">
            Siete mundos naciendo de las palabras.<br>
            Cada escritura abre un portal. Cada portal, un universo.<br>
            <span class="dim">Próximamente.</span>
        </p>
    </div>
</section>

<style>
    .portals-page {
        max-width: 700px;
        margin: 0 auto;
        padding: 4rem 1.5rem 6rem;
        text-align: center;
    }

    .constellation {
        position: relative;
        width: 200px;
        height: 200px;
        margin: 0 auto 2.5rem;
    }

    .star {
        position: absolute;
        width: 2px;
        height: 2px;
        background: var(--accent);
        border-radius: 50%;
        opacity: 0.4;
        top: calc(50% + var(--y, 0px));
        left: calc(50% + var(--x, 0px));
        animation: twinkle 3s ease-in-out infinite;
        animation-delay: calc(var(--i) * 0.4s);
    }
    .star:nth-child(1) { --x: -80px; --y: -60px; }
    .star:nth-child(2) { --x: 70px; --y: -80px; }
    .star:nth-child(3) { --x: -90px; --y: 30px; }
    .star:nth-child(4) { --x: 85px; --y: 50px; }
    .star:nth-child(5) { --x: -40px; --y: 80px; }
    .star:nth-child(6) { --x: 50px; --y: -20px; }
    .star:nth-child(7) { --x: -10px; --y: -90px; }

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
        opacity: 0.15;
        animation: pulse 4s ease-in-out infinite;
    }
    .orb-core {
        font-size: 3rem;
        display: inline-block;
        animation: spin 8s linear infinite;
        filter: drop-shadow(0 0 12px var(--accent));
    }
    @keyframes pulse {
        0%, 100% { opacity: 0.1; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.25; transform: translate(-50%, -50%) scale(1.3); }
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .page-title {
        font-family: var(--font-heading);
        font-size: 3rem;
        color: var(--fg);
        margin-bottom: 0.5rem;
    }
    .page-subtitle {
        color: var(--muted);
        font-size: 1.1rem;
        margin-bottom: 2.5rem;
        font-style: italic;
    }

    .portal-cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.25rem;
        margin-bottom: 3rem;
    }
    @media (max-width: 560px) {
        .portal-cards { grid-template-columns: 1fr; }
    }

    .portal-card {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1.75rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        text-decoration: none;
        color: var(--fg);
        text-align: left;
        transition: all 0.25s ease;
    }
    .portal-card:hover {
        border-color: var(--accent);
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .portal-card.celebration {
        border-color: #c9a87c33;
    }
    .portal-card.celebration:hover {
        border-color: #c9a87c;
    }
    .portal-card-icon {
        font-size: 2.25rem;
        flex-shrink: 0;
    }
    .portal-card-body h2 {
        font-family: var(--font-heading);
        font-size: 1.2rem;
        color: var(--accent);
        margin-bottom: 0.3rem;
    }
    .portal-card.celebration .portal-card-body h2 {
        color: #c9a87c;
    }
    .portal-card-body p {
        color: var(--text-dim);
        font-size: 0.85rem;
        line-height: 1.5;
    }

    .divider {
        width: 60px;
        height: 1px;
        background: var(--border);
        margin: 0 auto 2rem;
    }

    .coming-soon {
        padding: 1rem;
    }
    .vision-text {
        font-family: var(--font-heading);
        font-size: 1.1rem;
        line-height: 2.2;
        color: var(--text-dim);
    }
    .vision-text .dim {
        color: var(--muted);
        font-size: 0.85rem;
        font-style: italic;
        display: inline-block;
        margin-top: 0.5rem;
    }

    @media (max-width: 640px) {
        .page-title { font-size: 2.2rem; }
        .vision-text { font-size: 1rem; }
        .constellation { width: 160px; height: 160px; }
    }
</style>
