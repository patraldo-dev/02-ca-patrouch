<!-- src/routes/+layout.svelte -->
<script>
    import '../app.css';
    import { browser } from '$app/environment';
    import { t, locale, setLocale } from '$lib/i18n';
    import { beforeNavigate } from '$app/navigation';
    import SearchModal from '$lib/components/SearchModal.svelte';
    import OnboardingFlow from '$lib/components/OnboardingFlow.svelte';
    import { page } from '$app/stores';
    import { track } from '$lib/analytics';
    import NewsletterForm from '$lib/components/NewsletterForm.svelte';
    import LanguageSwitcherDesktop from '$lib/components/LanguageSwitcherDesktop.svelte';
    import LanguageSwitcherMobile from '$lib/components/LanguageSwitcherMobile.svelte';
    import { getTheme, setTheme } from '$lib/theme.js';

    // Track page views on navigation
    if (browser) {
        $effect(() => {
            document.documentElement.lang = $locale || 'en';
        });
        $effect(() => {
            const path = $page.url.pathname;
            if (path) track('page_view', path);
        });
    }

    /** @type {import('./$types').LayoutData} */
    let { data, children } = $props();

    beforeNavigate(() => { mobileMenuOpen = false; tallerOpen = false; });

    let mobileMenuOpen = $state(false);
    let currentTheme = $state(getTheme());

    function toggleTheme() {
        const next = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        currentTheme = next;
    }
    let searchOpen = $state(false);
    let profilesOpen = $state(false);
    let tallerOpen = $state(false);
    let helpOpen = $state(false);
    let profiles = $state([]);
    let activeProfileId = $state(data.activeProfile?.id || null);
    let activeDisplayName = $state(data.activeProfile?.display_name || data.user?.username || '');
    let profileLoading = $state(false);
    let showOnboarding = $state(false);
    let onboardingDismissed = $state(false);

    async function loadProfiles() {
        try {
            const res = await fetch('/api/profiles');
            if (res.ok) {
                const data = await res.json();
                profiles = data.profiles || [];
            }
        } catch {}
    }

    async function switchProfile(id) {
        profileLoading = true;
        try {
            const res = await fetch(`/api/profiles/${id}/switch`, { method: 'POST' });
            if (res.ok) {
                const d = await res.json();
                activeProfileId = id;
                activeDisplayName = d.activeProfile.display_name;
                profiles = profiles.map(p => ({ ...p, is_active: p.id === id ? 1 : 0 }));
                profilesOpen = false;
                goto('?t=' + Date.now()); // refresh data
            }
        } catch {} finally {
            profileLoading = false;
        }
    }

    // Load profiles on mount if user
    $effect(() => {
        if (data?.user) loadProfiles();
    });
    let scrolled = $state(false);
    let scrollProgress = $state(0);

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
            setTimeout(initObserver, 100);
            // Check onboarding for new users
            if (data?.user && !data.onboarding_completed && !onboardingDismissed) {
                showOnboarding = true;
            }
        }
        return () => {
            if (browser) window.removeEventListener('scroll', onScroll);
        };
    });
</script>

