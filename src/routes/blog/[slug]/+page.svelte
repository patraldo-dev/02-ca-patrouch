<!-- src/routes/blog/[slug]/+page.svelte -->
<script>
    /** @type {import('./$types').PageData} */
    export let data;
</script>

<svelte:head>
    <title>{data.post.title} — Ex Libris Blog</title>
</svelte:head>

<div class="container">
    <a href="/blog" class="back-btn">← Back to Blog</a>
    <article class="blog-post">
        <header>
            <h1>{data.post.title}</h1>
            <p class="meta">Published on {data.post.publishedAt.toLocaleDateString()}</p>
        </header>
        <div class="content">
             {@html data.post.content} 
        </div>
    </article>
</div>

<style>
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }
    .back-btn {
        display: inline-block;
        margin-bottom: 2rem;
        color: var(--primary-color);
        text-decoration: none;
        font-weight: 500;
    }
    .blog-post {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .blog-post h1 {
        margin: 0 0 1rem 0;
        color: #333;
    }
    .meta {
        color: #666;
        font-size: 0.9rem;
        margin: 0 0 2rem 0;
    }
    .content {
        line-height: 1.8;
        color: #333;
    }
</style>
