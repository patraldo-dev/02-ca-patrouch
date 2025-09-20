<!-- src/routes/admin/blog/+page.svelte -->
<script>
    let posts = [];
    let error = '';

    async function loadPosts() {
        try {
            const res = await fetch('/api/admin/blog');
            posts = await res.json();
        } catch (err) {
            error = 'Failed to load posts';
        }
    }

    loadPosts();
</script>

<svelte:head>
    <title>Manage Blog Posts — Admin</title>
</svelte:head>

<div class="container">
    <h1>📰 Manage Blog Posts</h1>
    
    {#if error}
        <div class="alert error">{error}</div>
    {/if}

    <div class="actions">
        <a href="/admin/blog/write" class="btn-primary">✍️ Write New Post</a>
    </div>

    {#if posts.length === 0}
        <p>No posts found. Write your first post!</p>
    {:else}
        <div class="posts-list">
            {#each posts as post}
                <div class="post-card">
                    <h3><a href={`/admin/blog/edit/${post.slug}`}>{post.title}</a></h3>
                    <p class="meta">Published on {new Date(post.published_at * 1000).toLocaleDateString()}</p>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }
    h1 {
        color: #333;
        margin-bottom: 2rem;
    }
    .actions {
        margin-bottom: 2rem;
        text-align: right;
    }
    .btn-primary {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
    }
    .posts-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    .post-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .post-card h3 {
        margin: 0 0 0.5rem 0;
        color: #333;
    }
    .post-card h3 a {
        color: #3b82f6;
        text-decoration: none;
    }
    .post-card h3 a:hover {
        text-decoration: underline;
    }
    .meta {
        color: #666;
        font-size: 0.9rem;
        margin: 0;
    }
    .alert {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
    }
    .error {
        background: #fee2e2;
        color: #991b1b;
    }
</style>
