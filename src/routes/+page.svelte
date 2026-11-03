<script>
    import { t } from '#lib/i18n/index.js';
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import InkReveal from '#lib/components/InkReveal.svelte';
    import InkText from '#lib/components/InkText.svelte';
    import WordsPile from '#lib/components/WordsPile.svelte';
    import { browser } from '$app/env';

    let { data } = $props();

    // Write CTA: a short toast, then off to the studio. The ink reveal is
    // an entrance effect (label + button), not a click effect.
    let inkToast = $state(false);
    let reducedMotion = !browser || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // STAGING TRIAL — NYT-style pile of words before the sparks appear.
    // Plays once per session; reduced motion skips straight to the sparks.
    let pileWords = $derived.by(() => {
        const seen = new Set();
        const out = [];
        for (const p of data.pastPrompts || []) {
            for (const w of String(p.prompt_text || '').split(/[^\p{L}]+/u)) {
                const k = w.toLowerCase();
                if (w.length >= 5 && !seen.has(k)) { seen.add(k); out.push(w); }
            }
        }
        return out;
    });
    // Pile renders by default; the client instantly skips it for repeat
    // visits in the same session (or reduced motion) after hydration.
    let pileDone = $state(false);
    onMount(() => {
        if (reducedMotion || sessionStorage.getItem('pile_played') === '1') pileDone = true;
    });
    function finishPile() {
        try { sessionStorage.setItem('pile_played', '1'); } catch {}
        pileDone = true;
    }

    function toastToWrite() {
        if (reducedMotion) { goto('/write'); return; }
        inkToast = true;
        setTimeout(() => goto('/write'), 500);
    }

    let confirmMessage = $state('');
    $effect(() => {
        const params = page.url.searchParams;
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
                { key: 'find_the_ai', href: '/agora?author=both' + (data.serverLocale ? '&locale=' + data.serverLocale : ''), active: true },
                { key: 'portals', href: '/portals', active: true },
                { key: 'arbooty', href: '/portals/enter', active: true },
                { key: 'challenges', href: '/write', active: false },
                { key: 'weekly_challenge', href: '/write', active: false }
            ]
        },
        {
            key: 'community',
            icon: '🤝',
            items: [
                { key: 'writer_of_week', href: '/agora', active: false },
                { key: 'sprints', href: '/agora', active: false },
                { key: 'badges', href: '/profile', active: true }
            ]
        }
    ];

    // Check reduced motion preference
    const prefersReducedMotion = typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;


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
        <p class="hero-label"><InkText text={$t('pages.home.hero.label')} step={40} /></p>
        {#if data.user}
            <button class="hero-cta" onclick={toastToWrite}><InkText text={$t('pages.home.prompt.start_writing')} delay={400} step={50} /></button>
        {:else}
            <div class="auth-cta-group hero-auth">
                <a href="/login" class="hero-cta"><InkText text={$t('common.nav.login')} delay={400} step={50} /></a>
                <a href="/signup" class="hero-cta ghost"><InkText text={$t('common.nav.signup')} delay={700} step={50} /></a>
            </div>
        {/if}
    </div>
</section>

{#if inkToast}
    <div class="ink-toast" role="status">✒️ {$t('pages.home.prompt.ink_toast')}</div>
{/if}

<!-- STAGING TRIAL: words pile up where the sparks are about to appear -->
{#if data.pastPrompts?.length > 0 && !pileDone}
    <section class="prompt-teaser pile-stage">
        <div class="container">
            <WordsPile words={pileWords} onDone={finishPile} />
        </div>
    </section>
{/if}

<!-- TODAY'S PROMPT TEASER -->
{#if data.pastPrompts?.length > 0 && pileDone}
    <InkReveal>
    <section id="prompt-teaser" class="prompt-teaser">
        <div class="container">
            <span class="teaser-label">{$t('pages.home.prompt.label')}</span>
            <div class="carousel-container">
                <button
                    class="carousel-arrow carousel-arrow-left"
                    onclick={prevPrompt}
                    aria-label="Previous prompt"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    ><path d="M15 18l-6-6 6-6"></path></svg>
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

                <button
                    class="carousel-arrow carousel-arrow-right"
                    onclick={nextPrompt}
                    aria-label="Next prompt"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    ><path d="M9 18l6-6-6-6"></path></svg>
                </button>
            </div>
            <div class="carousel-dots">
                {#each data.pastPrompts as _, i}
                <span class="dot" class:active={i === currentPrompt} onclick={() => { carouselDirection = i > currentPrompt ? 'next' : 'prev'; currentPrompt = i; }}></span>
                {/each}
            </div>
        </div>
    </section>
    </InkReveal>
{/if}

<!-- WORKS -->
<section id="portfolio" class="section works-section ambient-glow">
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
            <a href="/stats" class="glass-card">
                <span class="card-icon">📊</span>
                <h3>{$t('pages.home.works.stats')}</h3>
                <p>{$t('pages.home.works.stats.desc')}</p>
            </a>
            <a href="/portals" class="glass-card">
                <span class="card-icon">🎮</span>
                <h3>{$t('pages.home.works.games')}</h3>
                <p>{$t('pages.home.works.games.desc')}</p>
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
                            <a href={item.href} class="explore-tag" class:muted={!item.active}>{$t(`pages.home.explore.${item.key}`)}</a>
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
        min-height: 24vh;
        padding: 3.5rem 0 1.5rem;
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

    .hero-cta {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--accent);
        color: var(--bg);
        border: 1px solid var(--accent);
        border-radius: 999px;
        padding: 1.15rem 3rem;
        font-family: var(--font-body);
        font-size: 1.35rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        cursor: pointer;
        text-decoration: none;
        transition: filter 0.2s, box-shadow 0.2s, transform 0.15s;
        box-shadow: 0 6px 24px rgba(201, 168, 124, 0.25);
        -webkit-tap-highlight-color: transparent;
    }
    .hero-cta:hover {
        filter: brightness(1.06);
        transform: translateY(-2px);
        box-shadow: 0 10px 32px rgba(201, 168, 124, 0.45);
    }
    .hero-cta:active {
        transform: translateY(0) scale(0.98);
        box-shadow: 0 4px 16px rgba(201, 168, 124, 0.3);
    }
    .hero-cta:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 3px;
    }
    .hero-cta.ghost {
        background: none;
        color: var(--accent);
        box-shadow: none;
    }
    .hero-auth { justify-content: center; margin-top: 0; }
    .ink-toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2000;
        background: var(--surface, #1b1e27);
        border: 1px solid var(--accent, #c9a87c);
        color: var(--accent, #c9a87c);
        padding: 0.7rem 1.4rem;
        border-radius: 999px;
        font-size: 0.95rem;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
        animation: ink-toast-in 0.35s ease-out;
    }
    @keyframes ink-toast-in {
        from { opacity: 0; transform: translateX(-50%) translateY(12px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    .hero-label {
        /* pinchepoutine.digital hero text: Outfit 900 at the same clamp,
           kept in patrouch's gold. Not uppercase — at this scale the
           letterforms carry the energy (InkText word spans wrap it). */
        font-family: var(--font-display);
        font-size: clamp(3rem, 8vw, 6rem);
        line-height: 0.95;
        font-weight: 900;
        text-wrap: balance;
        color: var(--signature);
        margin-bottom: 2rem;
    }











    @keyframes scrollLineDraw {
        from { transform: scaleY(0); }
        to { transform: scaleY(1); }
    }


    @keyframes scrollPulse {
        0%, 100% { opacity: 0.3; transform: scaleY(1); }
        50% { opacity: 1; transform: scaleY(1.2); }
    }

    /* ── Prompt Carousel ── */
    .prompt-teaser {
        padding: 4rem 0;
        text-align: center;
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
        position: relative;
        max-width: 650px;
        margin: 0 auto 1.5rem;
    }

    .carousel-viewport {
        min-height: 170px;
        margin: 0 3.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    @media (max-width: 640px) {
        .carousel-viewport { min-height: 220px; margin: 0 3rem; }
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

    .slide-in-right {
        animation: slideFromRight 0.35s ease;
    }

    .slide-in-left {
        animation: slideFromLeft 0.35s ease;
    }

    @keyframes slideFromRight {
        from { opacity: 0; transform: translateX(30px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideFromLeft {
        from { opacity: 0; transform: translateX(-30px); }
        to { opacity: 1; transform: translateX(0); }
    }

    .carousel-arrow-left,
    .carousel-arrow-right {
        position: absolute;
        top: 85px;
        transform: translateY(-50%);
        z-index: 2;
    }
    .carousel-arrow-left { left: 0; }
    .carousel-arrow-right { right: 0; }
    @media (max-width: 640px) {
        .carousel-arrow-left,
        .carousel-arrow-right { top: 110px; }
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
    .teaser-cta.secondary {
        background: transparent;
        border: 1px solid var(--accent);
        color: var(--accent);
    }
    .teaser-cta.secondary:hover {
        background: var(--accent);
        color: var(--bg);
    }
    .auth-cta-group {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
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

    .explore-tag.muted {
        opacity: 0.35;
        pointer-events: none;
    }
    .explore-tag:hover {
        border-color: var(--accent);
        color: var(--accent);
    }

    /* ── Glass Cards (make links work) ── */
    .glass-card {
        text-decoration: none;
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
    }
</style>
