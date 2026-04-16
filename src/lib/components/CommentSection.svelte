<script>
    import { t } from '$lib/i18n';
    import { get } from 'svelte/store';
    import { page } from '$app/stores';
    import CommentItem from './CommentItem.svelte';

    let { writingId, writingAuthorId, allowComments = 1, user, isAdmin = false, isAuthor = false } = $props();

    let comments = $state([]);
    let total = $state(0);
    let currentPage = $state(1);
    let sort = $state('newest');
    let commentText = $state('');
    let submitting = $state(false);
    let error = $state('');
    let loading = $state(false);
    let commentsEnabled = $state(allowComments === 1);

    const LIMIT = 50;
    const MAX_CHARS = 1500;

    // Build a map of comment id -> username for reply indicators
    let usernameMap = $derived.by(() => {
        const m = {};
        for (const c of comments) {
            m[c.id] = c.username;
        }
        return m;
    });

    // Enrich comments with parent_username
    let enrichedComments = $derived(comments.map(c => ({
        ...c,
        parent_username: c.parent_id ? usernameMap[c.parent_id] : null
    })));

    async function fetchComments() {
        loading = true;
        try {
            const params = new URLSearchParams({ sort, page: currentPage, limit: LIMIT });
            const res = await fetch(`/api/writings/${writingId}/comments?${params}`);
            if (res.ok) {
                const data = await res.json();
                comments = data.comments;
                total = data.total;
            }
        } catch { /* silent */ }
        loading = false;
    }

    $effect(() => {
        // Fetch on mount and when sort/page changes
        fetchComments();
    });

    async function submitComment() {
        if (!commentText.trim() || submitting) return;
        if (commentText.length > MAX_CHARS) return;

        submitting = true;
        error = '';
        try {
            const res = await fetch(`/api/writings/${writingId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentText.trim() })
            });
            if (res.status === 201) {
                const data = await res.json();
                comments = [data.comment, ...comments];
                total++;
                commentText = '';
            } else if (res.status === 422) {
                const data = await res.json();
                error = get(t)('comments.error_moderation');
            } else {
                error = 'Failed to post comment';
            }
        } catch {
            error = 'Network error';
        }
        submitting = false;
        setTimeout(() => error = '', 4000);
    }

    async function handleLike(commentId, liked) {
        comments = comments.map(c =>
            c.id === commentId ? { ...c, liked, likes_count: liked ? c.likes_count + 1 : c.likes_count - 1 } : c
        );
    }

    async function handleReply(parentId, content) {
        try {
            const res = await fetch(`/api/writings/${writingId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, parent_id: parentId })
            });
            if (res.status === 201) {
                const data = await res.json();
                comments = [...comments, data.comment];
                total++;
            }
        } catch {}
    }

    async function handlePick(commentId, is_featured) {
        comments = comments.map(c =>
            c.id === commentId ? { ...c, is_featured } : c
        );
    }

    async function toggleComments() {
        try {
            const res = await fetch(`/api/writings/${writingId}/comments-toggle`, { method: 'PUT' });
            if (res.ok) {
                const data = await res.json();
                commentsEnabled = data.allow_comments === 1;
            }
        } catch {}
    }

    function loadMore() {
        currentPage++;
    }

    let hasMore = $derived(comments.length < total);
    let userRole = $derived(user?.role || 'user');
</script>

