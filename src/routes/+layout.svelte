<!-- src/routes/+layout.svelte -->
<script>
    import '../app.css';
    import { browser } from '$app/environment';
    import { t, locale, setLocale } from '$lib/i18n';
    import { beforeNavigate } from '$app/navigation';
    import { page } from '$app/stores';
    import NewsletterForm from '$lib/components/NewsletterForm.svelte';
    import LanguageSwitcherDesktop from '$lib/components/LanguageSwitcherDesktop.svelte';
    import LanguageSwitcherMobile from '$lib/components/LanguageSwitcherMobile.svelte';

    /** @type {import('./$types').LayoutData} */
    export let data;

    beforeNavigate(() => { mobileMenuOpen = false; });

    let mobileMenuOpen = false;
    let scrolled = false;
    let scrollProgress = 0;

    function toggleMobileMenu() {
        mobileMenuOpen = !mobileMenuOpen;
    }

    function switchLanguage(lang) {
        setLocale(lang);
        if (browser) localStorage.setItem('preferredLanguage', lang);
    }

    async function handleLogout() {
        if (!browser) return;
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            if (response.ok) window.location.href = '/';
        } catch (err) {
            console.error('Logout failed:', err);
            window.location.href = '/';
        }
    }

    function onScroll() {
        scrolled = window.scrollY > 20;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        scrollProgress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
    }

    function initObserver() {
        if (!browser) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );
        document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));
    }

    import { onMount } from 'svelte';
    onMount(() => {
        if (browser) {
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
            // Delay observer to allow DOM to settle
            setTimeout(initObserver, 100);
        }
        return () => {
            if (browser) window.removeEventListener('scroll', onScroll);
        };
    });
</script>

<svelte:head>
    <title>Christophe R Patraldo — patrouch.ca</title>
</svelte:head>

<!-- Scroll Progress Bar -->
<div class="scroll-progress" style="width: {scrollProgress}%"></div>

