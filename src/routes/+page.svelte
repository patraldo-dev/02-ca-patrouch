<script>
    import { t } from '$lib/i18n';

    let { data } = $props();

    const categories = [
        { key: 'prompts', icon: '✨' },
        { key: 'agora', icon: '🏛️' },
        { key: 'writing', icon: '📝' },
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
        <a href="#prompt-teaser" class="hero-scroll">
            <div class="scroll-line"></div>
        </a>
    </div>
</section>

<!-- TODAY'S PROMPT TEASER -->
{#if data.communityPrompt}
<section id="prompt-teaser" class="prompt-teaser">
    <div class="container">
        <span class="teaser-label">{$t('write.dashboard.community_prompt')}</span>
        <blockquote class="teaser-quote">
            <p>{data.communityPrompt.prompt_text}</p>
        </blockquote>
        {#if data.user}
            <a href="/write" class="teaser-cta">{$t('pages.home.prompt.start_writing')}</a>
        {:else}
            <a href="/login" class="teaser-cta">{$t('pages.home.prompt.sign_in')}</a>
        {/if}
    </div>
</section>
{/if}

<!-- WORKS -->
<section id="portfolio" class="section works-section">
    <div class="container">
        <div class="section-label fade-in">{$t('pages.home.works.label')}</div>
        <h2 class="fade-in">{$t('pages.home.works.heading')}</h2>
        <p class="section-desc fade-in">{$t('pages.home.works.description')}</p>
        <div class="works-grid">
            <article class="glass-card fade-in">
                <span class="card-icon">✨</span>
                <h3>{$t('pages.home.works.prompts')}</h3>
                <p>{$t('pages.home.works.prompts.desc')}</p>
            </article>
            <article class="glass-card fade-in">
                <span class="card-icon">🏛️</span>
                <h3>{$t('pages.home.works.agora')}</h3>
                <p>{$t('pages.home.works.agora.desc')}</p>
            </article>
            <article class="glass-card fade-in">
                <span class="card-icon">📊</span>
                <h3>{$t('pages.home.works.stats')}</h3>
                <p>{$t('pages.home.works.stats.desc')}</p>
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
        min-height: 55vh;
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
        margin-top: 3rem;
        display: flex;
        justify-content: center;
        text-decoration: none;
        cursor: pointer;
        padding: 2rem;
        border-radius: 50%;
        position: relative;
        overflow: visible;
        -webkit-tap-highlight-color: transparent;
    }

    .hero-scroll::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(201, 168, 124, 0.15);
        transform: translate(-50%, -50%);
        transition: width 0.5s ease, height 0.5s ease, opacity 0.5s ease;
        opacity: 0;
        pointer-events: none;
    }

    .hero-scroll:active::after {
        width: 80px;
        height: 80px;
        opacity: 1;
        transition: none;
    }

    .scroll-line {
        width: 2px;
        height: 72px;
        background: linear-gradient(to bottom, var(--accent), transparent);
        animation: scrollPulse 2s ease-in-out infinite;
        transition: height 0.3s ease;
    }

    .hero-scroll:hover .scroll-line {
        height: 88px;
    }

    @keyframes scrollPulse {
        0%, 100% { opacity: 0.3; transform: scaleY(1); }
        50% { opacity: 1; transform: scaleY(1.2); }
    }

    /* ── Prompt Teaser ── */
    .prompt-teaser {
        padding: 4rem 0;
        text-align: center;
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
    }

    .teaser-label {
        display: inline-block;
        font-family: var(--font-body);
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--accent);
        margin-bottom: 2rem;
    }

    .teaser-quote {
        max-width: 600px;
        margin: 0 auto 2rem;
    }

    .teaser-quote p {
        font-family: var(--font-heading);
        font-size: clamp(1.2rem, 2.5vw, 1.6rem);
        font-weight: 300;
        font-style: italic;
        color: var(--text);
        line-height: 1.6;
    }

    .teaser-cta {
        display: inline-block;
        padding: 0.75rem 2.5rem;
        background: var(--accent);
        color: var(--bg);
        font-weight: 600;
        font-size: 0.9rem;
        letter-spacing: 0.05em;
        border-radius: var(--radius);
        text-decoration: none;
        transition: background 0.2s;
    }

    .teaser-cta:hover {
        background: var(--accent-hover);
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
