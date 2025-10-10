<!-- src/routes/blog/+page.svelte -->
<script>
    import { t } from '$lib/translations';

    // ✅ Get data from +page.server.js — no fetch needed!
    export let data;

    // Since data is preloaded, we simulate "loading = false" immediately
    // But we keep your UI structure for consistency
    let loading = false;
    let error = null;
    $: posts = data?.posts || [];
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
        <!-- This won't show, but kept for structure -->
        <div class="loading">
            <p>{$t('pages.blog.loading')}</p>
        </div>
    {:else if error}
        <!-- Errors should be handled in +page.server.js, but kept for safety -->
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
                    <!-- ❌ Removed excerpt (not in your DB) -->
                    <div class="post-meta">
                        <!-- ❌ Removed author (not in your DB) -->
                        <span class="date">
                            {#if post.publishedAt}
                                {new Date(post.publishedAt).toLocaleDateString()}
                            {:else if post.published_at}
                                {new Date(post.published_at * 1000).toLocaleDateString()}
                            {/if}
                        </span>
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
        color: var(--primary-color);
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

.read-more {
  display: block;              /* Full width block on mobile */
  width: 100%;                /* Fill container on small */
  max-width: 300px;           /* Limit width on mobiles */
  margin: 1rem 0 1.25rem 0;   /* Vertical spacing around */
  padding: 0.75rem 1rem;
  background-color: var(--primary-color);
  color: var(--text-on-primary);
  text-align: center;
  text-decoration: none;
  font-weight: 600;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(160, 130, 109, 0.3);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.read-more:hover {
  background-color: var(--primary-dark);
  box-shadow: 0 4px 12px rgba(160, 130, 109, 0.5);
}

/* For wider screens, revert to inline-block for compact layout */
@media (min-width: 600px) {
  .read-more {
    display: inline-block;
    width: auto;
    margin-right: 1rem;
    margin-bottom: 1rem;
  }
}

</style>
