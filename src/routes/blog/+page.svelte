<!-- src/routes/blog/+page.svelte -->
<script>
    /** @type {import('./$types').PageData} */
    export let data;
</script>

<svelte:head>
    <title>Blog — ShelfTalk</title>
</svelte:head>

<div class="container">
    <h1>📚 Blog</h1>
    <p>Thoughts on books, reading, and writing.</p>

    {#if data.posts.length === 0}
        <p>No posts published yet.</p>
    {:else}
        <div class="posts-grid">
            {#each data.posts as post}
                <article class="post-card">
                    <h2><a href="/blog/{post.slug}">{post.title}</a></h2>
                    <p class="meta">Published on {post.publishedAt.toLocaleDateString()}</p>
                </article>
            {/each}
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }
    h1 {
        color: #333;
        margin-bottom: 1rem;
    }
    .posts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 2rem;
        margin-top: 2rem;
    }
    .post-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        transition: transform 0.2s ease;
    }
    .post-card:hover {
        transform: translateY(-4px);
    }
    .post-card h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.3rem;
    }
    .post-card h2 a {
        color: #3b82f6;
        text-decoration: none;
    }
    .post-card h2 a:hover {
        text-decoration: underline;
    }
    .meta {
        color: #666;
        font-size: 0.9rem;
        margin: 0;
    }
</style>
