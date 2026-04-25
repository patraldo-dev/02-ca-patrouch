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
    import Image3DManipulator from '$lib/components/Image3DManipulator.svelte';
    import { browser } from '$app/environment';

    import { onMount } from 'svelte';

    let { data } = $props();

    // Inspiration ticker — slow continuous marquee
    let quotes = $state(data.tickerQuotes || []);
    onMount(() => {
        invalidateAll();
    });

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
    let isAccepting = $state(false);
    let editorTitle = $state(data.latestDraft?.title || '');
    let editorContent = $state(data.latestDraft?.content || '');
    let editorWordCount = $derived(editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0);
    let editorVisibility = $state('public');
    let timedMode = $state(false);
    let timerDuration = $state(15);
    let timerSeconds = $state(0);
    let timerRunning = $state(false);
    let timerFinished = $state(false);
    let timerInterval = null;
    let timerWordsAtStart = $state(0);
    let editorAiAssisted = $state(false);
    let dictating = $state(false);
    function showToast(msg) { editorMessage = msg; setTimeout(() => editorMessage = '', 3000); }
    let recognition = $state(null);
    function toggleDictation() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            showToast('Speech recognition not supported in this browser');
            return;
        }
        if (dictating && recognition) {
            recognition.stop();
            dictating = false;
            return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SR();
        recognition.lang = data.serverLocale || 'en';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (e) => {
            const textarea = document.querySelector('textarea[bind:value]');
            if (!textarea) {
                // Fallback: append to editorContent
                let finalText = editorContent;
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' ';
                }
                editorContent = finalText;
                return;
            }
            // Insert at cursor position
            const cursorPos = textarea.selectionStart;
            let insertText = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                insertText += e.results[i][0].transcript;
            }
            const before = editorContent.slice(0, cursorPos);
            const after = editorContent.slice(cursorPos);
            editorContent = before + insertText + after;
            // Restore cursor position
            requestAnimationFrame(() => {
                textarea.selectionStart = textarea.selectionEnd = cursorPos + insertText.length;
            });
        };
        recognition.onerror = (e) => { showToast('❌ Voice: ' + (e.error || 'error')); dictating = false; };
        recognition.onend = () => { dictating = false; };
        recognition.start();
        dictating = true;
        showToast('🎙️ Listening...');
    }

    let editorSaving = $state(false);
    let editorMessage = $state('');
    let stats = $state(data.stats || null);
    let error = $state(null);
    let promptMode = $state('text'); // 'text' | 'visual'
    let visualPrompt = $state(null);
    let visualLoading = $state(false);
    let visualError = $state(null);

    function catLabel(key) {
        const k = 'write.category.' + key;
        const label = $t(k);
        return label !== k ? label : key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    async function loadVisualPrompt() {
        visualLoading = true;
        visualError = null;
        visualPrompt = null;
        try {
            const loc = getLocale() || 'en';
            const res = await fetch(`/api/write/art-prompt?locale=${loc}`);
            if (res.ok) {
                const d = await res.json();
                if (d.error) {
                    visualError = d.error;
                } else {
                    visualPrompt = d;
                }
            } else {
                visualError = 'server_' + res.status;
            }
        } catch (err) {
            visualError = 'network';
        }
        visualLoading = false;
    }

    async function handleAction(action) {
        isAccepting = true;
        if (action === 'passed') isPassing = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
            const res = await fetch('/api/write/today/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, locale: getLocale() }),
                signal: controller.signal
            });
            if (res.ok) {
                const d = await res.json();
                if (action === 'passed') {
                    prompt = d.prompt;
                    promptSource = d.promptSource || 'personal';
                    passesRemaining = d.passesRemaining;
                    passesUsed = d.passesUsed;
                    userAction = null;
                    loadStats();
                    track('pass_prompt', prompt?.id);
                } else if (action === 'accepted') {
                    userAction = 'accepted';
                    promptId = d.promptId;
                    editorTitle = '';
                    editorContent = '';
                    loadStats();
                    track('accept_prompt', d.promptId);
                } else if (action === 'completed') {
                    userAction = 'completed';
                    loadStats();
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error('Action error:', res.status, errData);
                if (res.status === 429) {
                    passesRemaining = 0;
                }
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                error = 'Request timed out';
            } else {
                error = $t('write.dashboard.error_generic');
            }
        } finally {
            clearTimeout(timeout);
            isPassing = false;
            isAccepting = false;
        }
    }

    function viewWriting(id) { goto('/writings/' + id); }

    function startTimer() {
        timerSeconds = timerDuration * 60;
        timerRunning = true;
        timerFinished = false;
        timerWordsAtStart = editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0;
        timerInterval = setInterval(() => {
            timerSeconds--;
            if (timerSeconds <= 0) {
                clearInterval(timerInterval);
                timerRunning = false;
                timerFinished = true;
                timedMode = false;
                playAlarm();
            }
        }, 1000);
    }
    function stopTimer() {
        clearInterval(timerInterval);
        timerRunning = false;
        timerFinished = true;
        timedMode = false;
    }
    function resetTimer() {
        clearInterval(timerInterval);
        timerRunning = false;
        timerFinished = false;
        timedMode = false;
        timerSeconds = 0;
    }
    let timerWordsWritten = $derived(Math.max(0, editorWordCount - timerWordsAtStart));
    let timerDisplay = $derived({
        min: Math.floor(timerSeconds / 60).toString().padStart(2, '0'),
        sec: (timerSeconds % 60).toString().padStart(2, '0')
    });

    function playAlarm() {
        try {
            const ctx = new AudioContext();
            const playBeep = (time) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 880;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.3, ctx.currentTime + time);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.3);
                osc.start(ctx.currentTime + time);
                osc.stop(ctx.currentTime + time + 0.3);
            };
            playBeep(0);
            playBeep(0.4);
            playBeep(0.8);
            playBeep(1.2);
            playBeep(1.6);
            playBeep(2.0);
            playBeep(2.4);
            setTimeout(() => ctx.close(), 4000);
        } catch {}
    }

    async function handleSave() {
        if (!editorTitle.trim() || !editorContent.trim()) return;
        editorSaving = true;
        editorMessage = '';
        try {
            const res = await fetch('/api/writings/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editorTitle, content: editorContent, promptId: promptId || null, aiAssisted: editorAiAssisted, visualPromptText: promptMode === 'visual' ? visualPrompt?.prompt : null, visualArtworkUrl: promptMode === 'visual' ? visualPrompt?.artwork?.imageUrl : null })
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
                body: JSON.stringify({ title: editorTitle, content: editorContent, promptId: promptId || null, aiAssisted: editorAiAssisted, visibility: editorVisibility, visualPromptText: promptMode === 'visual' ? visualPrompt?.prompt : null, visualArtworkUrl: promptMode === 'visual' ? visualPrompt?.artwork?.imageUrl : null })
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
    <div class="inspiration-tape" role="status" aria-label="Writing inspiration">
        <div class="ticker-marquee">
            <div class="ticker-track">{#each [...quotes, ...quotes] as quote}<span class="ticker-item">✍️ {quote}</span><span class="ticker-divider">🌿</span>{/each}</div>
        </div>
    </div>
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
                                <button class="btn-accept" onclick={() => handleAction('accepted')} disabled={isAccepting}>{isAccepting ? '…' : $t('write.dashboard.accept')}</button>
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
                        {:else if visualError}
                            <div class="visual-error">
                                <p>{$t('write.art.error')}</p>
                                <button class="btn-glass" onclick={loadVisualPrompt}>{$t('write.art.retry')}</button>
                            </div>
                        {:else if visualPrompt}
                            <div class="art-3d-wrapper">
                                <Image3DManipulator imageUrl={visualPrompt.artwork.imageUrl} />
                            </div>
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
                            <div class="art-3d-wrapper">
                                <Image3DManipulator imageUrl={data.artwork.imageUrl} />
                            </div>
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
                    <h2 class="editor-heading">{editorContent ? $t('write.editor.heading_continue') : $t('write.editor.heading')}</h2>
                    {#if prompt && promptId && promptMode === 'text'}
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
                        <div class="editor-field full" style="position:relative;">
                            <label>{$t('write.editor.content')} <span class="word-count">{editorWordCount} {$t('write.editor.words')}</span></label>
                            <textarea bind:value={editorContent} lang={data.serverLocale || 'en'} spellcheck="true" placeholder={$t('write.editor.content_placeholder')} rows="16" required></textarea>
                            <button class="mic-btn {dictating ? 'mic-active' : ''}" onclick={toggleDictation} title="Dictate" aria-label="Voice dictation">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                            </button>
                            <button class="copy-inline" onclick={() => navigator.clipboard.writeText(editorContent)} title="Copy">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                            </button>
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
                                <span class="info-icon" title={$t('write.editor.ai_tooltip')} onclick={(e) => e.preventDefault()} onmousedown={(e) => e.preventDefault()} ontouchstart={(e) => e.preventDefault()}>ⓘ</span>
                            </label>
                        </div>
                        {#if editorMessage}
                            <div class="save-toast">{editorMessage}</div>
                        {/if}
                        {#if timerRunning}
                            <div class="timer-bar">
                                <div class="timer-display">{timerDisplay.min}:{timerDisplay.sec}</div>
                                <div class="timer-progress"><div class="timer-fill" style="width: {((timerDuration * 60 - timerSeconds) / (timerDuration * 60)) * 100}%"></div></div>
                                <span class="timer-words">+{timerWordsWritten} {$t('write.editor.words')}</span>
                                <button class="timer-stop" onclick={stopTimer}>{$t('write.timer.stop')}</button>
                            </div>
                        {/if}
                        {#if timerFinished && !timerRunning}
                            <div class="timer-done">
                                <span>⏱ {timerWordsWritten} {$t('write.timer.words_in')} {timerDuration} {$t('write.timer.minutes')}</span>
                                <button class="timer-dismiss" onclick={resetTimer}>{$t('write.timer.dismiss')}</button>
                            </div>
                        {/if}
                        {#if !timerRunning && !timerFinished && !timedMode}
                            <button class="btn-timer" onclick={() => timedMode = true}>⏱ {$t('write.timer.start_btn')}</button>
                        {/if}
                        {#if timedMode && !timerRunning}
                            <div class="timer-setup">
                                <select bind:value={timerDuration}>
                                    <option value={5}>5 {$t('write.timer.minutes')}</option>
                                    <option value={10}>10 {$t('write.timer.minutes')}</option>
                                    <option value={15}>15 {$t('write.timer.minutes')}</option>
                                    <option value={20}>20 {$t('write.timer.minutes')}</option>
                                    <option value={30}>30 {$t('write.timer.minutes')}</option>
                                    <option value={45}>45 {$t('write.timer.minutes')}</option>
                                    <option value={60}>60 {$t('write.timer.minutes')}</option>
                                </select>
                                <button class="btn-timer-go" onclick={startTimer}>{$t('write.timer.go')}</button>
                                <button class="timer-cancel" onclick={() => timedMode = false}>✕</button>
                            </div>
                        {/if}
                        <div class="editor-actions">
                            <button type="button" class="btn-save" onclick={handleSave} disabled={editorSaving}>{$t('write.editor.save_draft')}</button>
                            {#if editorVisibility === 'public'}
                                <label class="disclosure-check">
                                    <input type="checkbox" checked />
                                    <span>{$t('disclosure.publish_consent')}</span>
                                </label>
                            {/if}
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
                    <a href="/stats" class="sidebar-stats-link">📊 {$t('nav.stats')}</a>
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
    .inspiration-tape { background: var(--surface); border-bottom: 1px solid var(--border); overflow: hidden; white-space: nowrap; padding: 0.6rem 0; margin-bottom: 1rem; border-radius: 8px; }
    .ticker-marquee { overflow: hidden; }
    .ticker-track { display: inline-block; animation: marquee 1800s linear infinite; }
    .ticker-item { font-size: 0.85rem; color: var(--muted); font-style: italic; padding: 0 3rem; }
    @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
    }
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
        overflow-wrap: break-word;
        word-break: break-word;
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
    .info-icon { color: var(--text-dim); opacity: 0.5; font-size: 0.75rem; cursor: help; display: inline-block; pointer-events: auto; }
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
        flex-wrap: wrap;
    }
    .disclosure-check {
        display: flex;
        align-items: flex-start;
        gap: 0.4rem;
        font-size: 0.72rem;
        color: var(--text-muted);
        line-height: 1.4;
        max-width: 360px;
        cursor: pointer;
    }
    .disclosure-check input { margin-top: 0.1rem; }
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
    .sidebar-stats-link { display: inline-flex; align-items: center; gap: 0.3rem; color: var(--text-muted); font-size: 0.75rem; text-decoration: none; padding: 0.3rem 0; transition: color 0.2s; }
    .sidebar-stats-link:hover { color: var(--accent); }

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
        display: flex;
        flex-direction: column;
        gap: 1rem;
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
    .visual-error { text-align: center; padding: 2rem; color: var(--text-dim); }
    .visual-error p { margin-bottom: 1rem; font-size: 0.9rem; }
    .art-3d-wrapper { height: 320px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); margin-bottom: 1rem; }
    @media (max-width: 768px) { .art-3d-wrapper { height: 250px; } }
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
        overflow-wrap: break-word;
        word-break: break-word;
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

    /* Timer */
    .timer-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; padding: 0.6rem 0.75rem; background: var(--surface); border: 1px solid var(--accent); border-radius: 8px; }
    .timer-display { font-family: 'Inter', monospace; font-size: 1.2rem; font-weight: 600; color: var(--accent); min-width: 3.5rem; }
    .timer-progress { flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
    .timer-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 1s linear; }
    .timer-words { font-size: 0.8rem; color: var(--text-dim); white-space: nowrap; }
    .timer-stop { background: none; border: 1px solid rgba(248,113,113,0.3); color: #f87171; border-radius: 6px; padding: 0.3rem 0.6rem; font-size: 0.8rem; cursor: pointer; font-family: var(--font-body); }
    .timer-stop:hover { border-color: #f87171; }
    .timer-done { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; margin-bottom: 0.75rem; background: rgba(201,168,124,0.1); border: 1px solid var(--accent); border-radius: 8px; color: var(--accent); font-size: 0.95rem; font-weight: 500; }
    .timer-dismiss { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 1rem; padding: 0.2rem 0.4rem; }
    .btn-timer { background: none; border: 1px solid var(--border); color: var(--text-dim); border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.85rem; cursor: pointer; font-family: var(--font-body); margin-bottom: 0.75rem; transition: all 0.2s; }
    .btn-timer:hover { border-color: var(--accent); color: var(--accent); }
    .timer-setup { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
    .timer-setup select { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; color: var(--text); padding: 0.4rem 0.5rem; font-size: 0.85rem; font-family: var(--font-body); }
    .btn-timer-go { background: var(--accent); color: var(--bg); border: none; border-radius: 6px; padding: 0.4rem 1.2rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: var(--font-body); }
    .btn-timer-go:hover { opacity: 0.85; }
    .timer-cancel { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 1rem; padding: 0.2rem 0.4rem; }
</style>
