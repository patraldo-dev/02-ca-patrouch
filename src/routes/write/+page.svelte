<script>
    import { page } from '$app/stores';
    import { goto, invalidateAll } from '$app/navigation';
    import { t, locale, getLocale } from '$lib/i18n';
    import { track } from '$lib/analytics';
    import WritingHeatmap from '$lib/components/WritingHeatmap.svelte';
    import WordMilestones from '$lib/components/WordMilestones.svelte';
    import BadgeTrophyCase from '$lib/components/BadgeTrophyCase.svelte';
    import WriterOfTheWeek from '$lib/components/WriterOfTheWeek.svelte';
    import OnboardingFlow from '$lib/components/OnboardingFlow.svelte';
    import { browser } from '$app/environment';

    import { onMount } from 'svelte';

    let { data } = $props();

    // Invalidate server data on mount to ensure fresh prompt/pass count
    onMount(() => { invalidateAll(); });

    // Onboarding is handled by layout
    let showOnboarding = $state(false);
    let showMilestones = $state(false);
    let showHeatmap = $state(false);
    let showBadges = $state(false);

    // Initialize from server-side load
    let prompt = $state(data.prompt || null);
    let promptSource = $state(data.promptSource || 'community');
    let userAction = $state(data.userAction || null);
    let promptId = $state(data.acceptedPromptId || null);
    let passesRemaining = $state(data.passesRemaining || 3);
    let passesUsed = $state(data.passesUsed || 0);
    let isPassing = $state(false);
    let editorTitle = $state('');
    let editorContent = $state('');
    let editorWordCount = $derived(editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0);
    let editorVisibility = $state('public');
    let editorAiAssisted = $state(false);
    let editorSaving = $state(false);
    let editorMessage = $state('');
    let stats = $state(data.stats || null);
    let error = $state(null);
    let promptMode = $state('text'); // 'text' | 'visual'
    let visualPrompt = $state(null);
    let visualLoading = $state(false);

    function catLabel(key) {
        return $t('write.category.' + key) || key;
    }

    async function loadVisualPrompt() {
        if (visualPrompt) return;
        visualLoading = true;
        try {
            const loc = getLocale() || 'en';
            const res = await fetch(`/api/write/art-prompt?locale=${loc}`);
            if (res.ok) {
                visualPrompt = await res.json();
            } else {
                console.error('Art prompt API error:', res.status);
            }
        } catch (err) {
            console.error('Art prompt fetch error:', err);
        }
        visualLoading = false;
    }

    async function handleAction(action) {
        if (action === 'passed') isPassing = true;
        try {
            const res = await fetch('/api/write/today/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, locale: getLocale() })
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
                    track('pass_prompt', prompt?.id);
                } else if (action === 'accepted') {
                    console.log('✅ ACCEPT response:', JSON.stringify(d));
                    console.log('✅ promptId from response:', d.promptId);
                    console.log('✅ navigating to:', `/write/new?promptId=${d.promptId}`);
                    userAction = 'accepted';
                    loadStats();
                    track('accept_prompt', d.promptId);
                    goto(`/write/new?promptId=${d.promptId}`);
                } else if (action === 'completed') {
                    userAction = 'completed';
                    loadStats();
                }
            }
        } catch (e) {
            error = $t('write.dashboard.error_generic');
        } finally {
            isPassing = false;
        }
    }

    function viewWriting(id) { goto('/writings/' + id); }

    async function handleSave() {
        if (!editorTitle.trim() || !editorContent.trim()) return;
        editorSaving = true;
        editorMessage = '';
        try {
            const res = await fetch('/api/writings/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editorTitle, content: editorContent, promptId: promptId || null, aiAssisted: editorAiAssisted })
            });
            if (res.ok) {
                editorMessage = $t('write.editor.saved');
                setTimeout(() => { editorMessage = ''; }, 3000);
            }
        } catch {}
        editorSaving = false;
    }

    async function handlePublish(e) {
        e.preventDefault();
        if (!editorTitle.trim() || !editorContent.trim()) return;
        editorSaving = true;
        editorMessage = '';
        try {
            const res = await fetch('/api/writings/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editorTitle, content: editorContent, promptId: promptId || null, aiAssisted: editorAiAssisted, visibility: editorVisibility })
            });
            if (res.ok) {
                const d = await res.json();
                editorMessage = $t('write.editor.published');
                goto('/writings/' + d.id);
            }
        } catch {}
        editorSaving = false;
    }

    async function loadStats() {
        try {
            const res = await fetch('/api/write/stats');
            if (res.ok) stats = await res.json();
        } catch (e) {}
    }

    let acceptedToday = $derived(userAction === 'accepted');
    let completedToday = $derived(userAction === 'completed');
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
                {:else}
                    <!-- Prompt Mode Toggle -->
                    <div class="prompt-mode-toggle">
                        <button class="mode-btn" class:active={promptMode === 'text'} onclick={() => { promptMode = 'text'; }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
                            {$t('write.art.mode_text')}
                        </button>
                        <button class="mode-btn" class:active={promptMode === 'visual'} onclick={() => { promptMode = 'visual'; loadVisualPrompt(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                            {$t('write.art.mode_visual')}
                        </button>
                    </div>

                    {#if promptMode === 'text' && prompt}
                    <div class="prompt-card">
                        <div class="prompt-header">
                            <span class="prompt-category">{catLabel(prompt.category)}</span>
                            {#if promptSource === 'personal'}
                                <span class="prompt-source-tag personal">{$t('write.dashboard.personal_prompt')}</span>
                            {/if}
                            {#if acceptedToday}
                                <span class="accepted-badge">{$t('write.dashboard.accepted')}</span>
                            {/if}
                        </div>
                        <p class="prompt-text">{prompt.prompt_text}</p>
                        {#if !acceptedToday && !completedToday}
                            <div class="prompt-actions">
                                <button class="btn-accept" onclick={() => handleAction('accepted')}>{$t('write.dashboard.accept')}</button>
                                {#if !exhaustedPasses}
                                    <button class="btn-pass" onclick={() => handleAction('passed')} disabled={isPassing}>
                                        {isPassing ? $t('write.dashboard.passing') : $t('write.dashboard.pass')}
                                    </button>
                                    <span class="passes-remaining">{passesRemaining === 1 ? $t('write.dashboard.passes_remaining_one').replace('{count}', passesRemaining) : $t('write.dashboard.passes_remaining').replace('{count}', passesRemaining)}</span>
                                {:else}
                                    <p class="passes-exhausted">{@html $t('write.dashboard.passes_exhausted')}</p>
                                {/if}
                            </div>
                        {/if}
                    </div>
                    {/if}

                    {#if promptMode === 'visual'}
                    <div class="art-inspiration">
                        {#if visualLoading}
                            <div class="art-loading">
                                <div class="spinner-small"></div>
                                <span>{$t('write.art.generating')}</span>
                            </div>
                        {:else if visualPrompt}
                            <img src={visualPrompt.artwork.imageUrl} alt={visualPrompt.artwork.title} class="art-image" loading="lazy" />
                            {#if visualPrompt.prompt}
                                <div class="art-prompt-text">
                                    <p>{visualPrompt.prompt}</p>
                                </div>
                            {/if}
                            <div class="art-meta">
                                <span class="art-title">{visualPrompt.artwork.title}</span>
                                <span class="art-credit">{visualPrompt.artwork.credit}</span>
                            </div>
                        {:else if data.artwork}
                            <img src={data.artwork.imageUrl} alt={data.artwork.title} class="art-image" loading="lazy" />
                            <div class="art-meta">
                                <span class="art-title">{data.artwork.title}</span>
                                <span class="art-credit">{data.artwork.credit}</span>
                            </div>
                        {:else}
                            <p class="art-loading">{$t('write.art.generating')}</p>
                        {/if}
                    </div>
                    {/if}
                {/if}

                <!-- Inline Editor - always visible -->
                <div class="inline-editor">
                    <h2 class="editor-heading">{$t('write.editor.heading')}</h2>
                    {#if prompt && promptId}
                        <div class="editor-prompt-ref">
                            <span>{$t('write.editor.from_prompt')}:</span> {prompt.prompt_text?.slice(0, 80)}{prompt.prompt_text?.length > 80 ? '…' : ''}
                        </div>
                    {/if}
                    <form onsubmit={handlePublish}>
                        <input type="hidden" name="promptId" value={promptId || ''} />
                        <div class="editor-field">
                            <label>{$t('write.editor.title')}</label>
                            <input type="text" bind:value={editorTitle} placeholder={$t('write.editor.title_placeholder')} required />
                        </div>
                        <div class="editor-field full">
                            <label>{$t('write.editor.content')} <span class="word-count">{editorWordCount} {$t('write.editor.words')}</span></label>
                            <textarea bind:value={editorContent} placeholder={$t('write.editor.content_placeholder')} rows="16" required></textarea>
                        </div>
                        <div class="editor-options">
                            <div class="option-group">
                                <label>{$t('write.editor.visibility')}</label>
                                <select bind:value={editorVisibility}>
                                    <option value="private">{$t('write.editor.private')}</option>
                                    <option value="public">{$t('write.editor.public')}</option>
                                </select>
                            </div>
                            <label class="toggle-label">
                                <input type="checkbox" bind:checked={editorAiAssisted} />
                                <span>{$t('write.editor.ai_assisted')}</span>
                            </label>
                        </div>
                        {#if editorMessage}
                            <div class="save-toast">{editorMessage}</div>
                        {/if}
                        <div class="editor-actions">
                            <button type="button" class="btn-save" onclick={handleSave} disabled={editorSaving}>{$t('write.editor.save_draft')}</button>
                            <button type="submit" class="btn-accent" disabled={editorSaving}>{$t('write.editor.publish')}</button>
                        </div>
                    </form>
                </div>

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
                {#if !showOnboarding}
                    <button class="tour-link" onclick={() => { localStorage.removeItem('onboarding_complete'); showOnboarding = true; }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        Show tour
                    </button>
                {/if}

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

                    <!-- Milestones button -->
                    <button class="milestones-btn" onclick={() => showMilestones = true}>
                        <span>📊</span>
                        <span>{$t('write.milestones_title')}</span>
                    </button>

                    <button class="sidebar-action-btn" onclick={() => showHeatmap = true}>
                        <span>🔥</span>
                        <span>{$t('write.show_heatmap')}</span>
                    </button>

                    <button class="sidebar-action-btn" onclick={() => showBadges = true}>
                        <span>🏅</span>
                        <span>{$t('write.show_badges')}</span>
                    </button>
                {/if}

                {#if data.recentWritings?.length > 0}
                    <div class="recent-card">
                        <h3>{$t('write.dashboard.recent_writings')}</h3>
                        <ul class="recent-list">
                            {#each data.recentWritings as w}
                                <li>
                                    <a href="/writings/{w.id}" class="recent-link" sveltekit:prefetch>
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

{#if showMilestones}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal-overlay" onclick={() => showMilestones = false}>
        <div class="modal-content" onclick={e => e.stopPropagation()}>
            <button class="modal-close" onclick={() => showMilestones = false}>×</button>
            <WordMilestones stats={stats} />
        </div>
    </div>
{/if}

{#if showHeatmap}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal-overlay" onclick={() => showHeatmap = false}>
        <div class="modal-content" onclick={e => e.stopPropagation()}>
            <button class="modal-close" onclick={() => showHeatmap = false}>×</button>
            <WritingHeatmap heatmapData={data.heatmapData || {}} />
        </div>
    </div>
{/if}

{#if showBadges}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal-overlay" onclick={() => showBadges = false}>
        <div class="modal-content" onclick={e => e.stopPropagation()}>
            <button class="modal-close" onclick={() => showBadges = false}>×</button>
            <BadgeTrophyCase badges={data.userBadges || []} />
        </div>
    </div>
{/if}

{#if showOnboarding}
    <OnboardingFlow user={data.user} prompt={prompt} onclose={() => showOnboarding = false} />
{/if}

<style>
    .write-page {
        max-width: 1100px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
        box-sizing: border-box;
        width: 100%;
        overflow-x: hidden;
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
        overflow: hidden;
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
    .btn-pass:disabled { opacity: 0.5; cursor: wait; }
    .btn-pass:disabled::before {
        content: '';
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        margin-right: 0.4rem;
        vertical-align: middle;
    }

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
        flex-wrap: wrap;
    }

    .prompt-accepted .btn-accent {
        padding: 0.65rem 2rem;
        font-size: 1rem;
    }

    .accepted-badge {
        color: #4ade80;
        font-weight: 500;
    }

    .btn-done {
        background: var(--glass-bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.5rem 1.25rem;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }
    .btn-done:hover { border-color: #4ade80; color: #4ade80; }

    .inline-editor {
        margin-top: 1.5rem;
        padding: 1.5rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
    }
    .inline-editor .editor-field {
        margin-bottom: 1rem;
    }
    .inline-editor .editor-field label {
        display: block;
        color: var(--text);
        font-size: 0.85rem;
        margin-bottom: 0.4rem;
    }
    .inline-editor .editor-field input,
    .inline-editor .editor-field textarea {
        width: 100%;
        padding: 0.6rem 0.75rem;
        background: var(--bg);
        border: 2px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.95rem;
        outline: none;
        box-sizing: border-box;
    }
    .inline-editor .editor-field input:focus,
    .inline-editor .editor-field textarea:focus {
        border-color: var(--accent);
    }
    .inline-editor .editor-field textarea {
        min-height: 300px;
        resize: vertical;
    }
    .inline-editor .editor-options {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    }
    .inline-editor .option-group label {
        display: block;
        color: var(--text-dim);
        font-size: 0.75rem;
        margin-bottom: 0.3rem;
    }
    .inline-editor .option-group select {
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text);
        padding: 0.4rem 0.6rem;
        font-family: var(--font-body);
        font-size: 0.85rem;
    }
    .inline-editor .toggle-label {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: var(--text-dim);
        font-size: 0.85rem;
        cursor: pointer;
    }
    .inline-editor .word-count {
        color: var(--text-muted);
        font-size: 0.75rem;
    }
    .inline-editor .save-toast {
        background: rgba(74, 222, 128, 0.1);
        border: 1px solid rgba(74, 222, 128, 0.3);
        color: #4ade80;
        padding: 0.6rem 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }
    .inline-editor .editor-actions {
        display: flex;
        gap: 0.75rem;
    }
    .inline-editor .btn-save {
        padding: 0.6rem 1.5rem;
        background: var(--glass-bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .inline-editor .btn-save:hover { border-color: var(--accent); color: var(--accent); }
    .inline-editor .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }

    .prompt-completed {
        text-align: center;
        padding: 1rem 0;
    }
    .completed-badge { color: var(--accent); font-weight: 600; font-size: 1.1rem; }
    .completed-msg { color: var(--text-muted); margin-top: 0.5rem; font-style: italic; }

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
        background: var(--glass-bg);
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

    .tour-link {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 0.75rem;
        cursor: pointer;
        padding: 0.3rem 0;
        margin-bottom: 1rem;
        transition: color 0.2s;
    }

    .tour-link:hover { color: var(--accent); }

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

    .write-sidebar {
        min-width: 0;
        overflow: hidden;
    }

    /* Responsive */
    @media (min-width: 769px) {
        .write-layout {
            grid-template-columns: 2fr 1fr;
        }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .prompt-mode-toggle {
        display: flex; gap: 0.5rem; margin-bottom: 1rem;
    }
    .mode-btn {
        display: flex; align-items: center; gap: 0.4rem;
        padding: 0.5rem 1rem;
        background: var(--glass-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .mode-btn.active {
        border-color: var(--accent);
        color: var(--accent);
        background: var(--accent-bg);
    }
    .art-inspiration {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
    }
    .art-loading {
        display: flex; align-items: center; gap: 0.75rem;
        justify-content: center; padding: 2rem;
        color: var(--text-muted); font-size: 0.9rem;
    }
    .spinner-small {
        width: 16px; height: 16px;
        border: 2px solid var(--border);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        display: inline-block;
    }
    .art-image {
        max-width: 300px;
        width: 100%;
        border-radius: 8px;
        display: block;
        margin: 0 auto 1rem;
    }
    .art-prompt-text p {
        color: var(--text);
        font-size: 0.95rem;
        line-height: 1.6;
        text-align: center;
        font-style: italic;
        margin-bottom: 0.75rem;
    }
    .art-meta {
        display: flex; justify-content: space-between; align-items: center;
    }
    .art-title {
        color: var(--text-dim);
        font-size: 0.85rem;
        font-style: italic;
    }
    .art-credit {
        color: var(--text-muted);
        font-size: 0.75rem;
    }

    .milestones-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.6rem 0.75rem;
        background: rgba(201, 168, 124, 0.06);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text-dim);
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .milestones-btn:hover {
        background: rgba(201, 168, 124, 0.12);
        border-color: var(--accent);
        color: var(--text);
    }

    .sidebar-action-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.6rem 0.75rem;
        background: rgba(201, 168, 124, 0.06);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text-dim);
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 0.5rem;
    }

    .sidebar-action-btn:hover {
        background: rgba(201, 168, 124, 0.12);
        border-color: var(--accent);
        color: var(--text);
    }

    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
    }

    .modal-content {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.5rem;
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
    }

    .modal-close {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0.25rem;
        line-height: 1;
    }

    .modal-close:hover {
        color: var(--text);
    }
</style>
