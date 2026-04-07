<script>
    import { browser } from '$app/environment';

    let { data } = $props();

    if (!data.writing) {
        throw new Error('Writing not found');
    }

    const { title, excerpt, author, wordCount, createdAt, aiAssisted, id } = data.writing;
    const dateStr = new Date(createdAt.replace(' ', 'T')).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });

    const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://patrouch.ca/card/${id}`;
    const shareText = `"${title}" by ${author} — ${wordCount} words on patrouch.ca`;

    let copied = false;
    let copiedTimeout = null;

    function copyLink() {
        if (!browser) return;
        navigator.clipboard.writeText(shareUrl).then(() => {
            copied = true;
            if (copiedTimeout) clearTimeout(copiedTimeout);
            copiedTimeout = setTimeout(() => { copied = false; }, 2000);
        });
    }

    function shareWhatsApp() {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank');
    }

    function shareTelegram() {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    }

    function shareNative() {
        if (navigator.share) {
            navigator.share({ title, text: shareText, url: shareUrl });
        }
    }
</script>

<svelte:head>
    <title>"{title}" by {author} — patrouch.ca</title>
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{excerpt}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content={shareUrl} />
    <meta property="og:site_name" content="patrouch.ca" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{title}" />
    <meta name="twitter:description" content="{excerpt}" />
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
        <!-- Copy Link -->
        <button class="btn-copy" onclick={copyLink}>
            {#if copied}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Link copied!</span>
            {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                <span>Copy link</span>
            {/if}
        </button>

        <!-- Social Share Buttons -->
        <div class="share-buttons">
            <button class="share-btn whatsapp" onclick={shareWhatsApp} title="Share on WhatsApp">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
            <button class="share-btn telegram" onclick={shareTelegram} title="Share on Telegram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </button>
            {#if typeof navigator !== 'undefined' && navigator.share}
                <button class="share-btn native" onclick={shareNative} title="Share…">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
            {/if}
        </div>

        <a href="/writings/{id}" class="back-link">Read full writing →</a>
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
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }

    .btn-copy {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1.25rem;
        background: rgba(201, 168, 124, 0.15);
        border: 1px solid rgba(201, 168, 124, 0.3);
        border-radius: 8px;
        color: #c9a87c;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-copy:hover {
        background: rgba(201, 168, 124, 0.25);
        border-color: #c9a87c;
    }

    .btn-copy svg {
        flex-shrink: 0;
    }

    .share-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .share-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        color: #a3a3a3;
        cursor: pointer;
        transition: all 0.2s;
    }

    .share-btn:hover {
        transform: translateY(-2px);
    }

    .share-btn.whatsapp:hover {
        background: #25D366;
        border-color: #25D366;
        color: #fff;
    }

    .share-btn.telegram:hover {
        background: #0088cc;
        border-color: #0088cc;
        color: #fff;
    }

    .share-btn.native:hover {
        background: rgba(201, 168, 124, 0.2);
        border-color: #c9a87c;
        color: #c9a87c;
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
