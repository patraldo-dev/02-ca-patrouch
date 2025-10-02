<!-- src/routes/blog/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { t } from '$lib/translations';

    let posts = [];
    let loading = true;
    let error = null;

    onMount(async () => {
        try {
            const response = await fetch('/api/blog');
            if (response.ok) {
                posts = await response.json();
            } else {
                error = $t('pages.blog.error');
            }
        } catch (err) {
            console.error('Error fetching blog posts:', err);
            error = $t('pages.blog.networkError');
        } finally {
            loading = false;
        }
    });
</script>

<svelte:head>
    <title>{$t('pages.blog.title')}</title>
</svelte:head>

<div class="container">
    <div class="page-header">
        <h1>{$t('pages.blog.heading')}</h1>
        <p>{$t('pages.blog.subtitle')}</p>
    </div>

    {#if loading}
        <div class="loading">
            <p>{$t('pages.blog.loading')}</p>
        </div>
    {:else if error}
        <div class="error">
            <p>{error}</p>
        </div>
    {:else if posts.length === 0}
        <div class="empty">
            <p>{$t('pages.blog.empty.message')}</p>
            <a href="/books" class="btn">{$t('pages.blog.empty.browseBooks')}</a>
        </div>
    {:else}
        <div class="blog-grid">
            {#each posts as post}
                <article class="blog-post">
                    <h2>{post.title}</h2>
                    {#if post.excerpt}
                        <p class="excerpt">{post.excerpt}</p>
                    {/if}
                    <div class="post-meta">
                        <span>{$t('pages.blog.post.by')} {post.author}</span>
                        <span class="date">{new Date(post.published_at).toLocaleDateString()}</span>
                    </div>
                    <a href={`/blog/${post.slug}`} class="read-more">
                        {$t('pages.blog.post.readMore')}
                    </a>
                </article>
            {/each}
        </div>
    {/if}

    <div class="back-link">
        <a href="/" class="btn-secondary">{$t('pages.blog.backToHome')}</a>
    </div>
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
