<!-- src/routes/admin/+layout.svelte -->
<script>
    import { page } from '$app/stores';
</script>

<svelte:head>
    <title>Admin — ShelfTalk</title>
</svelte:head>

<div class="admin-layout">
    <nav class="admin-nav">
        <a href="/admin" class:active={$page.url.pathname === '/admin'}>Dashboard</a>
        <a href="/admin/books" class:active={$page.url.pathname.startsWith('/admin/books')}>Books</a>
        <a href="/admin/reviews" class:active={$page.url.pathname.startsWith('/admin/reviews')}>Reviews</a>
        <a href="/admin/blog" class:active={$page.url.pathname.startsWith('/admin/blog')}>Blog Posts</a>
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
