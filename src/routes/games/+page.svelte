<script>
    import { goto } from '$app/navigation';
    import { t } from '$lib/i18n';

    let { data } = $props();

    function goTo(path) {
        window.location.href = path;
    }
</script>

<svelte:head>
    <title>{$t('games.title')} — Patrouch</title>
</svelte:head>

<section class="games-page">
    <h1 class="page-title">{$t('games.title')}</h1>
    <p class="page-subtitle">{$t('games.find_the_ai_desc')}</p>

    <div class="cards-grid">
        <button class="game-card" onclick={() => goTo('/agora?author=both' + (data.serverLocale ? '&locale=' + data.serverLocale : ''))}>
            <span class="game-card-icon">🕵️</span>
            <div class="game-card-body">
                <h2>{$t('games.find_the_ai')}</h2>
                <p>{$t('games.find_the_ai_desc')}</p>
            </div>
        </button>
        <button class="game-card" onclick={() => goTo('/games/booty')}>
            <span class="game-card-icon">🍾</span>
            <div class="game-card-body">
                <h2>{$t('games.find_the_bottle')}</h2>
                <p>{$t('games.find_the_bottle_desc')}</p>
            </div>
        </button>
    </div>
</section>

<style>
    .games-page {
        max-width: 900px;
        margin: 0 auto;
        padding: 3rem 1.5rem 6rem;
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
    .cards-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
    }
    @media (max-width: 640px) {
        .cards-grid { grid-template-columns: 1fr; }
    }
    .game-card {
        display: flex;
        align-items: flex-start;
        gap: 1.25rem;
        padding: 2rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.25s ease;
        text-align: left;
        font-family: var(--font-body);
        color: var(--fg);
        width: 100%;
    }
    .game-card:hover {
        border-color: var(--accent);
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .game-card-icon {
        font-size: 2.5rem;
        flex-shrink: 0;
    }
    .game-card-body h2 {
        font-family: var(--font-heading);
        font-size: 1.35rem;
        color: var(--accent);
        margin-bottom: 0.4rem;
    }
    .game-card-body p {
        color: var(--text-dim);
        font-size: 0.9rem;
        line-height: 1.5;
    }
</style>
