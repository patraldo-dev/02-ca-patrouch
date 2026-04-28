<!-- src/routes/admin/+layout.svelte -->
<script>
    import { page } from '$app/stores';
    import { t } from '$lib/i18n';
    let { children } = $props();
</script>

<svelte:head>
    <title>{$t('pages.admin.layout.title')}</title>
</svelte:head>

<div class="admin-layout">
    <nav class="admin-nav">
        <a href="/admin" class:active={$page.url.pathname === '/admin'}>{$t('pages.admin.layout.dashboard')}</a>
        <a href="/admin/users" class:active={$page.url.pathname.startsWith('/admin/users')}>{$t('pages.admin.layout.users')}</a>
        <a href="/admin/invitations" class:active={$page.url.pathname.startsWith('/admin/invitations')}>📨 {$t('pages.admin.layout.invitations')}</a>
        <a href="/admin/bottles" class:active={$page.url.pathname.startsWith('/admin/bottles')}>🏴‍☠️ Bottles</a>
        <a href="/admin/analytics" class:active={$page.url.pathname.startsWith('/admin/analytics')}>📊 Analytics</a>
    </nav>

    <main class="admin-content">
        {@render children()}
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