<div class="app-layout">
    <!-- NAVBAR -->
    <header class="navbar" class:scrolled>
        <div class="container nav-container">
            <a href="/" class="logo" aria-label="Home">
                <span class="logo-initials">C. R</span>
                <span class="logo-name">Patraldo</span>
            </a>

            <!-- Desktop Nav -->
            <nav class="desktop-nav" aria-label="Main navigation">
                <a href="/" class:active={$page.url.pathname === '/'}>{$t('common.nav.home')}</a>
                <a href="/books" class:active={$page.url.pathname.startsWith('/books')}>{$t('common.nav.works')}</a>
                <a href="/about" class:active={$page.url.pathname.startsWith('/about')}>{$t('common.nav.about')}</a>
                <a href="/blog" class:active={$page.url.pathname.startsWith('/blog')}>{$t('common.nav.blog')}</a>
                <a href="/agora" class:active={$page.url.pathname.startsWith('/agora')}>{$t('common.nav.agora')}</a>
                <a href="/write" class:active={$page.url.pathname.startsWith('/write')}>{$t('common.nav.write')}</a>
            </nav>

            <!-- Desktop: Lang + Auth -->
            <div class="nav-actions">
                <LanguageSwitcherDesktop />
                <div class="auth-actions">
                    {#if data?.user}
                        <span class="welcome">{$t('common.nav.welcome')}, <strong>{data.user.username}</strong></span>
                        <a href="/admin" class="btn-glass">{$t('common.nav.admin')}</a>
                        <button on:click={handleLogout} class="btn-glass">{$t('common.nav.logout')}</button>
                    {:else}
                        <a href="/login" class="btn-glass">{$t('common.nav.login')}</a>
                        <a href="/signup" class="btn-accent">{$t('common.nav.signup')}</a>
                    {/if}
                </div>
            </div>

            <!-- Mobile Toggle -->
            <button
                class="mobile-toggle"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
                on:click={toggleMobileMenu}
            >
                <span class="hamburger" class:open={mobileMenuOpen}>
                    <span></span><span></span><span></span>
                </span>
            </button>
        </div>
    </header>

    <!-- Mobile Menu (outside header to avoid z-index/blur conflicts) -->
    {#if mobileMenuOpen}
        <div class="mobile-menu" role="dialog" aria-modal="true">
            <nav class="mobile-nav">
                <a href="/" on:click={toggleMobileMenu}>{$t('common.nav.home')}</a>
                <a href="/books" on:click={toggleMobileMenu}>{$t('common.nav.works')}</a>
                <a href="/about" on:click={toggleMobileMenu}>{$t('common.nav.about')}</a>
                <a href="/blog" on:click={toggleMobileMenu}>{$t('common.nav.blog')}</a>
                <a href="/reviews" on:click={toggleMobileMenu}>{$t('common.nav.reviews')}</a>
                <a href="/agora" on:click={toggleMobileMenu}>{$t('common.nav.agora')}</a>
                <a href="/write" on:click={toggleMobileMenu}>{$t('common.nav.write')}</a>
            </nav>
            <div class="mobile-lang">
                <LanguageSwitcherMobile />
            </div>
            <div class="mobile-auth">
                {#if data?.user}
                    <p class="welcome-mobile">{$t('common.nav.welcome')}, <strong>{data.user.username}</strong></p>
                    <a href="/admin" on:click={toggleMobileMenu} class="btn-glass block">{$t('common.nav.admin')}</a>
                    <button on:click={() => { toggleMobileMenu(); handleLogout(); }} class="btn-glass block">{$t('common.nav.logout')}</button>
                {:else}
                    <a href="/login" on:click={toggleMobileMenu} class="btn-glass block">{$t('common.nav.login')}</a>
                    <a href="/signup" on:click={toggleMobileMenu} class="btn-accent block">{$t('common.nav.signup')}</a>
                {/if}
            </div>
        </div>
    {/if}

    <!-- MAIN -->
    <main class="main-content">
        <slot />
    </main>

    <!-- FOOTER -->
    <footer id="footer" class="site-footer">
        <div class="container">
            <div class="newsletter-section">
                <NewsletterForm />
            </div>
            <div class="footer-bottom">
                <p class="footer-tagline">{$t('common.footer.tagline')}</p>
                <p class="footer-copy">© {new Date().getFullYear()} Christophe R Patraldo — <a href="https://patrouch.ca">patrouch.ca</a></p>
                <p class="footer-built">{@html $t('common.footer.built_by')}</p>
                <p class="footer-links">
                    <a href="/privacy">{$t('common.footer.privacy')}</a>
                    <span class="footer-sep">·</span>
                    <a href="/terms">{$t('common.footer.terms')}</a>
                </p>
            </div>
        </div>
    </footer>
</div>

<style>
    .app-layout {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    /* ── Navbar ── */
    .navbar {
        position: sticky;
        top: 0;
        z-index: var(--z-nav);
        padding: 1rem 0;
        transition: background 0.3s, backdrop-filter 0.3s, border-color 0.3s;
        border-bottom: 1px solid transparent;
    }

    .navbar.scrolled {
        background: rgba(9, 9, 11, 0.8);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-bottom-color: var(--border);
    }

    .nav-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
    }

    .logo {
        display: flex;
        align-items: baseline;
        gap: 0.4rem;
        text-decoration: none;
        color: var(--text);
        font-family: var(--font-heading);
        font-weight: 300;
        font-size: 1.35rem;
        letter-spacing: 0.02em;
    }

    .logo-initials {
        color: var(--accent);
        font-weight: 600;
        font-style: italic;
    }

    .logo-name {
        color: var(--text-dim);
    }

    .logo:hover .logo-name { color: var(--text); }

    .desktop-nav {
        display: none;
        gap: 2rem;
        align-items: center;
    }

    .desktop-nav a {
        font-family: var(--font-body);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--text-muted);
        text-decoration: none;
        padding: 0.25rem 0;
        border-bottom: 1px solid transparent;
        transition: color 0.2s, border-color 0.2s;
    }

    .desktop-nav a:hover,
    .desktop-nav a.active {
        color: var(--accent);
        border-bottom-color: var(--accent);
    }

    .nav-actions {
        display: none;
        align-items: center;
        gap: 1rem;
    }

    .auth-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .welcome {
        color: var(--text-dim);
        font-size: 0.8rem;
        white-space: nowrap;
    }

    .welcome strong { color: var(--text); }

    .btn-glass {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.5rem 1rem;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s;
    }

    .btn-glass:hover {
        border-color: var(--accent);
        color: var(--accent);
    }

    .btn-accent {
        background: var(--accent);
        border: none;
        border-radius: var(--radius);
        padding: 0.5rem 1rem;
        color: var(--bg);
        font-family: var(--font-body);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: background 0.2s;
    }

    .btn-accent:hover { background: var(--accent-hover); }

    .block { display: block; width: 100%; text-align: center; }

    /* ── Mobile Toggle ── */
    .mobile-toggle {
        display: flex;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.5rem;
    }

    .hamburger {
        display: flex;
        flex-direction: column;
        gap: 5px;
        width: 24px;
    }

    .hamburger span {
        display: block;
        height: 2px;
        background: var(--text-dim);
        border-radius: 2px;
        transition: all 0.3s;
    }

    .hamburger.open span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
    .hamburger.open span:nth-child(2) { opacity: 0; }
    .hamburger.open span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

    /* ── Mobile Menu ── */
    .mobile-menu {
        position: fixed;
        inset: 0;
        background: var(--bg);
        z-index: var(--z-nav);
        display: flex;
        flex-direction: column;
        padding: 2rem 1.5rem;
        gap: 2rem;
        overflow-y: auto;
    }

    .mobile-nav {
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    .mobile-nav a {
        font-family: var(--font-heading);
        font-size: 1.75rem;
        font-weight: 300;
        color: var(--text-dim);
        text-decoration: none;
        padding: 1rem 0;
        border-bottom: 1px solid var(--border);
        transition: color 0.2s;
    }

    .mobile-nav a:hover { color: var(--accent); }
    .mobile-nav a.active { color: var(--accent); }

    .mobile-lang {
        display: flex;
        justify-content: center;
        padding: 1rem 0;
    }

    .mobile-auth {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: auto;
    }

    .welcome-mobile {
        color: var(--text-dim);
        font-size: 0.9rem;
        text-align: center;
        padding: 1rem 0;
    }

    /* ── Footer ── */
    .site-footer {
        background: var(--surface);
        border-top: 1px solid var(--border);
        padding: 4rem 0 2rem;
        margin-top: auto;
    }

    .newsletter-section {
        margin-bottom: 3rem;
    }

    .footer-bottom {
        text-align: center;
    }

    .footer-tagline {
        font-family: var(--font-heading);
        font-size: 1rem;
        font-style: italic;
        color: var(--text-dim);
        margin-bottom: 0.5rem;
    }

    .footer-copy {
        color: var(--text-muted);
        font-size: 0.85rem;
        margin-bottom: 0.5rem;
    }

    .footer-copy a { color: var(--accent); }

    .footer-built {
        color: var(--text-muted);
        font-size: 0.8rem;
        margin-bottom: 0.5rem;
    }

    .footer-built a { color: var(--accent); text-decoration: none; }
    .footer-built a:hover { text-decoration: underline; }

    .footer-links {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        font-size: 0.85rem;
    }

    .footer-links a { color: var(--text-muted); }
    .footer-links a:hover { color: var(--accent); }
    .footer-sep { color: var(--text-muted); }

    .main-content { flex: 1; }

    /* ── Responsive ── */
    @media (min-width: 769px) {
        .mobile-toggle,
        .mobile-menu { display: none !important; }

        .desktop-nav { display: flex; }
        .nav-actions { display: flex; }
    }

    @media (max-width: 768px) {
        .desktop-nav,
        .nav-actions { display: none !important; }
    }
</style>
