<script>
    import { t } from '$lib/i18n';
    import { onMount } from 'svelte';

    export let data;

    // Categories data
    const categories = [
        { key: 'featureFilms', icon: '🎬' },
        { key: 'shortFilms', icon: '🎞️' },
        { key: 'novels', icon: '📖' },
        { key: 'shortStories', icon: '✍️' },
        { key: 'sciFi', icon: '🚀' }
    ];
</script>

<svelte:head>
    <title>{$t('pages.home.title')}</title>
</svelte:head>

<!-- HERO -->
<section class="hero">
    <div class="hero-glow"></div>
    <div class="container hero-content">
        <p class="hero-label">{$t('pages.home.hero.label')}</p>
        <h1 class="hero-name">
            <span class="hero-first">Christophe R</span>
            <span class="hero-last">Patraldo</span>
        </h1>
        <p class="hero-tagline">{$t('pages.home.hero.tagline')}</p>
        <div class="hero-scroll">
            <div class="scroll-line"></div>
        </div>
    </div>
</section>

<!-- WORKS -->
<section class="section works-section">
    <div class="container">
        <div class="section-label fade-in">{$t('pages.home.works.label')}</div>
        <h2 class="fade-in">{$t('pages.home.works.heading')}</h2>
        <p class="section-desc fade-in">{$t('pages.home.works.description')}</p>
        <div class="works-grid">
            <article class="glass-card fade-in">
                <span class="card-icon">🎬</span>
                <h3>{$t('pages.home.works.filmscripts')}</h3>
                <p>{$t('pages.home.works.filmscripts.desc')}</p>
            </article>
            <article class="glass-card fade-in">
                <span class="card-icon">📖</span>
                <h3>{$t('pages.home.works.novels')}</h3>
                <p>{$t('pages.home.works.novels.desc')}</p>
            </article>
            <article class="glass-card fade-in">
                <span class="card-icon">✍️</span>
                <h3>{$t('pages.home.works.shortStories')}</h3>
                <p>{$t('pages.home.works.shortStories.desc')}</p>
            </article>
            <article class="glass-card fade-in">
                <span class="card-icon">🔮</span>
                <h3>{$t('pages.home.works.comingSoon')}</h3>
                <p>{$t('pages.home.works.comingSoon.desc')}</p>
            </article>
        </div>
    </div>
</section>

<!-- ABOUT -->
<section class="section about-section">
    <div class="container">
        <div class="section-label fade-in">{$t('pages.home.about.label')}</div>
        <h2 class="fade-in">{$t('pages.home.about.heading')}</h2>
        <div class="about-content fade-in">
            <p>{$t('pages.home.about.paragraph1')}</p>
            <p>{$t('pages.home.about.paragraph2')}</p>
        </div>
    </div>
</section>

<!-- CATEGORIES -->
<section class="section categories-section">
    <div class="container">
        <div class="section-label fade-in">{$t('pages.home.categories.label')}</div>
        <h2 class="fade-in">{$t('pages.home.categories.heading')}</h2>
        <div class="categories-grid fade-in">
            {#each categories as cat}
                <div class="category-item">
                    <span class="category-icon">{cat.icon}</span>
                    <span class="category-name">{$t(`pages.home.categories.${cat.key}`)}</span>
                </div>
            {/each}
        </div>
    </div>
</section>

<style>
    /* ── Hero ── */
    .hero {
        position: relative;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        overflow: hidden;
    }

    .hero-glow {
        position: absolute;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(201, 168, 124, 0.08) 0%, transparent 70%);
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
    }

    .hero-content {
        position: relative;
        z-index: 1;
    }

    .hero-label {
        font-family: var(--font-body);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--accent);
        margin-bottom: 1.5rem;
    }

    .hero-name {
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    .hero-first {
        font-size: clamp(2.5rem, 6vw, 5rem);
        font-weight: 300;
        color: var(--text);
        line-height: 1.1;
    }

    .hero-last {
        font-size: clamp(3rem, 8vw, 7rem);
        font-weight: 300;
        font-style: italic;
        color: var(--accent);
        line-height: 1;
    }

    .hero-tagline {
        font-size: clamp(1rem, 2vw, 1.25rem);
        color: var(--text-dim);
        max-width: 500px;
        margin: 0 auto;
        line-height: 1.7;
    }

    .hero-scroll {
        margin-top: 4rem;
        display: flex;
        justify-content: center;
    }

    .scroll-line {
        width: 1px;
        height: 60px;
        background: linear-gradient(to bottom, var(--accent), transparent);
        animation: scrollPulse 2s ease-in-out infinite;
    }

    @keyframes scrollPulse {
        0%, 100% { opacity: 0.3; transform: scaleY(1); }
        50% { opacity: 1; transform: scaleY(1.2); }
    }

    /* ── Sections ── */
    .section {
        padding: 6rem 0;
    }

    .section-desc {
        color: var(--text-dim);
        max-width: 600px;
        margin-top: 0.75rem;
        margin-bottom: 3rem;
        line-height: 1.7;
    }

    /* ── Works Grid ── */
    .works-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }

    @media (min-width: 640px) {
        .works-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (min-width: 900px) {
        .works-grid { grid-template-columns: repeat(4, 1fr); }
    }

    .card-icon {
        font-size: 2rem;
        display: block;
        margin-bottom: 1rem;
    }

    .glass-card h3 {
        font-size: 1.25rem;
        margin-bottom: 0.75rem;
        color: var(--text);
    }

    .glass-card p {
        color: var(--text-muted);
        font-size: 0.9rem;
        line-height: 1.6;
    }

    /* ── About ── */
    .about-content {
        max-width: 700px;
        margin-top: 2rem;
    }

    .about-content p {
        color: var(--text-dim);
        font-size: 1.05rem;
        line-height: 1.8;
        margin-bottom: 1.5rem;
    }

    /* ── Categories ── */
    .categories-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 2rem;
    }

    .category-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 100px;
        padding: 0.75rem 1.5rem;
        transition: border-color 0.2s;
    }

    .category-item:hover {
        border-color: var(--accent);
    }

    .category-icon {
        font-size: 1.25rem;
    }

    .category-name {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-dim);
    }

    @media (min-width: 640px) {
        .works-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (min-width: 900px) {
        .works-grid { grid-template-columns: repeat(4, 1fr); }
    }
</style>
