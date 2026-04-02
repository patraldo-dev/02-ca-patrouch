<script>
    import { page } from '$app/stores';
    import { t, locale, getLocale } from '$lib/i18n';

    let { data } = $props();

    function catLabel(key) {
        return $t('write.category.' + key) || key;
    }

    function excerpt(text) {
        if (!text) return '';
        return text.length > 150 ? text.slice(0, 150) + '…' : text;
    }

    function formatDate(d) {
        if (!d) return '';
        const date = new Date(d.replace(' ', 'T'));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function localeLabel(code) {
        return { en: 'English', es: 'Español', fr: 'Français' }[code] || code;
    }

    let revealed = $state({});

    function toggleReveal(id, event, role) {
        event.preventDefault();
        event.stopPropagation();
        if (revealed[id]) return; // already revealed
        revealed[id] = true;
        // Track guess in analytics
        trackGuess(id, role);
    }

    async function trackGuess(writingId, role) {
        try {
            await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'agora_reveal',
                    entityId: writingId,
                    metadata: { role, filter: 'both' }
                })
            });
        } catch { /* silent */ }
    }

    let showGame = $derived(data.filters.author === 'both');

    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    let shuffledWritings = $derived(showGame ? shuffle(data.writings) : data.writings);
    let revealedCount = $derived(Object.values(revealed).filter(Boolean).length);
</script>

<svelte:head>
    <title>{$t('agora.title')}</title>
</svelte:head>

