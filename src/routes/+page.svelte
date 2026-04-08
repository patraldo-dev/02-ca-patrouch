<script>
    import { t } from '$lib/i18n';
    import { page } from '$app/stores';

    let { data } = $props();

    let confirmMessage = $state('');
    $effect(() => {
        const params = $page.url.searchParams;
        if (params.get('confirmed') === 'success') {
            confirmMessage = $t('newsletter.confirmed_success');
            // Clean URL
            window.history.replaceState({}, '', '/');
        } else if (params.get('confirmed') === 'already') {
            confirmMessage = $t('newsletter.confirmed_already');
            window.history.replaceState({}, '', '/');
        }
    });

    const exploreGroups = [
        {
            key: 'genres',
            icon: '📚',
            items: [
                { key: 'fiction', href: '/agora?category=fiction' },
                { key: 'poetry', href: '/agora?category=poetry' },
                { key: 'memoir', href: '/agora?category=memoir' },
                { key: 'sci-fi', href: '/agora?category=sci-fi' },
                { key: 'mystery', href: '/agora?category=mystery' },
                { key: 'romance', href: '/agora?category=romance' },
                { key: 'fantasy', href: '/agora?category=fantasy' },
                { key: 'creative-nonfiction', href: '/agora?category=creative-non-fiction' }
            ]
        },
        {
            key: 'games',
            icon: '🎮',
            items: [
                { key: 'find_the_ai', href: '/agora' },
                { key: 'challenges', href: '/write' },
                { key: 'weekly_challenge', href: '/write' }
            ]
        },
        {
            key: 'community',
            icon: '🤝',
            items: [
                { key: 'writer_of_week', href: '/agora' },
                { key: 'sprints', href: '/agora' },
                { key: 'badges', href: '/profile' }
            ]
        }
    ];

    // Check reduced motion preference
    const prefersReducedMotion = typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    // Effect 1: Letter reveal for hero tagline
    let heroTaglineEl = $state(null);
    $effect(() => {
        const el = heroTaglineEl;
        if (!el || prefersReducedMotion) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                const text = el.textContent;
                el.innerHTML = '';
                // Split by words to preserve word wrapping
                const words = text.split(' ');
                words.forEach((word, wordIndex) => {
                    const wordSpan = document.createElement('span');
                    wordSpan.style.display = 'inline-block';
                    wordSpan.style.whiteSpace = 'nowrap';
                    // Add word-breaking space between words (except last)
                    if (wordIndex > 0) {
                        const space = document.createTextNode('\u00A0');
                        el.appendChild(space);
                    }
                    [...word].forEach((char, charIndex) => {
                        const span = document.createElement('span');
                        span.textContent = char === ' ' ? '\u00A0' : char;
                        const totalDelay = (wordIndex * 3 + charIndex) * 30;
                        span.style.animationDelay = `${totalDelay}ms`;
                        span.classList.add('letter-reveal');
                        wordSpan.appendChild(span);
                    });
                    el.appendChild(wordSpan);
                });
                observer.disconnect();
            },
            { threshold: 0.5 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    });

    // Effect 3: Staggered card entrance
    let worksGridEl = $state(null);
    $effect(() => {
        const el = worksGridEl;
        if (!el || prefersReducedMotion) return;
        const cards = el.querySelectorAll('.glass-card');
        cards.forEach((card) => card.classList.add('card-hidden'));
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                cards.forEach((card, i) => {
                    card.style.animationDelay = `${i * 120}ms`;
                    card.classList.remove('card-hidden');
                    card.classList.add('card-reveal');
                });
                observer.disconnect();
            },
            { threshold: 0.15 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    });

    // Carousel state
    let currentPrompt = $state(0);
    let carouselDirection = $state('next');

    function nextPrompt() {
        if (data.pastPrompts.length === 0) return;
        carouselDirection = 'next';
        currentPrompt = (currentPrompt + 1) % data.pastPrompts.length;
    }
    function prevPrompt() {
        if (data.pastPrompts.length === 0) return;
        carouselDirection = 'prev';
        currentPrompt = (currentPrompt - 1 + data.pastPrompts.length) % data.pastPrompts.length;
    }

    // Swipe support
    let touchStartX = $state(0);
    let touchEndX = $state(0);
    function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
    function handleTouchEnd(e) {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            diff > 0 ? nextPrompt() : prevPrompt();
        }
    }
