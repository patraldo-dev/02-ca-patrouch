<script>
    let { data } = $props();

    if (!data.writing) {
        throw new Error('Writing not found');
    }

    const { title, excerpt, author, wordCount, createdAt, aiAssisted } = data.writing;
    const dateStr = new Date(createdAt.replace(' ', 'T')).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });
</script>

<svelte:head>
    <title>"{title}" by {author} — patrouch.ca</title>
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{excerpt}" />
    <meta property="og:type" content="article" />
</svelte:head>

<div class="card-container">
    <div class="card" id="writing-card">
        <div class="card-header">
            <span class="site-badge">patrouch.ca</span>
            {#if aiAssisted}
                <span class="ai-badge">AI Assisted</span>
            {/if}
        </div>

        <h1 class="card-title">{title}</h1>
        <p class="card-author">by <strong>{author}</strong></p>

        <div class="card-divider"></div>

        <blockquote class="card-excerpt">{excerpt}</blockquote>

        <div class="card-footer">
            <span class="card-meta">{wordCount} words</span>
            <span class="card-meta">{dateStr}</span>
        </div>

        <div class="card-watermark">✍️</div>
    </div>

    <div class="actions">
        <p class="hint">Screenshot this card to share on social media</p>
        <a href="/writings/{data.writing.id}" class="back-link">Read full writing →</a>
    </div>
</div>

<style>
    :global(body) {
        background: #0a0a0a;
        margin: 0;
        padding: 2rem;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
    }

    .card-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
    }

    .card {
        position: relative;
        width: 100%;
        max-width: 540px;
        background: linear-gradient(145deg, #1a1a1a 0%, #111 100%);
        border: 1px solid rgba(201, 168, 124, 0.2);
        border-radius: 16px;
        padding: 2.5rem;
        overflow: hidden;
    }

    .card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, #c9a87c, transparent);
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .site-badge {
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: #c9a87c;
        background: rgba(201, 168, 124, 0.1);
        padding: 0.3rem 0.75rem;
        border-radius: 999px;
    }

    .ai-badge {
        font-size: 0.65rem;
        font-weight: 500;
        color: #94a3b8;
        background: rgba(148, 163, 184, 0.1);
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
    }

    .card-title {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 1.75rem;
        font-weight: 400;
        color: #f5f5f5;
        margin: 0 0 0.5rem;
        line-height: 1.3;
    }

    .card-author {
        font-size: 0.9rem;
        color: #a3a3a3;
        margin: 0;
    }

    .card-author strong {
        color: #c9a87c;
    }

    .card-divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(201, 168, 124, 0.3), transparent);
        margin: 1.5rem 0;
    }

    .card-excerpt {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 1.05rem;
        line-height: 1.7;
        color: #d4d4d4;
        margin: 0 0 1.5rem;
        font-style: italic;
        border-left: 2px solid rgba(201, 168, 124, 0.3);
        padding-left: 1rem;
    }

    .card-footer {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .card-meta {
        font-size: 0.75rem;
        color: #737373;
        letter-spacing: 0.05em;
    }

    .card-watermark {
        position: absolute;
        bottom: 1rem;
        right: 1.5rem;
        font-size: 1.5rem;
        opacity: 0.3;
    }

    .actions {
        text-align: center;
    }

    .hint {
        font-size: 0.8rem;
        color: #525252;
        margin: 0 0 0.75rem;
    }

    .back-link {
        color: #c9a87c;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .back-link:hover {
        text-decoration: underline;
    }
</style>
