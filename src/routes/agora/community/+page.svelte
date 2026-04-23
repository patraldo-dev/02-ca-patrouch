<script>
    import { t, locale } from '$lib/i18n';

    let { data } = $props();

    const today = new Date().toISOString().slice(0, 10);

    function formatDate(dateStr) {
        if (dateStr === today) return $t('agora.community.today_label');
        return new Date(dateStr + 'T12:00:00').toLocaleDateString($locale || 'en', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    function excerpt(text) {
        if (!text) return '';
        return text.length > 200 ? text.slice(0, 200) + '…' : text;
    }
</script>

<svelte:head>
    <title>{$t('agora.community.title')} — {$t('common.nav.agora')}</title>
</svelte:head>

<div class="community-page">
    <header class="community-header">
        <a href="/agora" class="back-link">← {$t('common.nav.agora')}</a>
        <h1>{$t('agora.community.title')}</h1>
        <p>{$t('agora.community.subtitle')}</p>
    </header>

    <!-- Filters -->
    <div class="community-filters">
        <a href="/agora/community" class="filter-tag" class:active={!data.filters.locale}>{$t('agora.all')}</a>
        <a href="/agora/community?locale=en" class="filter-tag" class:active={data.filters.locale === 'en'}>EN</a>
        <a href="/agora/community?locale=es" class="filter-tag" class:active={data.filters.locale === 'es'}>ES</a>
        <a href="/agora/community?locale=fr" class="filter-tag" class:active={data.filters.locale === 'fr'}>FR</a>
    </div>

    {#if data.groups?.length > 0}
        {#each data.groups as group}
            <section class="day-group">
                <h2 class="day-heading">{formatDate(group.date)}</h2>
                <div class="prompt-quote">
                    <span class="prompt-label">{$t('agora.community.prompt_label')}</span>
                    <p class="prompt-text">{group.prompt}</p>
                </div>
                <div class="responses">
                    {#each group.writings as w}
                        <article class="response-card">
                            <div class="response-header">
                                <span class="response-author">{w.username}</span>
                                <span class="response-words">{w.word_count} {$t('agora.words')}</span>
                                {#if w.ai_assisted}
                                    <span class="ai-badge">{$t('agora.ai_assisted')}</span>
                                {/if}
                            </div>
                            <h3 class="response-title">{w.title}</h3>
                            <p class="response-excerpt">{excerpt(w.content)}</p>
                        </article>
                    {/each}
                </div>
            </section>
        {/each}
    {:else}
        <div class="empty-state">
            <p>{$t('agora.community.no_responses')}</p>
        </div>
    {/if}
</div>

<style>
    .community-page {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
    }

    .community-header {
        text-align: center;
        margin-bottom: 2rem;
    }

    .back-link {
        color: var(--text-muted);
        font-size: 0.85rem;
        text-decoration: none;
    }
    .back-link:hover { color: var(--accent); }

    .community-header h1 {
        font-family: var(--font-heading);
        font-size: 1.8rem;
        font-weight: 300;
        color: var(--text);
        margin-bottom: 0.3rem;
    }

    .community-header p {
        color: var(--text-muted);
        font-style: italic;
    }

    .community-filters {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin-bottom: 2.5rem;
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

    .day-group {
        margin-bottom: 3rem;
    }

    .day-heading {
        font-family: var(--font-heading);
        font-size: 1.1rem;
        font-weight: 400;
        color: var(--text-dim);
        margin-bottom: 1rem;
    }

    .prompt-quote {
        background: var(--surface);
        border: 1px solid var(--border);
        border-left: 3px solid var(--accent);
        border-radius: var(--radius);
        padding: 1.25rem 1.5rem;
        margin-bottom: 1.5rem;
    }

    .prompt-label {
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #c084fc;
        display: block;
        margin-bottom: 0.5rem;
    }

    .prompt-text {
        font-family: var(--font-heading);
        font-size: 1.1rem;
        font-weight: 300;
        color: var(--text);
        line-height: 1.6;
        font-style: italic;
    }

    .responses {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .response-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1.25rem 1.5rem;
        transition: border-color 0.2s;
    }
    .response-card:hover { border-color: rgba(201, 168, 124, 0.3); }

    .response-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .response-author {
        color: var(--accent);
        font-size: 0.85rem;
        font-weight: 500;
    }

    .response-words {
        font-size: 0.75rem;
        color: var(--text-muted);
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

    .response-title {
        font-family: var(--font-heading);
        font-size: 1.05rem;
        font-weight: 400;
        color: var(--text);
        margin-bottom: 0.4rem;
    }

    .response-excerpt {
        font-size: 0.88rem;
        color: var(--text-dim);
        line-height: 1.6;
    }

    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        color: var(--text-muted);
    }
</style>