<section class="comment-section">
    <!-- Header -->
    <div class="comment-header">
        <h3>{$t('comments.title')} <span class="comment-count">({total})</span></h3>
        <div class="comment-controls">
            <select bind:value={sort} class="sort-select">
                <option value="newest">{$t('comments.sort_newest')}</option>
                <option value="oldest">{$t('comments.sort_oldest')}</option>
                <option value="liked">{$t('comments.sort_liked')}</option>
                <option value="picks">{$t('comments.sort_picks')}</option>
            </select>
            {#if isAuthor || isAdmin}
                <button class="toggle-btn" onclick={toggleComments}>
                    {commentsEnabled ? $t('comments.comments_off') : $t('comments.toggle_comments')}
                </button>
            {/if}
        </div>
    </div>

    <!-- New comment form -->
    {#if user && commentsEnabled}
        <div class="comment-form">
            {#if error}
                <div class="form-error">{error}</div>
            {/if}
            <textarea
                bind:value={commentText}
                maxlength={MAX_CHARS}
                placeholder={$t('comments.placeholder')}
                rows="3"
                class="comment-textarea"
            ></textarea>
            <div class="form-footer">
                <span class="char-count" class:over={commentText.length > MAX_CHARS}>{commentText.length}/{MAX_CHARS}</span>
                <button class="btn-submit-comment" onclick={submitComment} disabled={!commentText.trim() || submitting}>
                    {submitting ? '...' : $t('comments.submit')}
                </button>
            </div>
        </div>
    {:else if !user}
        <div class="login-prompt">
            <a href="/auth/login">{$t('comments.login_required')}</a>
        </div>
    {:else if !commentsEnabled}
        <div class="comments-disabled">{$t('comments.comments_off')}</div>
    {/if}

    <!-- Comment list -->
    <div class="comment-list">
        {#if loading && comments.length === 0}
            <div class="loading">{$t('comments.loading')}</div>
        {:else if comments.length === 0}
            <div class="no-comments">{$t('comments.no_comments')}</div>
        {:else}
            {#each enrichedComments as comment (comment.id)}
                <CommentItem
                    {comment}
                    {user}
                    {writingAuthorId}
                    {isAdmin}
                    onLike={handleLike}
                    onReply={handleReply}
                    onPick={handlePick}
                />
            {/each}
            {#if hasMore}
                <button class="load-more" onclick={loadMore} disabled={loading}>
                    {loading ? '...' : 'Load more'}
                </button>
            {/if}
        {/if}
    </div>
</section>

<style>
    .comment-section {
        margin-top: 2rem;
        border-top: 1px solid var(--border);
        padding-top: 1.5rem;
    }
    .comment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
        flex-wrap: wrap;
        gap: 0.75rem;
    }
    .comment-header h3 {
        font-family: var(--font-heading);
        font-size: 1.2rem;
        font-weight: 400;
        color: var(--text);
    }
    .comment-count {
        color: var(--text-muted);
        font-weight: 400;
    }
    .comment-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    .sort-select {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.8rem;
        padding: 0.35rem 0.6rem;
        cursor: pointer;
    }
    .sort-select:focus { outline: none; border-color: var(--accent); }
    .toggle-btn {
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text-muted);
        font-family: var(--font-body);
        font-size: 0.75rem;
        padding: 0.35rem 0.6rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .toggle-btn:hover { border-color: var(--accent); color: var(--accent); }

    .comment-form {
        margin-bottom: 1.5rem;
    }
    .form-error {
        color: #f87171;
        font-size: 0.8rem;
        margin-bottom: 0.4rem;
    }
    .comment-textarea {
        width: 100%;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.9rem;
        padding: 0.75rem 1rem;
        resize: vertical;
        min-height: 80px;
        line-height: 1.6;
    }
    .comment-textarea:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-bg);
    }
    .comment-textarea::placeholder { color: var(--text-muted); }
    .form-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.5rem;
    }
    .char-count {
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    .char-count.over { color: #f87171; }
    .btn-submit-comment {
        background: var(--accent);
        border: none;
        border-radius: var(--radius);
        color: var(--bg);
        font-family: var(--font-body);
        font-size: 0.85rem;
        font-weight: 600;
        padding: 0.5rem 1.25rem;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    .btn-submit-comment:hover { opacity: 0.85; }
    .btn-submit-comment:disabled { opacity: 0.4; cursor: default; }

    .login-prompt {
        padding: 1rem;
        text-align: center;
        color: var(--text-muted);
        font-size: 0.9rem;
    }
    .login-prompt a { color: var(--accent); }
    .comments-disabled {
        padding: 1rem;
        text-align: center;
        color: var(--text-muted);
        font-size: 0.9rem;
        font-style: italic;
    }

    .comment-list { min-height: 2rem; }
    .loading, .no-comments {
        text-align: center;
        color: var(--text-muted);
        font-size: 0.9rem;
        padding: 1.5rem 0;
    }
    .load-more {
        display: block;
        width: 100%;
        background: transparent;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.85rem;
        padding: 0.6rem;
        cursor: pointer;
        margin-top: 0.5rem;
        transition: all 0.15s;
    }
    .load-more:hover { border-color: var(--accent); color: var(--accent); }
    .load-more:disabled { opacity: 0.4; cursor: default; }
</style>
