<script>
    import { t, locale } from '$lib/i18n';

    let { data } = $props();

    const { user: profileUser, stats, writings } = data.profile;

    function formatDate(d) {
        if (!d) return '';
        return new Date(d + 'T12:00:00').toLocaleDateString($locale || 'en', { month: 'long', year: 'numeric' });
    }

    function excerpt(text) {
        if (!text) return '';
        return text.length > 120 ? text.slice(0, 120) + '…' : text;
    }

    function fmtNum(n) { return n != null ? n.toLocaleString() : '0'; }
</script>

<svelte:head>
    <title>@{profileUser.username} — {$t('common.nav.agora')}</title>
</svelte:head>

<div class="profile-page">
    <a href="/agora" class="back-link">← {$t('common.nav.agora')}</a>

    <header class="profile-header">
        <div class="profile-avatar">@</div>
        <div>
            <h1>@{profileUser.username}</h1>
            <p class="profile-joined">{$t('agora.profile.join_date')} {formatDate(profileUser.created_at)}</p>
        </div>
    </header>

    <div class="stats-grid">
        <div class="stat-item">
            <span class="stat-value">{fmtNum(stats.total_writings)}</span>
            <span class="stat-label">{$t('agora.profile.writings')}</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">{fmtNum(stats.total_words)}</span>
            <span class="stat-label">{$t('agora.profile.total_words')}</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">{fmtNum(stats.current_streak)}</span>
            <span class="stat-label">{$t('agora.profile.streak')}</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">{fmtNum(stats.longest_streak)}</span>
            <span class="stat-label">{$t('agora.profile.longest_streak')}</span>
        </div>
    </div>

    <h2 class="section-heading">{$t('agora.profile.public_writings')}</h2>

    {#if writings?.length > 0}
        <div class="writings-list">
            {#each writings as w}
                <article class="writing-item">
                    <div class="writing-item-header">
                        <h3>{w.title}</h3>
                        <span class="writing-words">{w.word_count} {$t('agora.words')}</span>
                    </div>
                    <p class="writing-excerpt">{excerpt(w.content)}</p>
                    <span class="writing-date">{formatDate(w.created_at)}</span>
                </article>
            {/each}
        </div>
    {:else}
        <p class="empty">{$t('agora.no_writings')}</p>
    {/if}
</div>

<style>
    .profile-page {
        max-width: 720px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
    }

    .back-link {
        color: var(--text-muted);
        font-size: 0.85rem;
        text-decoration: none;
        display: inline-block;
        margin-bottom: 2rem;
    }
    .back-link:hover { color: var(--accent); }

    .profile-header {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        margin-bottom: 2rem;
    }

    .profile-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--surface);
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-heading);
        font-size: 1.4rem;
        color: var(--accent);
        font-weight: 300;
        flex-shrink: 0;
    }

    .profile-header h1 {
        font-family: var(--font-heading);
        font-size: 1.6rem;
        font-weight: 300;
        color: var(--text);
        margin-bottom: 0.15rem;
    }

    .profile-joined {
        font-size: 0.8rem;
        color: var(--text-muted);
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        margin-bottom: 2.5rem;
    }

    @media (max-width: 500px) {
        .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .stat-item {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1rem;
        text-align: center;
    }

    .stat-value {
        font-family: var(--font-heading);
        font-size: 1.5rem;
        color: var(--accent);
        font-weight: 400;
        display: block;
    }

    .stat-label {
        font-size: 0.7rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        display: block;
        margin-top: 0.2rem;
    }

    .section-heading {
        font-family: var(--font-heading);
        font-size: 1.1rem;
        font-weight: 400;
        color: var(--text-dim);
        margin-bottom: 1.25rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--border);
    }

    .writings-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .writing-item {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1.25rem 1.5rem;
        transition: border-color 0.2s;
    }
    .writing-item:hover { border-color: rgba(201, 168, 124, 0.3); }

    .writing-item-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 0.4rem;
    }

    .writing-item-header h3 {
        font-family: var(--font-heading);
        font-size: 1.05rem;
        font-weight: 400;
        color: var(--text);
    }

    .writing-words {
        font-size: 0.75rem;
        color: var(--text-muted);
        white-space: nowrap;
    }

    .writing-excerpt {
        font-size: 0.88rem;
        color: var(--text-dim);
        line-height: 1.6;
        margin-bottom: 0.5rem;
    }

    .writing-date {
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .empty {
        color: var(--text-muted);
        text-align: center;
        padding: 2rem;
    }
</style>
