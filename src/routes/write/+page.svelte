<script>
    import { page } from '$app/stores';
    import { t, locale } from '$lib/i18n';

    let { data } = $props();

    // Initialize from server-side load
    let prompt = $state(data.prompt || null);
    let promptSource = $state(data.promptSource || 'community');
    let userAction = $state(data.userAction || null);
    let promptId = $state(data.acceptedPromptId || null);
    let passesRemaining = $state(data.passesRemaining || 3);
    let passesUsed = $state(data.passesUsed || 0);
    let stats = $state(data.stats || null);
    let error = $state(null);

    function catLabel(key) {
        return $t('write.category.' + key) || key;
    }

    async function handleAction(action) {
        try {
            const res = await fetch('/api/write/today/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, locale: $locale })
            });
            if (res.ok) {
                const d = await res.json();
                if (action === 'passed') {
                    prompt = d.prompt;
                    promptSource = d.promptSource || 'personal';
                    passesRemaining = d.passesRemaining;
                    passesUsed = d.passesUsed;
                    userAction = null;
                    // Reload stats
                    loadStats();
                } else if (action === 'accepted') {
                    promptId = d.promptId;
                    userAction = 'accepted';
                    promptSource = d.promptSource || promptSource;
                    // Reload stats
                    loadStats();
                }
            }
        } catch (e) {
            error = $t('write.dashboard.error_generic');
        }
    }

    async function loadStats() {
        try {
            const res = await fetch('/api/write/stats');
            if (res.ok) stats = await res.json();
        } catch (e) {}
    }

    let acceptedToday = $derived(userAction === 'accepted');
    let exhaustedPasses = $derived(passesRemaining <= 0 && !acceptedToday);

    function fmtNum(n) { return n != null ? n.toLocaleString() : '0'; }
    function formatDate(d) { if (!d) return ''; const s = d.replace(' ', 'T'); return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
</script>

<div class="write-page">
    {#if !data.user}
        <div class="write-cta">
            <h1>{$t('write.dashboard.title')}</h1>
            <p class="cta-subtitle">{$t('write.dashboard.cta_subtitle')}</p>
            <a href="/login" class="btn-accent">{$t('write.dashboard.sign_in')}</a>
        </div>
    {:else}
        <div class="write-layout">
            <!-- Main Content -->
            <div class="write-main">
                <h1 class="write-heading">{$t('write.dashboard.today_prompt')}</h1>

                {#if error}
                    <div class="prompt-card error">{error}</div>
                {:else if prompt}
                    <div class="prompt-card">
                        <div class="prompt-header">
                            <span class="prompt-category">{catLabel(prompt.category)}</span>
                            {#if promptSource === 'community' && !acceptedToday}
                                <span class="prompt-source-tag community">{$t('write.dashboard.community_prompt')}</span>
                                <span class="prompt-community-note">{$t('write.dashboard.community_note')}</span>
                            {:else if promptSource === 'personal' && !acceptedToday}
                                <span class="prompt-source-tag personal">{$t('write.dashboard.personal_prompt')}</span>
                            {/if}
                        </div>
                        <p class="prompt-text">{prompt.prompt_text}</p>

                        {#if !acceptedToday}
                            <div class="prompt-actions">
                                <button class="btn-accept" onclick={() => handleAction('accepted')}>{$t('write.dashboard.accept')}</button>
                                {#if !exhaustedPasses}
                                    <button class="btn-pass" onclick={() => handleAction('passed')}>
                                        {$t('write.dashboard.pass')}
                                    </button>
                                    <span class="passes-remaining">{passesRemaining === 1 ? $t('write.dashboard.passes_remaining_one').replace('{count}', passesRemaining) : $t('write.dashboard.passes_remaining').replace('{count}', passesRemaining)}</span>
                                {:else}
                                    <p class="passes-exhausted">{@html $t('write.dashboard.passes_exhausted')}</p>
                                {/if}
                            </div>
                        {:else}
                            <div class="prompt-accepted">
                                <span class="accepted-badge">{$t('write.dashboard.accepted')}</span>
                                <a href="/write/new?promptId={promptId}" class="btn-accent">{$t('write.dashboard.start_writing')}</a>
                            </div>
                        {/if}
                    </div>
                {/if}

                {#if exhaustedPasses && !acceptedToday}
                    <div class="free-write-card">
                        <h3>{$t('write.dashboard.free_writing')}</h3>
                        <p>{$t('write.dashboard.free_writing_desc')}</p>
                        <a href="/write/new" class="btn-glass">{$t('write.dashboard.start_free_writing')}</a>
                    </div>
                {/if}
            </div>

            <!-- Sidebar -->
            <aside class="write-sidebar">
                {#if stats}
                    <div class="stats-card">
                        <h3>{$t('write.dashboard.your_stats')}</h3>
                        <div class="stat-grid">
                            <div class="stat-item">
                                <span class="stat-value">{fmtNum(stats.total_writings)}</span>
                                <span class="stat-label">{$t('write.dashboard.writings')}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">{fmtNum(stats.total_words)}</span>
                                <span class="stat-label">{$t('write.dashboard.words')}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">{fmtNum(stats.current_streak)}</span>
                                <span class="stat-label">{$t('write.dashboard.day_streak')}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">{fmtNum(stats.prompts_accepted)}</span>
                                <span class="stat-label">{$t('write.dashboard.accepted_label')}</span>
                            </div>
                        </div>
                        {#if stats.longest_streak > 0}
                            <p class="stat-note">{$t('write.dashboard.longest_streak').replace('{count}', stats.longest_streak)}</p>
                        {/if}
                    </div>
                {/if}

                {#if data.recentWritings?.length > 0}
                    <div class="recent-card">
                        <h3>{$t('write.dashboard.recent_writings')}</h3>
                        <ul class="recent-list">
                            {#each data.recentWritings as w}
                                <li>
                                    <a href="/write/{w.id}" class="recent-link">
                                        <span class="recent-title">{w.title}</span>
                                        <span class="recent-meta">
                                            {formatDate(w.created_at)} · {w.word_count} {$t('write.dashboard.words_word')}
                                            {#if w.status === 'draft'}
                                                <span class="draft-tag">{$t('write.view.status_draft')}</span>
                                            {/if}
                                        </span>
                                    </a>
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            </aside>
        </div>
    {/if}
</div>

<style>
    .write-page {
        max-width: 1100px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
    }

    /* CTA */
    .write-cta {
        text-align: center;
        padding: 6rem 2rem;
        max-width: 600px;
        margin: 0 auto;
    }

    .write-cta h1 {
        font-family: var(--font-heading);
        font-size: 2.5rem;
        font-weight: 300;
        color: var(--text);
        margin-bottom: 1rem;
    }

    .cta-subtitle {
        color: var(--text-dim);
        font-size: 1.1rem;
        line-height: 1.7;
        margin-bottom: 2rem;
    }

    /* Layout */
    .write-layout {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
    }

    .write-heading {
        font-family: var(--font-heading);
        font-size: 1.8rem;
        font-weight: 300;
        color: var(--text);
        margin-bottom: 1.5rem;
    }

    /* Prompt Card */
    .prompt-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 2rem;
        margin-bottom: 1.5rem;
    }

    .prompt-card.loading {
        color: var(--text-muted);
        font-style: italic;
    }

    .prompt-card.error {
        border-color: #dc2626;
        color: #fca5a5;
    }

    .prompt-category {
        display: inline-block;
        font-family: var(--font-body);
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--accent);
        background: rgba(201, 168, 124, 0.1);
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        margin-bottom: 1rem;
    }

    .prompt-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .prompt-source-tag {
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
    }

    .prompt-source-tag.community {
        color: #c084fc;
        background: rgba(192, 132, 252, 0.12);
        border: 1px solid rgba(192, 132, 252, 0.25);
    }

    .prompt-source-tag.personal {
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.1);
        border: 1px solid rgba(56, 189, 248, 0.2);
    }

    .prompt-community-note {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-style: italic;
    }

    .prompt-text {
        font-family: var(--font-heading);
        font-size: 1.3rem;
        font-weight: 300;
        line-height: 1.6;
        color: var(--text);
        margin-bottom: 1.5rem;
    }

    .prompt-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
    }

    .btn-accept {
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: var(--radius);
        padding: 0.65rem 1.5rem;
        font-family: var(--font-body);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }

    .btn-accept:hover { background: var(--accent-hover); }

    .btn-pass {
        background: none;
        color: var(--text-dim);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.65rem 1.5rem;
        font-family: var(--font-body);
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-pass:hover { border-color: var(--accent); color: var(--accent); }

    .passes-remaining {
        font-size: 0.8rem;
        color: var(--text-muted);
    }

    .passes-exhausted {
        font-size: 0.85rem;
        color: var(--text-muted);
        margin: 0.5rem 0 0;
    }

    .passes-exhausted a {
        color: var(--accent);
        text-decoration: none;
    }

    .passes-exhausted a:hover { text-decoration: underline; }

    .prompt-accepted {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .accepted-badge {
        color: #4ade80;
        font-weight: 500;
    }

    /* Free Write Card */
    .free-write-card {
        background: var(--surface);
        border: 1px dashed var(--border);
        border-radius: var(--radius);
        padding: 1.5rem;
        text-align: center;
    }

    .free-write-card h3 {
        font-family: var(--font-heading);
        font-size: 1.1rem;
        color: var(--text);
        margin-bottom: 0.5rem;
    }

    .free-write-card p {
        color: var(--text-muted);
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }

    /* Buttons */
    .btn-accent {
        display: inline-block;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: var(--radius);
        padding: 0.5rem 1.25rem;
        font-family: var(--font-body);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: background 0.2s;
    }

    .btn-accent:hover { background: var(--accent-hover); }

    .btn-glass {
        display: inline-block;
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.5rem 1.25rem;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s;
    }

    .btn-glass:hover { border-color: var(--accent); color: var(--accent); }

    /* Sidebar */
    .stats-card, .recent-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1.5rem;
        margin-bottom: 1.5rem;
    }

    .stats-card h3, .recent-card h3 {
        font-family: var(--font-heading);
        font-size: 1rem;
        font-weight: 400;
        color: var(--text-dim);
        margin-bottom: 1rem;
    }

    .stat-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .stat-value {
        font-family: var(--font-heading);
        font-size: 1.5rem;
        font-weight: 400;
        color: var(--accent);
    }

    .stat-label {
        font-size: 0.75rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }

    .stat-note {
        margin-top: 0.75rem;
        font-size: 0.8rem;
        color: var(--text-muted);
        font-style: italic;
    }

    .recent-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .recent-list li {
        border-bottom: 1px solid var(--border);
    }

    .recent-list li:last-child { border-bottom: none; }

    .recent-link {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 0.5rem 0;
        gap: 0.5rem;
        text-decoration: none;
    }

    .recent-link:hover .recent-title {
        color: var(--accent);
    }

    .draft-tag {
        font-size: 0.6rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #fde047;
        background: rgba(250, 204, 21, 0.12);
        padding: 0.1rem 0.4rem;
        border-radius: 999px;
        margin-left: 0.35rem;
    }

    .recent-title {
        color: var(--text-dim);
        font-size: 0.85rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .recent-meta {
        font-size: 0.75rem;
        color: var(--text-muted);
        white-space: nowrap;
    }

    /* Responsive */
    @media (min-width: 769px) {
        .write-layout {
            grid-template-columns: 2fr 1fr;
        }
    }
</style>
