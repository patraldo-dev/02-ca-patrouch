<script>
    import { t, getLocale } from '$lib/i18n';
    import { track } from '$lib/analytics';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { marked } from 'marked';
    import CommentSection from '$lib/components/CommentSection.svelte';

    let { data } = $props();
    let w = $state(data.writing);
    let renderedContent = $state('');
    let isPublishing = $state(false);
    let feedback = $state('');
    let gameMode = $derived($page.url.searchParams.get('game') === '1');
    let revealed = $state(false);
    let showGuess = $state(false);
    let guessCorrect = $state(false);

    function makeGuess(guess) {
        const actual = w.role === 'agent' ? 'agent' : 'human';
        guessCorrect = guess === actual;
        showGuess = false;
        revealed = true;
        // Save to localStorage for Agora card persistence
        try {
            const stored = JSON.parse(localStorage.getItem('agora_guesses') || '{}');
            stored[w.id] = guessCorrect ? 'Correct' : 'Wrong';
            localStorage.setItem('agora_guesses', JSON.stringify(stored));
        } catch {}
        try {
            fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'agora_reveal',
                    entityId: w.id,
                    metadata: { role: actual, guess, filter: 'both' }
                })
            });
        } catch { /* silent */ }
    }

    // Render markdown
    $effect(() => {
        if (w.content) {
            renderedContent = marked.parse(w.content, { async: false });
        }
    });

    // Track view (client-side only via effect)
    $effect(() => {
        if (typeof window !== 'undefined') {
            track('view_writing', w.id, { title: w.title, status: w.status });
        }
    });

    function formatDate(d) {
        if (!d) return '';
        const s = d.replace(' ', 'T');
        const localeCode = getLocale() || 'en-US';
        return new Date(s).toLocaleDateString(localeCode, {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function wordCountDisplay(n) {
        return n != null ? n.toLocaleString() : '0';
    }

    async function confirmDelete() {
        try {
            const res = await fetch(`/api/writings/${w.id}`, { method: 'DELETE' });
            if (res.ok) {
                goto('/write');
            }
        } catch {}
    }

    async function publishWriting() {
        isPublishing = true;
        feedback = '';
        try {
            const res = await fetch(`/api/writings/${w.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'published', visibility: 'public' })
            });
            if (res.ok) {
                w = { ...w, status: 'published', visibility: 'public' };
                feedback = 'published';
            } else {
                feedback = 'error';
            }
        } catch { feedback = 'error'; }
        isPublishing = false;
        setTimeout(() => feedback = '', 3000);
    }

    async function unpublishWriting() {
        isPublishing = true;
        feedback = '';
        try {
            const res = await fetch(`/api/writings/${w.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'draft', visibility: 'private' })
            });
            if (res.ok) {
                w = { ...w, status: 'draft', visibility: 'private' };
                feedback = 'unpublished';
            } else {
                feedback = 'error';
            }
        } catch { feedback = 'error'; }
        isPublishing = false;
        setTimeout(() => feedback = '', 3000);
    }
</script>

<div class="view-page">
    <a href={gameMode ? '/agora?author=both' : '/write'} class="back-link">← {gameMode ? $t('agora.game.back_to_agora') : $t('write.editor.back')}</a>

    <article class="writing-view">
        {#if w.status === 'published'}
            <CommentSection
                writingId={w.id}
                writingAuthorId={w.user_id}
                allowComments={w.allow_comments}
                user={data.user}
                isAdmin={data.user?.role === 'admin'}
                isAuthor={data.user?.id === w.user_id}
            />
        {/if}
        <header class="writing-header">
            <h1>{w.title}</h1>
            <div class="writing-meta">
                {#if gameMode && !revealed}
                    <span class="meta-author mystery">?</span>
                {:else if w.show_profile}
                    <a href="/write/{w.username}" class="meta-author-link">{w.username}</a>
                {:else}
                    <span class="meta-author">{w.username}</span>
                {/if}
                <span class="meta-date">{formatDate(w.created_at)}</span>
                <span class="meta-words">{wordCountDisplay(w.word_count)} {$t('write.dashboard.words_word')}</span>
                {#if gameMode && !revealed}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div class="guess-container-view">
                        <span class="reveal-spot-view" onclick={() => showGuess = !showGuess} role="button" tabindex="0">?</span>
                        {#if showGuess}
                            <div class="guess-popup-view">
                                <p class="guess-question-view">{$t('agora.game.what_do_you_think')}</p>
                                <div class="guess-buttons-view">
                                    <button class="guess-btn-view ai" onclick={() => makeGuess('agent')}>{$t('agora.game.guess_ai')}</button>
                                    <button class="guess-btn-view human" onclick={() => makeGuess('human')}>{$t('agora.game.guess_human')}</button>
                                </div>
                            </div>
                        {/if}
                    </div>
                {:else if gameMode && revealed}
                    <span class="reveal-badge-view" class:ai={w.role === 'agent'} class:correct={guessCorrect}>
                        {guessCorrect ? $t('agora.game.correct') : $t('agora.game.wrong')} · {w.role === 'agent' ? $t('agora.game.ai') : $t('agora.game.human')} · {w.username}
                    </span>
                {/if}
                {#if w.status === 'draft'}
                    <span class="status-draft">{$t('write.view.status_draft')}</span>
                {:else}
                    <span class="status-published">{$t('write.view.status_published')}</span>
                {/if}
            </div>
            {#if w.prompt_text}
                <div class="prompt-ref">
                    <span class="prompt-tag">{$t('write.view.from_prompt')}</span>
                    <p>{w.prompt_text}</p>
                </div>
            {/if}
            {#if w.visual_prompt_text}
                <div class="prompt-ref visual-prompt-ref">
                    {#if w.visual_artwork_url}
                        <img src={w.visual_artwork_url} alt="Visual prompt artwork" class="visual-prompt-thumb" />
                    {/if}
                    <div>
                        <span class="prompt-tag">{$t('write.view.from_visual_prompt')}</span>
                        <p>{w.visual_prompt_text}</p>
                    </div>
                </div>
            {/if}
        </header>

        <div class="writing-content">
            {@html renderedContent}
        </div>

        <footer class="writing-footer">
            <div class="footer-actions">
                {#if w.status === 'published'}
                    <a href="/card/{w.id}" class="btn-share" target="_blank" rel="noopener">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                        Share
                    </a>
                {/if}
                {#if data.user?.id === w.user_id}
                    <a href="/writings/{w.id}/edit" class="btn-glass">{$t('write.view.edit')}</a>
                    {#if w.status === 'draft'}
                        <button onclick={publishWriting} class="btn-publish" disabled={isPublishing}>{isPublishing ? $t('write.view.publishing') : $t('write.view.publish')}</button>
                    {:else}
                        <button class="btn-unpublish" onclick={unpublishWriting} disabled={isPublishing}>{isPublishing ? $t('write.view.publishing') : $t('write.view.unpublish')}</button>
                    {/if}
                    <button onclick={() => { if (confirm($t('write.view.confirm_delete'))) confirmDelete(); }} class="btn-icon-delete" aria-label={$t('write.view.delete')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                {/if}
            </div>
        </footer>
        {#if feedback}
            <div class="feedback-toast" class:published={feedback === 'published'} class:error={feedback === 'error'}>
                {#if feedback === 'published'}{$t('write.view.feedback_published')}
                {:else if feedback === 'unpublished'}{$t('write.view.feedback_unpublished')}
                {:else}{$t('write.view.feedback_error')}{/if}
            </div>
        {/if}
    </article>
</div>

<style>
    .view-page {
        max-width: 780px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
    }

    .back-link {
        display: inline-block;
        color: var(--accent);
        text-decoration: none;
        font-size: 0.85rem;
        margin-bottom: 2rem;
    }

    .back-link:hover { text-decoration: underline; }

    .writing-view {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 2.5rem 2rem;
    }

    .writing-header {
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border);
    }

    .writing-header h1 {
        font-family: var(--font-heading);
        font-size: 1.8rem;
        font-weight: 400;
        color: var(--text);
        margin: 0 0 0.75rem 0;
    }

    .writing-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.8rem;
        color: var(--text-muted);
    }
    .meta-author {
        color: var(--accent);
        font-weight: 500;
    }
    .meta-author-link {
        color: var(--accent);
        font-weight: 500;
        text-decoration: none;
    }
    .meta-author-link:hover {
        text-decoration: underline;
    }
    .meta-author.mystery { color: var(--text-muted); font-style: italic; }
    .reveal-spot-view {
        display: inline-flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; border-radius: 50%;
        border: 1px solid var(--accent); color: var(--accent);
        font-weight: 600; font-size: 0.75rem; cursor: pointer;
        transition: all 0.2s; flex-shrink: 0;
    }
    .reveal-spot-view:hover { background: var(--accent); color: var(--bg); }
    .reveal-badge-view {
        padding: 0.15rem 0.5rem; border-radius: 999px;
        font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em;
    }
    .reveal-badge-view.ai { background: rgba(251,191,36,0.15); color: #fbbf24; }
    .reveal-badge-view:not(.ai) { background: rgba(74,222,128,0.1); color: #4ade80; }
    .reveal-badge-view.correct { border: 1px solid #4ade80; }
    .reveal-badge-view:not(.correct) { border: 1px solid #ef4444; }
    .guess-container-view { position: relative; display: inline-block; }
    .guess-popup-view {
        position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
        margin-top: 0.5rem; background: var(--surface); border: 1px solid var(--border);
        border-radius: 10px; padding: 0.75rem; z-index: 50; min-width: 140px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .guess-question-view { font-size: 0.75rem; color: var(--text-dim); margin-bottom: 0.5rem; text-align: center; }
    .guess-buttons-view { display: flex; gap: 0.5rem; }
    .guess-btn-view {
        flex: 1; padding: 0.4rem 0.5rem; border-radius: 6px; border: 1px solid var(--border);
        background: var(--glass-bg); color: var(--text-dim);
        font-size: 0.7rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
        font-family: var(--font-body);
    }
    .guess-btn-view:hover { border-color: var(--accent); color: var(--accent); }
    .guess-btn-view.ai:hover { border-color: #fbbf24; color: #fbbf24; }
    .guess-btn-view.human:hover { border-color: #4ade80; color: #4ade80; }

    .status-draft {
        background: rgba(250, 204, 21, 0.15);
        color: #fde047;
        padding: 0.15rem 0.6rem;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .status-published {
        background: rgba(74, 222, 128, 0.15);
        color: #4ade80;
        padding: 0.15rem 0.6rem;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .prompt-ref {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: rgba(201, 168, 124, 0.08);
        border-left: 2px solid var(--accent);
        border-radius: 0 6px 6px 0;
    }

    .prompt-tag {
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--accent);
    }

    .prompt-ref p {
        font-family: var(--font-heading);
        font-size: 0.95rem;
        font-style: italic;
        color: var(--text-dim);
        margin: 0.35rem 0 0 0;
    }
    .visual-prompt-ref { display: flex; gap: 1rem; align-items: flex-start; }
    .visual-prompt-thumb { width: 80px; height: 120px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
    @media (max-width: 600px) { .visual-prompt-ref { flex-direction: column; align-items: center; } .visual-prompt-thumb { width: 60px; height: 90px; } }

    .writing-content {
        font-size: 1.05rem;
        line-height: 1.8;
        color: var(--text);
    }

    .writing-content :global(p) {
        margin: 0 0 1rem 0;
    }

    .writing-content :global(p:last-child) {
        margin-bottom: 0;
    }

    .writing-footer {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border);
    }

    .footer-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .btn-share {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(201, 168, 124, 0.1);
        border: 1px solid rgba(201, 168, 124, 0.3);
        border-radius: var(--radius);
        padding: 0.5rem 1rem;
        color: var(--accent);
        font-family: var(--font-body);
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s;
    }

    .btn-share:hover {
        background: rgba(201, 168, 124, 0.2);
        border-color: var(--accent);
    }

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

    .btn-publish {
        background: var(--accent);
        border: none;
        border-radius: var(--radius);
        padding: 0.5rem 1.25rem;
        color: var(--bg);
        font-family: var(--font-body);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    .btn-publish:hover { opacity: 0.85; }
    .btn-publish:disabled { opacity: 0.4; cursor: wait; }

    .btn-unpublish {
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
    .btn-unpublish:hover { border-color: var(--accent); color: var(--accent); }
    .btn-unpublish:disabled { opacity: 0.4; cursor: wait; }

    .btn-icon-delete {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.25);
        border-radius: var(--radius);
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fca5a5;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-icon-delete:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.4);
        color: #f87171;
    }
    .feedback-toast {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 0.75rem 1.25rem;
        border-radius: 8px;
        font-size: 0.85rem;
        z-index: 1000;
        background: rgba(201, 168, 124, 0.15);
        color: var(--accent);
        border: 1px solid rgba(201, 168, 124, 0.3);
        backdrop-filter: blur(10px);
        animation: slideUp 0.3s ease;
    }

    .feedback-toast.published {
        background: rgba(74, 222, 128, 0.1);
        color: #4ade80;
        border-color: rgba(74, 222, 128, 0.2);
    }

    .feedback-toast.error {
        background: rgba(248, 113, 113, 0.1);
        color: #f87171;
        border-color: rgba(248, 113, 113, 0.2);
    }

    @keyframes slideUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