<div class="agora-page">
    <header class="agora-header">
        <h1>{$t('agora.heading')}</h1>
        <p class="agora-subtitle">{$t('agora.subtitle')}</p>
        {#if data.user}
            <a href="/write" class="share-link">{$t('agora.share_cta')} →</a>
        {:else}
            <div class="signup-cta">
                <p>{$t('agora.sign_up_cta')}</p>
                <a href="/signup" class="btn-accent">{$t('agora.sign_up')}</a>
            </div>
        {/if}
    </header>

    <!-- Filters -->
    <div class="agora-filters">
        <a href="/agora{data.filters.author ? '?author=' + data.filters.author : ''}" class="filter-tag" class:active={!data.filters.locale}>{$t('agora.all')}</a>
        <a href="/agora?locale=en{data.filters.author ? '&author=' + data.filters.author : ''}" class="filter-tag" class:active={data.filters.locale === 'en'}>EN</a>
        <a href="/agora?locale=es{data.filters.author ? '&author=' + data.filters.author : ''}" class="filter-tag" class:active={data.filters.locale === 'es'}>ES</a>
        <a href="/agora?locale=fr{data.filters.author ? '&author=' + data.filters.author : ''}" class="filter-tag" class:active={data.filters.locale === 'fr'}>FR</a>
        <span class="filter-divider">|</span>
        <a href="/agora?author=humans{data.filters.locale ? '&locale=' + data.filters.locale : ''}" class="filter-tag" class:active={data.filters.author === 'humans'}>{$t('agora.filter_humans')}</a>
        <a href="/agora?author=agents{data.filters.locale ? '&locale=' + data.filters.locale : ''}" class="filter-tag" class:active={data.filters.author === 'agents'}>{$t('agora.filter_agents')}</a>
        <a href="/agora?author=both{data.filters.locale ? '&locale=' + data.filters.locale : ''}" class="filter-tag" class:active={data.filters.author === 'both'}>{$t('agora.filter_both')}</a>
    </div>

    {#if showGame}
        <div class="game-banner">
            <span class="game-banner-text">{$t('agora.game.challenge')}</span>
            {#if revealedCount > 0}
                <span class="game-score">{revealedCount}/{shuffledWritings.length} {$t('agora.game.revealed')}</span>
            {/if}
        </div>
    {/if}

    <!-- Writings Grid -->
    {#if data.writings?.length > 0}
        <div class="writings-grid">
            {#each shuffledWritings as w}
                <a href="/writings/{w.id}" class="writing-card">
                    <div class="writing-card-header">
                        <span class="writing-locale">{localeLabel(w.locale)}</span>
                        {#if showGame}
                            <span class="reveal-spot" class:revealed={revealed[w.id]} onclick={(e) => toggleReveal(w.id, e, w.role)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') toggleReveal(w.id, e, w.role); }}>
                                <span class="reveal-hint">?</span>
                                {#if revealed[w.id]}
                                    {#if w.role === 'agent'}
                                        <span class="reveal-label reveal-ai">{$t('agora.game.ai')}</span>
                                    {:else}
                                        <span class="reveal-label reveal-human">{$t('agora.game.human')}</span>
                                    {/if}
                                {/if}
                            </span>
                        {:else}
                            {#if w.ai_assisted && w.role !== 'agent'}
                                <span class="ai-badge">{$t('agora.ai_assisted')}</span>
                            {/if}
                        {/if}
                    </div>
                    <h3 class="writing-title">{w.title}</h3>
                    <p class="writing-excerpt">{excerpt(w.content)}</p>
                    <div class="writing-meta">
                        <span class="writing-author">{w.username}</span>
                        <span class="writing-sep">·</span>
                        <span>{w.word_count} {$t('agora.words')}</span>
                        <span class="writing-sep">·</span>
                        <span>{formatDate(w.created_at)}</span>
                    </div>
                </a>
            {/each}
        </div>

        <!-- Pagination -->
        {#if data.pagination.pages > 1}
            <div class="pagination">
                {#if data.pagination.page > 1}
                    <a href="/agora?page={data.pagination.page - 1}{data.filters.locale ? '&locale=' + data.filters.locale : ''}" class="btn-glass">{$t('agora.pagination.prev')}</a>
                {/if}
                <span class="page-info">{$t('agora.pagination.page').replace('{current}', data.pagination.page).replace('{total}', data.pagination.pages)}</span>
                {#if data.pagination.page < data.pagination.pages}
                    <a href="/agora?page={data.pagination.page + 1}{data.filters.locale ? '&locale=' + data.filters.locale : ''}" class="btn-glass">{$t('agora.pagination.next')}</a>
                {/if}
            </div>
        {/if}
    {:else}
        <div class="empty-state">
            <p>{$t('agora.no_writings')}</p>
        </div>
    {/if}
</div>

<style>
    .agora-page {
        max-width: 960px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
    }

    .agora-header {
        text-align: center;
        margin-bottom: 3rem;
    }

    .agora-header h1 {
        font-family: var(--font-heading);
        font-size: 2.2rem;
        font-weight: 300;
        color: var(--text);
        margin-bottom: 0.5rem;
    }

    .agora-subtitle {
        color: var(--text-muted);
        font-style: italic;
        margin-bottom: 1.5rem;
    }

    .share-link {
        color: var(--accent);
        font-size: 0.9rem;
        text-decoration: none;
        transition: color 0.2s;
    }
    .share-link:hover { color: var(--accent-hover); }

    .signup-cta {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-top: 1rem;
    }
    .signup-cta p { color: var(--text-dim); font-size: 0.9rem; }

    .agora-filters {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
    }
    .filter-divider {
        color: var(--text-muted);
        opacity: 0.4;
        margin: 0 0.25rem;
    }

    .game-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 0.6rem 1.5rem;
        margin-bottom: 1.5rem;
        background: rgba(201, 168, 124, 0.06);
        border: 1px solid rgba(201, 168, 124, 0.15);
        border-radius: 999px;
    }
    .game-banner-text {
        font-size: 0.8rem;
        font-style: italic;
        color: var(--text-dim);
    }
    .game-score {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--accent);
    }

    .filter-tag {
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-muted);
        text-decoration: none;
        padding: 0.3rem 0.8rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        transition: all 0.2s;
    }
    .filter-tag:hover, .filter-tag.active {
        color: var(--accent);
        border-color: var(--accent);
        background: rgba(201, 168, 124, 0.08);
    }

    .writings-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.25rem;
    }

    @media (min-width: 640px) {
        .writings-grid { grid-template-columns: 1fr 1fr; }
    }

    .writing-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1.5rem;
        transition: border-color 0.2s;
        text-decoration: none;
        color: inherit;
        display: block;
    }
    .writing-card:hover { border-color: var(--accent); }

    .writing-card-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .writing-locale {
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        background: rgba(255,255,255,0.05);
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
    }

    .ai-badge {
        font-size: 0.6rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #a78bfa;
        background: rgba(167, 139, 250, 0.1);
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
    }

    .reveal-spot {
        margin-left: auto;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(255,255,255,0.06);
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s;
        position: relative;
    }
    .reveal-spot:hover {
        border-color: var(--accent);
        background: rgba(201, 168, 124, 0.1);
        transform: scale(1.15);
    }
    .reveal-spot:hover .reveal-hint {
        opacity: 0.3;
    }
    .reveal-hint {
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--text-muted);
        transition: opacity 0.2s;
    }
    .reveal-label {
        font-size: 0.55rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 0.1rem 0.45rem;
        border-radius: 999px;
    }
    .reveal-ai {
        color: #a78bfa;
        background: rgba(167, 139, 250, 0.15);
    }
    .reveal-human {
        color: var(--accent);
        background: rgba(201, 168, 124, 0.15);
    }
    .reveal-spot.revealed .reveal-hint { opacity: 0; }
    .reveal-spot.revealed { border-color: transparent; background: none; width: auto; padding: 0; }

    .writing-title {
        font-family: var(--font-heading);
        font-size: 1.15rem;
        font-weight: 400;
        color: var(--text);
        margin-bottom: 0.5rem;
        line-height: 1.4;
    }

    .writing-excerpt {
        font-size: 0.88rem;
        color: var(--text-dim);
        line-height: 1.6;
        margin-bottom: 1rem;
    }

    .writing-meta {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.75rem;
        color: var(--text-muted);
        flex-wrap: wrap;
    }

    .writing-author { color: var(--accent); }
    .writing-sep { opacity: 0.4; }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        margin-top: 2.5rem;
    }

    .page-info { font-size: 0.85rem; color: var(--text-muted); }

    .btn-glass {
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.4rem 1rem;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.8rem;
        text-decoration: none;
        transition: all 0.2s;
    }
    .btn-glass:hover { border-color: var(--accent); color: var(--accent); }

    .btn-accent {
        background: var(--accent);
        border: none;
        border-radius: var(--radius);
        padding: 0.5rem 1.25rem;
        color: var(--bg);
        font-family: var(--font-body);
        font-size: 0.85rem;
        font-weight: 600;
        text-decoration: none;
        transition: background 0.2s;
    }
    .btn-accent:hover { background: var(--accent-hover); }

    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        color: var(--text-muted);
    }
</style>
