<!-- src/routes/+layout.svelte -->
<script>
    import { page } from '$app/stores';

    // For mobile menu toggle
    let mobileMenuOpen = false;

    function toggleMobileMenu() {
        mobileMenuOpen = !mobileMenuOpen;
    }

    // Close mobile menu when route changes
    $: $page.url.pathname, mobileMenuOpen = false;
</script>

<svelte:head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />

</svelte:head>

<div class="app-layout">
    <header class="navbar">
        <div class="container nav-container">
            <a href="/" class="logo" aria-label="Home">
                📚 ShelfTalk
            </a>

            <!-- Desktop Nav -->
            <nav class="desktop-nav">
                <a href="/" class:active={$page.url.pathname === '/'}>Home</a>
                <a href="/books" class:active={$page.url.pathname.startsWith('/books')}>Books</a>
                <!-- Placeholder for future -->
                <!-- <a href="/writing" class:active={$page.url.pathname.startsWith('/writing')}>Writing</a> -->
                <a href="/about" class:active={$page.url.pathname === '/about'}>About</a>
            </nav>

            <!-- Auth Placeholder (for now) -->
            <div class="auth-actions">
                <!-- Later: Login / Signup / Profile -->
                <a href="/login" class="btn-secondary">Log In</a>
                <a href="/signup" class="btn-primary">Sign Up</a>
            </div>

            <!-- Mobile Toggle -->
            <button
                class="mobile-toggle"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
                on:click={toggleMobileMenu}
            >
                ☰
            </button>
        </div>

        <!-- Mobile Menu (Sliding from top) -->
        {#if mobileMenuOpen}
            <div class="mobile-menu">
                <nav class="mobile-nav">
                    <a href="/" on:click={toggleMobileMenu} class:active={$page.url.pathname === '/'}>Home</a>
                    <a href="/books" on:click={toggleMobileMenu} class:active={$page.url.pathname.startsWith('/books')}>Books</a>
                    <!-- <a href="/writing" on:click={toggleMobileMenu} class:active={$page.url.pathname.startsWith('/writing')}>Writing</a> -->
                    <a href="/about" on:click={toggleMobileMenu} class:active={$page.url.pathname === '/about'}>About</a>
                </nav>
                <div class="mobile-auth">
                    <a href="/login" on:click={toggleMobileMenu} class="btn-secondary block">Log In</a>
                    <a href="/signup" on:click={toggleMobileMenu} class="btn-primary block">Sign Up</a>
                </div>
            </div>
        {/if}
    </header>

    <!-- Page Content -->
    <main class="main-content">
        <slot />
    </main>

    <footer class="site-footer">
        <div class="container">
            <p>© {new Date().getFullYear()} ShelfTalk — Book reviews & more.</p>
            <p><a href="/privacy">Privacy</a> • <a href="/terms">Terms</a></p>
        </div>
    </footer>
</div>

<style>
    .app-layout {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: #fafafa;
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
        gap: 1rem;
        align-items: center;
    }

    .btn-primary,
    .btn-secondary {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
        font-size: 0.95rem;
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

    .site-footer a {
        color: #9ca3af;
        text-decoration: none;
    }

    .site-footer a:hover {
        color: white;
        text-decoration: underline;
    }

    /* Main Content Spacing */
    .main-content {
        flex: 1;
        padding: 2rem 0;
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
