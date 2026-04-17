<script>
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
        <button class="game-card" onclick={() => goTo('/agora?game=1')}>
            <div class="card-icon">🤖</div>
            <h2>{$t('games.find_the_ai')}</h2>
            <p>{$t('games.find_the_ai_desc')}</p>
        </button>

        <button class="game-card" onclick={() => goTo('/games/bottles')}>
            <div class="card-icon">🫙</div>
            <h2>{$t('games.find_the_bottle')}</h2>
            <p>{$t('games.find_the_bottle_desc')}</p>
        </button>
    </div>
</section>

<style>
    .games-page {
        max-width: 800px;
        margin: 0 auto;
        padding: 4rem 1.5rem 6rem;
    }
    .page-title {
        font-family: var(--font-heading);
        font-size: 3rem;
        color: var(--fg);
        margin-bottom: 0.5rem;
        letter-spacing: -0.02em;
    }
    .page-subtitle {
        color: var(--muted);
        font-size: 1.1rem;
        margin-bottom: 3rem;
        font-style: italic;
    }
    .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
    }
    .game-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 2rem;
        text-align: left;
        cursor: pointer;
        transition: border-color 0.2s, transform 0.2s;
        color: var(--fg);
    }
    .game-card:hover {
        border-color: var(--accent);
        transform: translateY(-2px);
    }
    .card-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
    }
    .game-card h2 {
        font-family: var(--font-heading);
        font-size: 1.4rem;
        margin-bottom: 0.5rem;
        color: var(--accent);
    }
    .game-card p {
        color: var(--muted);
        font-size: 0.95rem;
        line-height: 1.5;
    }
</style>
