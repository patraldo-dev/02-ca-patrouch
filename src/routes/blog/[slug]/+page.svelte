<!-- src/routes/blog/[slug]/+page.svelte -->
<script>
    /** @type {import('./$types').PageData} */
    export let data;
</script>

<svelte:head>
    <title>{data.post.title} — ShelfTalk Blog</title>
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
        color: #3b82f6;
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
    .content h2 {
        margin-top: 2rem;
        color: #333;
    }
    .content p {
        margin: 1rem 0;
    }
    .content a {
        color: #3b82f6;
        text-decoration: none;
    }
    .content a:hover {
        text-decoration: underline;
    }
    .content img {
        max-width: 100%;
        border-radius: 8px;
        margin: 1rem 0;
    }
    .content pre {
        background: #f8fafc;
        padding: 1rem;
        border-radius: 6px;
        overflow-x: auto;
        margin: 1rem 0;
    }
    .content blockquote {
        border-left: 4px solid #3b82f6;
        padding: 0.5rem 1rem;
        margin: 1rem 0;
        background: #f8fafc;
    }
</style>