<svelte:head>
    <title>Christophe R Patraldo — patrouch.ca</title>
    <html lang={$locale || 'en'} />
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
                <a href="/agora" class:active={$page.url.pathname.startsWith('/agora')}>{$t('common.nav.agora')}</a>
                <a href="/write" class:active={$page.url.pathname.startsWith('/write')}>{$t('common.nav.write')}</a>
                {#if data?.user?.role === 'admin' || data?.user?.role === 'member'}
                <div class="taller-dropdown">
                    <button class="taller-trigger" onclick={() => tallerOpen = !tallerOpen}>{$t('common.nav.taller')}</button>
                    {#if tallerOpen}
                    <div class="taller-menu">
                        <a href="/evaluate" onclick={() => tallerOpen = false}>{$t('common.nav.evaluate')}</a>
                        <a href="/refine" onclick={() => tallerOpen = false}>{$t('common.nav.refine')}</a>
                        <a href="/audio" onclick={() => tallerOpen = false}>{$t('common.nav.audio')}</a>
                    </div>
                    {/if}
                </div>
                {/if}
            </nav>

            <!-- Desktop: Lang + Auth -->
            <div class="nav-actions">
                <button class="theme-toggle" onclick={toggleTheme} aria-label={currentTheme === 'dark' ? $t('common.theme_light') : $t('common.theme_dark')} title={currentTheme === 'dark' ? $t('common.theme_light') : $t('common.theme_dark')}>
                    {#if currentTheme === 'dark'}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    {:else}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    {/if}
                </button>
                <button class="help-btn" onclick={() => helpOpen = !helpOpen} title="{$t('common.help')}">?</button>
                <LanguageSwitcherDesktop serverLocale={data.serverLocale} />
                <div class="auth-actions">
                    {#if data?.user}
                        {#if data.user?.role === 'admin'}
                        <div class="profile-switcher">
                            <button class="profile-trigger" onclick={() => profilesOpen = !profilesOpen}>
                                <span class="profile-avatar">{(activeDisplayName || '?')[0].toUpperCase()}</span>
                                <span class="profile-name">{activeDisplayName}</span>
                                <span class="admin-badge">admin</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                            </button>
                            {#if profilesOpen}
                                <div class="profile-dropdown">
                                    {#each profiles as p}
                                        <button class="profile-option" class:active={p.is_active} onclick={() => switchProfile(p.id)} disabled={profileLoading}>
                                            <span class="profile-option-avatar">{p.display_name[0].toUpperCase()}</span>
                                            <span class="profile-option-info">
                                                <span class="profile-option-name">{p.display_name}</span>
                                                <span class="profile-option-locale">{p.locale?.toUpperCase()}</span>
                                            </span>
                                            {#if p.is_primary}
                                                <span class="profile-primary-dot" title="Primary"></span>
                                            {/if}
                                        </button>
                                    {/each}
                                    <div class="profile-divider"></div>
                                    <a href="/profile" class="profile-manage">{$t('common.nav.manage_profiles')}</a>
                                </div>
                            {/if}
                        </div>
                        {:else}
                        <a href="/profile" class="profile-trigger">
                            <span class="profile-avatar">{(data.user.display_name || data.user.username || '?')[0].toUpperCase()}</span>
                            <span class="profile-name">{data.user.display_name || data.user.username}</span>
                        </a>
                        {/if}
                        <button onclick={handleLogout} class="btn-glass">{$t('common.nav.logout')}</button>
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
                onclick={toggleMobileMenu}
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
                <a href="/" onclick={toggleMobileMenu}>{$t('common.nav.home')}</a>
                <a href="/agora" onclick={toggleMobileMenu}>{$t('common.nav.agora')}</a>
                <a href="/write" onclick={toggleMobileMenu}>{$t('common.nav.write')}</a>
                {#if data?.user?.role === 'admin' || data?.user?.role === 'member'}
                <span class="mobile-taller-label">{$t('common.nav.taller')}</span>
                <a href="/evaluate" onclick={toggleMobileMenu}>{$t('common.nav.evaluate')}</a>
                <a href="/refine" onclick={toggleMobileMenu}>{$t('common.nav.refine')}</a>
                <a href="/audio" onclick={toggleMobileMenu}>{$t('common.nav.audio')}</a>
                {/if}
                <button onclick={() => { mobileMenuOpen = false; searchOpen = true; }} class="mobile-search-trigger">{$t('common.nav.search')}</button>
            </nav>
            <div class="mobile-lang">
                <button class="theme-toggle mobile-theme-toggle" onclick={toggleTheme} aria-label={currentTheme === 'dark' ? $t('common.theme_light') : $t('common.theme_dark')}>
                    {#if currentTheme === 'dark'}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                        <span>{$t('common.theme_light')}</span>
                    {:else}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                        <span>{$t('common.theme_dark')}</span>
                    {/if}
                </button>
                <LanguageSwitcherMobile serverLocale={data.serverLocale} />
            </div>
            <div class="mobile-auth">
                {#if data?.user}
                    <a href="/profile" onclick={toggleMobileMenu} class="welcome-mobile">{$t('common.nav.welcome')}, <strong>{data.user.display_name || data.user.username}</strong></a>
                    {#if data.user?.role === 'admin'}
                    <a href="/profile" onclick={toggleMobileMenu} class="btn-glass block">{$t('common.nav.manage_profiles')}</a>
                    <a href="/admin" onclick={toggleMobileMenu} class="btn-glass block">{$t('common.nav.admin')}</a>
                    {/if}
                    <button onclick={() => { toggleMobileMenu(); handleLogout(); }} class="btn-glass block">{$t('common.nav.logout')}</button>
                {:else}
                    <a href="/login" onclick={toggleMobileMenu} class="btn-glass block">{$t('common.nav.login')}</a>
                    <a href="/signup" onclick={toggleMobileMenu} class="btn-accent block">{$t('common.nav.signup')}</a>
                {/if}
            </div>
        </div>
    {/if}

    <!-- MAIN -->
    <main class="main-content">
        {@render children()}

        <SearchModal bind:open={searchOpen} serverLocale={data.serverLocale} />

        {#if showOnboarding}
            <OnboardingFlow user={data.user} onclose={async () => {
                showOnboarding = false;
                onboardingDismissed = true;
                try { await fetch('/api/onboarding', { method: 'POST' }); } catch {}
            }} />
        {/if}

        {#if helpOpen}
        <div class="modal-overlay" onclick={() => helpOpen = false}>
            <div class="help-modal" onclick={e => e.stopPropagation()}>
                <button class="modal-close" onclick={() => helpOpen = false}>✕</button>
                <h2>{$t('help.title')}</h2>
                <div class="help-sections">
                    <div class="help-section">
                        <h3>{$t('help.write_title')}</h3>
                        <p>{$t('help.write_desc')}</p>
                    </div>
                    <div class="help-section">
                        <h3>{$t('help.refine_title')}</h3>
                        <p>{$t('help.refine_desc')}</p>
                    </div>
                    <div class="help-section">
                        <h3>{$t('help.evaluate_title')}</h3>
                        <p>{$t('help.evaluate_desc')}</p>
                    </div>
                    <div class="help-section">
                        <h3>{$t('help.audio_title')}</h3>
                        <p>{$t('help.audio_desc')}</p>
                    </div>
                    <div class="help-section">
                        <h3>{$t('help.findai_title')}</h3>
                        <p>{$t('help.findai_desc')}</p>
                    </div>
                    <div class="help-section">
                        <h3>{$t('help.agora_title')}</h3>
                        <p>{$t('help.agora_desc')}</p>
                    </div>
                    <div class="help-section">
                        <h3>{$t('help.profile_title')}</h3>
                        <p>{$t('help.profile_desc')}</p>
                    </div>
                </div>
            </div>
        </div>
        {/if}
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
                    <span class="footer-sep">·</span>
                    <a href="mailto:ismael@patrouch.ca">{$t('common.footer.contact')}</a>
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
        background: var(--navbar-bg);
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
        color: var(--text-dim);
        font-weight: 600;
        font-style: italic;
    }

    .logo-name {
        color: var(--accent);
    }

    .logo:hover .logo-initials { color: var(--text); }
    .logo:hover .logo-name { color: var(--accent-hover, #d4b98f); }

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

    .taller-dropdown {
        position: relative;
    }
    .taller-trigger {
        background: none;
        border: none;
        color: var(--accent);
        font-size: 0.95rem;
        cursor: pointer;
        padding: 0.5rem 0;
        border-bottom: 2px solid transparent;
        transition: border-color 0.2s;
        font-family: var(--font-body);
    }
    .taller-trigger:hover {
        border-bottom-color: var(--accent);
    }
    .taller-menu {
        position: absolute;
        top: 100%;
        left: 0;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        padding: 0.5rem 0;
        min-width: 160px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        z-index: calc(var(--z-nav) + 1);
    }
    .taller-menu a {
        display: block;
        padding: 0.5rem 1rem;
        color: var(--text);
        text-decoration: none;
        font-size: 0.9rem;
        transition: color 0.2s;
    }
    .taller-menu a:hover {
        color: var(--accent);
    }
    .taller-menu a.active {
        color: var(--accent);
    }
    .mobile-taller-label {
        color: var(--accent);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding: 0.75rem 0 0.25rem;
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

    .profile-switcher {
        position: relative;
    }
    .profile-trigger {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: none;
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 0.3rem 0.7rem 0.3rem 0.3rem;
        cursor: pointer;
        color: var(--text-dim);
        transition: border-color 0.2s;
    }
    .profile-trigger:hover { border-color: var(--accent); }
    .profile-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--accent);
        color: var(--bg);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 700;
    }
    .profile-name {
        font-size: 0.8rem;
        color: var(--text);
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .admin-badge {
        font-size: 0.55rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--bg);
        background: #a78bfa;
        padding: 0.1rem 0.4rem;
        border-radius: 999px;
    }
    .profile-dropdown {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 0.5rem;
        min-width: 220px;
        z-index: 100;
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    .profile-option {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: 100%;
        padding: 0.5rem 0.6rem;
        border: none;
        border-radius: 8px;
        background: none;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.85rem;
        cursor: pointer;
        transition: background 0.15s;
    }
    .profile-option:hover { background: var(--glass-hover); }
    .profile-option.active { color: var(--accent); }
    .profile-option.active .profile-option-avatar { background: var(--accent); }
    .profile-option-avatar {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 700;
        flex-shrink: 0;
    }
    .profile-option-info {
        display: flex;
        flex-direction: column;
        text-align: left;
    }
    .profile-option-name { font-weight: 500; }
    .profile-option-locale { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .profile-primary-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent);
        margin-left: auto;
    }
    .profile-divider { height: 1px; background: var(--border); margin: 0.4rem 0; }
    .profile-manage {
        display: block;
        padding: 0.5rem 0.6rem;
        font-size: 0.8rem;
        color: var(--text-muted);
        text-decoration: none;
        border-radius: 8px;
        transition: color 0.15s;
    }
    .profile-manage:hover { color: var(--accent); }

    .btn-glass {
        background: var(--glass-bg);
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
        padding-bottom: 4rem;
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
    .mobile-search-trigger {
        font-family: var(--font-heading);
        font-size: 1.75rem;
        font-weight: 300;
        color: var(--text-dim);
        background: none;
        border: none;
        border-bottom: 1px solid var(--border);
        padding: 1rem 0;
        width: 100%;
        text-align: left;
        cursor: pointer;
        transition: color 0.2s;
    }
    .mobile-search-trigger:hover { color: var(--accent); }

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
        text-decoration: none;
        cursor: pointer;
    }
    .welcome-mobile:active { color: var(--accent); }

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

    /* ── Theme Toggle ── */
    .theme-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: none;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.45rem 0.6rem;
        color: var(--text-dim);
        cursor: pointer;
        transition: all 0.2s;
        font-family: var(--font-body);
        font-size: 0.85rem;
    }
    .theme-toggle:hover {
        border-color: var(--accent);
        color: var(--accent);
    }
    .mobile-theme-toggle {
        border: none;
        padding: 0.6rem 1rem;
        color: var(--text-muted);
        font-size: 0.9rem;
    }
    .mobile-theme-toggle:hover {
        color: var(--accent);
    }
    .mobile-lang {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        justify-content: center;
        padding: 1rem 0;
    }

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