</script>

<svelte:head>
    <title>{$t('pages.home.title')}</title>
</svelte:head>

{#if confirmMessage}
    <div class="confirm-toast">
        <span>{confirmMessage}</span>
    </div>
{/if}

<!-- HERO -->
<section class="hero">
    <div class="hero-glow"></div>
    <div class="container hero-content">
        <p class="hero-label">{$t('pages.home.hero.label')}</p>
        <h1 class="hero-name">
            <span class="hero-first">Christophe R</span>
            <span class="hero-last">Patraldo</span>
        </h1>
        <p class="hero-tagline" bind:this={heroTaglineEl}>{$t('pages.home.hero.tagline')}</p>
        <a href={data.pastPrompts?.length > 0 ? '#prompt-teaser' : '#portfolio'} class="hero-scroll" aria-label="Scroll to content">
            <div class="scroll-line"></div>
        </a>
    </div>
</section>

<!-- TODAY'S PROMPT TEASER -->
{#if data.pastPrompts?.length > 0}
<section id="prompt-teaser" class="prompt-teaser">
    <div class="container">
        <span class="teaser-label">{$t('pages.home.prompt.label')}</span>
        <div class="carousel-container">
            <button class="carousel-arrow carousel-arrow-left" onclick={prevPrompt} aria-label="Previous prompt">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div class="carousel-viewport" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
                {#each data.pastPrompts as prompt, i}
                    {#if i === currentPrompt}
                        <blockquote class="carousel-slide" class:slide-in-right={carouselDirection === 'next'} class:slide-in-left={carouselDirection === 'prev'}>
                            <span class="slide-date">{prompt.dateLabel}</span>
                            <p>{prompt.prompt_text}</p>
                        </blockquote>
                    {/if}
                {/each}
            </div>
            <button class="carousel-arrow carousel-arrow-right" onclick={nextPrompt} aria-label="Next prompt">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
        </div>
        <div class="carousel-dots">
            {#each data.pastPrompts as _, i}
                <span class="dot" class:active={i === currentPrompt} onclick={() => { carouselDirection = i > currentPrompt ? 'next' : 'prev'; currentPrompt = i; }}></span>
            {/each}
        </div>
        {#if data.user}
            <a href="/write" class="teaser-cta">{$t('pages.home.prompt.start_writing')}</a>
        {:else}
            <a href="/signup" class="teaser-cta">{$t('pages.home.prompt.cta_guest')}</a>
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
        <div class="works-grid" bind:this={worksGridEl}>
            <a href="/write" class="glass-card">
                <span class="card-icon">✨</span>
                <h3>{$t('pages.home.works.prompts')}</h3>
                <p>{$t('pages.home.works.prompts.desc')}</p>
            </a>
            <a href="/agora" class="glass-card">
                <span class="card-icon">🏛️</span>
                <h3>{$t('pages.home.works.agora')}</h3>
                <p>{$t('pages.home.works.agora.desc')}</p>
            </a>
            <a href="/profile" class="glass-card">
                <span class="card-icon">📊</span>
                <h3>{$t('pages.home.works.stats')}</h3>
                <p>{$t('pages.home.works.stats.desc')}</p>
            </a>
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

<!-- EXPLORE -->
<section class="section explore-section">
    <div class="container">
        <div class="section-label fade-in">{$t('pages.home.explore.label')}</div>
        <h2 class="fade-in">{$t('pages.home.explore.heading')}</h2>
        <div class="explore-grid fade-in">
            {#each exploreGroups as group}
                <div class="explore-group">
                    <h3 class="explore-group-title"><span class="explore-group-icon">{group.icon}</span> {$t(`pages.home.explore.${group.key}`)}</h3>
                    <div class="explore-tags">
                        {#each group.items as item}
                            <a href={item.href} class="explore-tag">{$t(`pages.home.explore.${item.key}`)}</a>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>

<style>
    .confirm-toast {
        position: fixed;
        top: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        background: var(--accent);
        color: var(--bg);
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease;
    }
    @keyframes slideDown {
        from { opacity: 0; transform: translateX(-50%) translateY(-1rem); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
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
        line-height: 1.7;
        max-width: 600px;
        margin: 0 auto;
        color: var(--text-dim);
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: none;
        -webkit-hyphens: none;
        text-wrap: pretty;
    }

    :lang(fr) .hero-tagline {
        line-height: 1.65;
    }

    :lang(es) .hero-tagline {
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
        transform-origin: top;
        animation: scrollLineDraw 1.2s ease-out forwards, scrollPulse 2s ease-in-out 1.2s infinite;
        transform: scaleY(0);
        transition: height 0.3s ease;
    }

    @keyframes scrollLineDraw {
        from { transform: scaleY(0); }
        to { transform: scaleY(1); }
    }

    .hero-scroll:hover .scroll-line {
        height: 88px;
    }

    @keyframes scrollPulse {
        0%, 100% { opacity: 0.3; transform: scaleY(1); }
        50% { opacity: 1; transform: scaleY(1.2); }
    }

    /* ── Prompt Carousel ── */
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

    .carousel-container {
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 650px;
        margin: 0 auto 1.5rem;
    }

    .carousel-viewport {
        flex: 1;
        min-height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
    }

    .carousel-slide {
        text-align: center;
        width: 100%;
    }

    .carousel-slide p {
        font-family: var(--font-heading);
        font-size: clamp(1.15rem, 2.5vw, 1.5rem);
        font-weight: 300;
        font-style: italic;
        color: var(--text);
        line-height: 1.6;
    }

    .slide-date {
        display: inline-block;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-muted);
        background: rgba(255,255,255,0.05);
        padding: 0.15rem 0.6rem;
        border-radius: 999px;
        margin-bottom: 1rem;
    }

    .slide-in-right { animation: slideFromRight 0.35s ease; }
    .slide-in-left { animation: slideFromLeft 0.35s ease; }

    @keyframes slideFromRight {
        from { opacity: 0; transform: translateX(30px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideFromLeft {
        from { opacity: 0; transform: translateX(-30px); }
        to { opacity: 1; transform: translateX(0); }
    }

    .carousel-arrow {
        background: none;
        border: 1px solid var(--border);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--text-muted);
        transition: all 0.2s;
        flex-shrink: 0;
    }
    .carousel-arrow:hover { border-color: var(--accent); color: var(--accent); }

    .carousel-dots {
        display: flex;
        justify-content: center;
        gap: 0.4rem;
        margin-bottom: 2rem;
    }
    .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--border);
        cursor: pointer;
        transition: all 0.2s;
    }
    .dot.active { background: var(--accent); transform: scale(1.4); }

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

    /* ── Explore ── */
    .explore-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
        margin-top: 2rem;
    }

    .explore-group-title {
        font-family: var(--font-heading);
        font-size: 1.1rem;
        font-weight: 400;
        color: var(--text);
        margin: 0 0 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .explore-group-icon { font-size: 1.25rem; }

    .explore-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .explore-tag {
        display: inline-block;
        padding: 0.5rem 1rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 100px;
        color: var(--text-dim);
        font-size: 0.85rem;
        text-decoration: none;
        transition: all 0.2s;
    }

    .explore-tag:hover {
        border-color: var(--accent);
        color: var(--accent);
    }

    /* ── Glass Cards (make links work) ── */
    .glass-card {
        text-decoration: none;
    }
        font-weight: 500;
        color: var(--text-dim);
    }

    @media (min-width: 640px) {
        .works-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (min-width: 900px) {
        .works-grid { grid-template-columns: repeat(4, 1fr); }
    }

    /* ── Effect 1: Letter reveal ── */
    .letter-reveal {
        display: inline-block;
        opacity: 0;
        animation: letterReveal 0.5s ease forwards;
    }

    @keyframes letterReveal {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* ── Effect 3: Card stagger entrance ── */
    .card-hidden {
        opacity: 0;
        transform: translateY(24px);
    }

    .card-reveal {
        animation: cardSlideUp 0.6s ease forwards;
    }

    @keyframes cardSlideUp {
        from { opacity: 0; transform: translateY(24px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
        .letter-reveal,
        .card-reveal,
        .slide-in-right,
        .slide-in-left {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
        }
        .scroll-line {
            animation: none !important;
            transform: scaleY(1) !important;
        }
    }
</style>
