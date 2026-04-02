<!-- src/lib/components/SearchModal.svelte -->
<script>
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { t } from '$lib/i18n';

    let { serverLocale = 'en' } = $props();

    let isOpen = $state(false);
    let query = $state('');
    let results = $state([]);
    let isLoading = $state(false);
    let hasSearched = $state(false);
    let debounceTimer = null;

    function toggleSearch() {
        isOpen = !isOpen;
        if (isOpen && browser) {
            setTimeout(() => {
                const input = document.querySelector('.search-input');
                if (input) input.focus();
            }, 100);
        }
    }

    async function doSearch() {
        if (!query.trim() || query.trim().length < 2) return;
        isLoading = true;
        hasSearched = true;

        try {
            const params = new URLSearchParams({ q: query.trim() });
            const res = await fetch(`/api/search?${params}`);
            const data = await res.json();
            results = data.results || [];
        } catch {
            results = [];
        } finally {
            isLoading = false;
        }
    }

    function onInput(e) {
        query = e.target.value;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(doSearch, 400);
    }

    function handleKeydown(event) {
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
            event.preventDefault();
            toggleSearch();
        }
        if (event.key === 'Escape' && isOpen) {
            isOpen = false;
            query = '';
            results = [];
            hasSearched = false;
        }
    }

    function goToWriting(id) {
        isOpen = false;
        goto(`/writings/${id}`);
    }

    function formatDate(d) {
        if (!d) return '';
        return new Date(d.replace(' ', 'T')).toLocaleDateString(serverLocale === 'fr' ? 'fr-FR' : serverLocale === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- FAB -->
<button class="search-fab" onclick={toggleSearch} aria-label="Search">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
    </svg>
</button>

{#if isOpen}
    <div class="search-overlay" onclick={() => { isOpen = false; }}>
        <div class="search-modal" onclick={(e) => e.stopPropagation()}>
            <div class="search-header">
                <h2>{$t('agora.search.title')}</h2>
                <button class="close-btn" onclick={() => { isOpen = false; }} aria-label="Close">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div class="search-body">
                <input
                    type="text"
                    class="search-input"
                    placeholder={$t('agora.search.placeholder')}
                    value={query}
                    oninput={onInput}
                    onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
                />

                {#if isLoading}
                    <div class="search-status">
                        <div class="spinner"></div>
                    </div>
                {:else if hasSearched && results.length === 0}
                    <div class="search-status">
                        <p class="empty-msg">{query}"</p>
                        <p class="empty-hint">{$t('agora.search.no_results')}</p>
                    </div>
                {:else if results.length > 0}
                    <div class="search-results">
                        {#each results as w (w.id)}
                            <button class="result-card" onclick={() => goToWriting(w.id)}>
                                <div class="result-header">
                                    <span class="result-locale">{w.locale?.toUpperCase()}</span>
                                    <span>{Math.round(w.score * 100)}% {$t('agora.search.match')}</span>
                                </div>
                                <h3 class="result-title">{w.title}</h3>
                                <p class="result-excerpt">{w.excerpt}</p>
                                <div class="result-meta">
                                    <span>{w.username}</span>
                                    <span>·</span>
                                    <span>{w.word_count} words</span>
                                    <span>·</span>
                                    <span>{formatDate(w.created_at)}</span>
                                </div>
                            </button>
                        {/each}
                    </div>
                {:else}
                    <div class="search-status">
                        <p class="hint-text">{$t('agora.search.hint')}</p>
                    </div>
                {/if}
            </div>

            <div class="search-footer">
                <p><kbd>Enter</kbd> {$t('agora.search.enter')} · <kbd>Esc</kbd> {$t('agora.search.esc')}</p>
            </div>
        </div>
    </div>
{/if}

<style>
    .search-fab {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: var(--surface, #141417);
        color: var(--accent, #c9a87c);
        border: 1px solid var(--border, rgba(255,255,255,0.1));
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        z-index: 999;
    }
    .search-fab:hover { border-color: var(--accent); transform: scale(1.05); }

    .search-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
    }

    .search-modal {
        background: var(--bg, #09090b);
        border: 1px solid var(--border, rgba(255,255,255,0.1));
        border-radius: 16px;
        width: 100%;
        max-width: 640px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .search-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border);
    }
    .search-header h2 { color: #fff; font-size: 1.1rem; margin: 0; font-family: var(--font-heading, serif); }
    .close-btn { background: none; border: none; cursor: pointer; color: var(--text-dim); padding: 0.25rem; }
    .close-btn:hover { color: #fff; }

    .search-body { flex: 1; overflow-y: auto; padding: 1rem 1.5rem; }

    .search-input {
        width: 100%;
        padding: 0.75rem 1rem;
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: 8px;
        color: var(--text-body, #e4e4e7);
        font-family: var(--font-body);
        font-size: 1rem;
        outline: none;
        box-sizing: border-box;
        margin-bottom: 1rem;
    }
    .search-input:focus { border-color: var(--accent); }

    .search-status {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 3rem 1rem;
        color: var(--text-dim);
    }

    .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--border);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-msg { font-size: 0.95rem; }
    .hint-text { font-size: 0.85rem; color: var(--text-muted); }

    .search-results { display: flex; flex-direction: column; gap: 0.75rem; }

    .result-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1rem 1.25rem;
        text-align: left;
        cursor: pointer;
        transition: border-color 0.2s;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        width: 100%;
    }
    .result-card:hover { border-color: var(--accent); }

    .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    .result-locale {
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        background: rgba(255,255,255,0.05);
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
    }
    .result-score {
        font-size: 0.7rem;
        color: var(--accent);
        font-weight: 600;
    }

    .result-title {
        font-family: var(--font-heading, serif);
        font-size: 1.05rem;
        color: #fff;
        margin: 0 0 0.4rem 0;
        line-height: 1.3;
    }

    .result-excerpt {
        font-size: 0.85rem;
        color: var(--text-dim);
        line-height: 1.5;
        margin: 0 0 0.5rem 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .result-meta {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .search-footer {
        padding: 0.75rem 1.5rem;
        border-top: 1px solid var(--border);
    }
    .search-footer p { margin: 0; font-size: 0.8rem; color: var(--text-muted); text-align: center; }
    kbd {
        display: inline-block;
        padding: 0.1rem 0.35rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 4px;
        font-size: 0.7rem;
        font-family: monospace;
    }

    @media (max-width: 768px) {
        .search-fab { bottom: 1rem; right: 1rem; width: 46px; height: 46px; }
        .search-modal { max-height: 100vh; border-radius: 0; }
    }
</style>
