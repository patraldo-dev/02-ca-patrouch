<!-- src/routes/admin/+layout.svelte -->
<script>
    import { page } from '$app/stores';
    import { t, loadTranslations } from '$lib/translations';
    import { onMount } from 'svelte';

    // Load translations on component mount
    onMount(async () => {
        // Detect locale — for now, hardcode to 'en'
        // In a real app, you might get this from user settings, URL, or cookie
        const locale = 'en';
        await loadTranslations(locale);
    });
</script>

<svelte:head>
    <title>{$t('pages.admin.layout.title')}</title>
</svelte:head>

<div class="admin-layout">
    <nav class="admin-nav">
        <a href="/admin" class:active={$page.url.pathname === '/admin'}>{$t('pages.admin.layout.dashboard')}</a>
        <a href="/admin/books" class:active={$page.url.pathname.startsWith('/admin/books')}>{$t('pages.admin.layout.books')}</a>
        <a href="/admin/reviews" class:active={$page.url.pathname.startsWith('/admin/reviews')}>{$t('pages.admin.layout.reviews')}</a>
        <a href="/admin/blog" class:active={$page.url.pathname.startsWith('/admin/blog')}>{$t('pages.admin.layout.blog')}</a>
    </nav>

    <main class="admin-content">
        <slot />
    </main>
</div>

<style>
    .admin-layout {
        display: flex;
        min-height: 100vh;
        background: #f8fafc;
    }
    .admin-nav {
        width: 250px;
        background: #1e293b;
        color: white;
        padding: 2rem 1rem;
    }
    .admin-nav a {
        display: block;
        padding: 0.75rem 1rem;
        margin: 0.5rem 0;
        border-radius: 6px;
        text-decoration: none;
        color: #cbd5e1;
    }
    .admin-nav a:hover,
    .admin-nav a.active {
        background: #334155;
        color: white;
    }
    .admin-content {
        flex: 1;
        padding: 2rem;
        background: white;
    }
</style>
