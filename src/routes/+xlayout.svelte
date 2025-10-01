<!-- src/routes/+layout.svelte -->
<script>
    import { browser } from '$app/environment';
    import { t, locale } from '$lib/translations';  // Changed from svelte-i18n
    import { beforeNavigate } from '$app/navigation';
    import { page } from '$app/stores';
    import NewsletterForm from '$lib/components/NewsletterForm.svelte';
    
    // Close mobile menu on route change
    beforeNavigate(() => {
        mobileMenuOpen = false;
    });
    
    /** @type {import('./$types').LayoutData} */
    export let data = {};
    
    // Mobile menu state
    let mobileMenuOpen = false;
    
    function toggleMobileMenu() {
        mobileMenuOpen = !mobileMenuOpen;
    }

	function switchLanguage(lang) {
	    locale.set(lang);
	    if (browser) {
		localStorage.setItem('preferredLanguage', lang);
		window.location.reload(); // Reload to apply new translations
	    }
	}
    
    async function handleLogout() {
        if (!browser) return;
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });
            if (response.ok) {
                window.location.href = '/';
            }
        } catch (err) {
            console.error('Logout failed:', err);
            window.location.href = '/';
        }
    }
</script>

<div class="app-layout">
    <header class="navbar">
        <div class="container nav-container">
            <!-- Logo -->
            <a href="/" class="logo" aria-label="ShelfTalk Home">
                📚 ShelfTalk
            </a>
            
            <!-- Desktop Navigation -->
            <nav class="desktop-nav" aria-label="Main navigation">
                <a
                    href="/"
                    class:active={$page.url.pathname === '/'}
                    aria-current={$page.url.pathname === '/' ? 'page' : undefined}
                >
                    {$t('common.nav.home')}
                </a>
                <a
                    href="/books"
                    class:active={$page.url.pathname.startsWith('/books')}
                    aria-current={$page.url.pathname.startsWith('/books') ? 'page' : undefined}
                >
 {$t('common.nav.books')}
                </a>
                <a
                    href="/reviews"
                    class:active={$page.url.pathname === '/reviews'}
                    aria-current={$page.url.pathname === '/reviews' ? 'page' : undefined}
                >
 {$t('common.nav.reviews')}
                </a>
                <a
                    href="/blog"
                    class:active={$page.url.pathname.startsWith('/blog')}
                    aria-current={$page.url.pathname.startsWith('/blog') ? 'page' : undefined}
                >
 {$t('common.nav.blog')}
                </a>
            </nav>
            
            <!-- Auth Actions -->
            <div class="auth-actions" aria-label="Account actions">
                {#if data?.user}
                    <span class="welcome" aria-label="Logged in as {data.user.username}">
                        Welcome, <strong>{data.user.username}</strong>
                    </span>
                    <a href="/admin" class="btn-secondary" aria-label="Admin dashboard">
                        Admin
                    </a>
                    <button on:click={handleLogout} class="btn-secondary" aria-label="Log out of your account">
                        Log Out
                    </button>
                {:else}
                    <a href="/login" class="btn-secondary" aria-label="Log in to your account">
{$t('common.nav.login')}
                    </a>
                    <a href="/signup" class="btn-primary" aria-label="Create a new account">
{$t('common.nav.signup')}
                    </a>
                {/if}
            </div>
            
            <!-- Mobile Menu Toggle -->
            <button
                class="mobile-toggle"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                on:click={toggleMobileMenu}
            >
                <span class="sr-only">Toggle menu</span>
                ☰
            </button>
        </div>
        
        <!-- Mobile Menu (Sliding from top) -->
        {#if mobileMenuOpen}
            <div id="mobile-menu" class="mobile-menu" role="dialog" aria-modal="true">
                <nav class="mobile-nav" aria-label="Mobile navigation">
                    <a
                        href="/"
                        on:click={toggleMobileMenu}
                        class:active={$page.url.pathname === '/'}
                        aria-current={$page.url.pathname === '/' ? 'page' : undefined}
                    >
 {$t('common.nav.home')}
                    </a>
                    <a
                        href="/books"
                        on:click={toggleMobileMenu}
                        class:active={$page.url.pathname.startsWith('/books')}
                        aria-current={$page.url.pathname.startsWith('/books') ? 'page' : undefined}
                    >
 {$t('common.nav.books')}
                    </a>
                    <a
                        href="/reviews"
                        on:click={toggleMobileMenu}
                        class:active={$page.url.pathname === '/reviews'}
                        aria-current={$page.url.pathname === '/reviews' ? 'page' : undefined}
                    >
 {$t('common.nav.reviews')}
                    </a>
                    <a
                        href="/blog"
                        on:click={toggleMobileMenu}
                        class:active={$page.url.pathname.startsWith('/blog')}
                        aria-current={$page.url.pathname.startsWith('/blog') ? 'page' : undefined}
                    >
 {$t('common.nav.blog')}
                    </a>
                </nav>
                <div class="mobile-auth" aria-label="Mobile account actions">
                    {#if data?.user}
                        <div class="welcome-mobile" aria-live="polite">
                            Welcome, <strong>{data.user.username}</strong>
                        </div>
                        <button
                            on:click={() => {
                                toggleMobileMenu();
                                handleLogout();
                            }}
                            class="btn-secondary block"
                            aria-label="Log out"
                        >
                            Log Out
                        </button>
                    {:else}
                        <a
                            href="/login"
                            on:click={toggleMobileMenu}
                            class="btn-secondary block"
                            aria-label="Log in"
                        >
                            Log In
                        </a>
                        <a
                            href="/signup"
                            on:click={toggleMobileMenu}
                            class="btn-primary block"
                            aria-label="Sign up"
                        >
                          {$t('common.nav.signup')}  
                        </a>
                    {/if}
                </div>
            </div>
        {/if}
    </header>
    
    <!-- Main Content -->
    <main class="main-content">
        <slot />
    </main>
    
    <!-- Footer -->
    <footer class="site-footer">
        <div class="container">
            <div class="newsletter-section">
                <svelte:component this={NewsletterForm} />
            </div>
            <p>© {new Date().getFullYear()} ShelfTalk — Honest book reviews & thoughtful commentary.</p>
            <p>
                <a href="/privacy">Privacy Policy</a> • 
                <a href="/terms">Terms of Service</a>
            </p>
        </div>
    </footer>
</div>

<style>
    .app-layout {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: #fafafa;
    }
    
    /* Navbar */
    .navbar {
        background: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        position: sticky;
        top: 0;
        z-index: 100;
    }
    
    .nav-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        max-width: 1200px;
        margin: 0 auto;
    }
    
    .logo {
        font-size: 1.5rem;
        font-weight: 700;
        text-decoration: none;
        color: #3b82f6;
        transition: color 0.2s;
    }
    
    .logo:hover {
        color: #2563eb;
    }
    
    /* Desktop Nav */
    .desktop-nav {
        display: flex;
        gap: 2rem;
        align-items: center;
    }
    
    .desktop-nav a {
        text-decoration: none;
        color: #333;
        font-weight: 500;
        padding: 0.5rem 0;
        border-bottom: 2px solid transparent;
        transition: border-color 0.2s ease;
    }
    
    .desktop-nav a:hover,
    .desktop-nav a.active {
        border-bottom: 2px solid #3b82f6;
        color: #3b82f6;
    }
    
    /* Auth Buttons */
    .auth-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .welcome {
        color: #333;
        font-weight: 500;
        white-space: nowrap;
    }
    
    .btn-primary,
    .btn-secondary {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
        font-size: 0.95rem;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
    }
    
    .btn-primary {
        background: #3b82f6;
        color: white;
    }
    
    .btn-primary:hover {
        background: #2563eb;
    }
    
    .btn-secondary {
        background: #e5e7eb;
        color: #333;
    }
    
    .btn-secondary:hover {
        background: #d1d5db;
    }
    
    .btn-secondary:focus,
    .btn-primary:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
    }
    
    /* Mobile Toggle */
    .mobile-toggle {
        display: none;
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #333;
    }
    
    /* Mobile Menu */
    .mobile-menu {
        background: white;
        padding: 1rem 2rem;
        border-bottom: 1px solid #eee;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .mobile-nav {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem 0;
        border-bottom: 1px solid #eee;
    }
    
    .mobile-nav a {
        text-decoration: none;
        color: #333;
        font-weight: 500;
        padding: 0.5rem 0;
        border-bottom: 2px solid transparent;
    }
    
    .mobile-nav a.active {
        color: #3b82f6;
        border-bottom-color: #3b82f6;
    }
    
    .mobile-auth {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem 0;
    }
    
    .welcome-mobile {
        padding: 1rem 0;
        text-align: center;
        font-weight: 500;
        color: #333;
        border-bottom: 1px solid #eee;
    }
    
    .block {
        display: block;
        text-align: center;
        width: 100%;
    }
    
    /* Footer */
    .site-footer {
        background: #1f2937;
        color: white;
        padding: 2rem 0;
        margin-top: auto;
    }
    
    .site-footer .container {
        max-width: 1200px;
        margin: 0 auto;
        text-align: center;
    }
    
    .newsletter-section {
        margin-bottom: 2rem;
        text-align: center;
    }
    
    /* Main Content Spacing */
    .main-content {
        flex: 1;
        padding: 2rem 0;
    }
    
    /* Screen Reader Only */
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
        .nav-container {
            padding: 1rem;
        }
        
        .desktop-nav,
        .auth-actions {
            display: none;
        }
        
        .mobile-toggle {
            display: block;
        }
        
        .main-content {
            padding: 1.5rem 1rem;
        }
        
        .site-footer .container {
            padding: 0 1rem;
        }
    }
</style>
