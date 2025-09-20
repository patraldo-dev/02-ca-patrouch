<!-- src/routes/admin/+page.svelte -->
<svelte:head>
    <title>Admin Dashboard — ShelfTalk</title>
</svelte:head>

<div class="admin-dashboard">
    <h1>Admin Dashboard</h1>
    <p>Welcome to the admin panel. Use the navigation menu to manage content.</p>
    <div class="quick-links">
        <a href="/admin/books" class="btn-primary">Manage Books</a>
        <a href="/admin/reviews" class="btn-primary">Manage Reviews</a>
        <a href="/admin/blog" class="btn-primary">Manage Blog Posts</a>
    </div>
</div>

<style>
    .admin-dashboard {
        max-width: 800px;
        margin: 2rem auto;
        padding: 2rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    h1 {
        color: #333;
        margin-bottom: 1rem;
    }
    p {
        color: #555;
        margin-bottom: 2rem;
        font-size: 1.1rem;
    }
    .quick-links {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }
    .btn-primary {
        display: block;
        padding: 1rem;
        background: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        text-align: center;
        font-weight: 500;
        transition: background 0.2s;
    }
    .btn-primary:hover {
        background: #2563eb;
    }
</style>
