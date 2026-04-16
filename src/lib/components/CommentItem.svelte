<script>
    import { t } from '$lib/i18n';
    import { marked } from 'marked';
    import ReplyForm from './ReplyForm.svelte';

    let {
        comment,
        user,
        writingAuthorId,
        isAdmin = false,
        onLike,
        onReply,
        onReport,
        onDelete,
        onPick
    } = $props();

    let showReplyForm = $state(false);
    let reported = $state(false);
    let deleted = $state(false);
    let renderedContent = $state('');
    let userRole = $derived(user?.role || 'user');

    $effect(() => {
        if (comment?.content) {
            renderedContent = marked.parse(comment.content, { async: false });
        }
    });

    function canDelete() {
        return user && (comment.user_id === user.id || comment.user_id === writingAuthorId || isAdmin);
    }

    function canReply() {
        return user && (userRole === 'member' || userRole === 'admin');
    }

    function formatTimestamp(d) {
        if (!d) return '';
        try {
            const s = d.replace(' ', 'T');
            return new Date(s).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return d; }
    }

    async function handleLike() {
        if (!user || deleted) return;
        try {
            const res = await fetch(`/api/comments/${comment.id}/like`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                onLike(comment.id, data.liked);
            }
        } catch {}
    }

    async function handleReport() {
        if (!user || reported || deleted) return;
        try {
            const res = await fetch(`/api/comments/${comment.id}/report`, { method: 'POST' });
            if (res.ok) reported = true;
        } catch {}
    }

    async function handleDelete() {
        if (deleted) return;
        try {
            const res = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' });
            if (res.ok) deleted = true;
        } catch {}
    }

    async function handlePick() {
        if (!isAdmin) return;
        try {
            const res = await fetch(`/api/comments/${comment.id}/pick`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                onPick(comment.id, data.is_featured);
            }
        } catch {}
    }

    async function handleReply(content) {
        await onReply(comment.id, content);
        showReplyForm = false;
    }

    let avatar = $derived((comment.username || '?')[0].toUpperCase());
</script>

{#if deleted}
    <div class="comment-removed">
        <span>{$t('comments.deleted')}</span>
    </div>
{:else}
    <div class="comment-item" class:is-featured={comment.is_featured}>
        <div class="comment-avatar">{avatar}</div>
        <div class="comment-body">
            <div class="comment-header">
                <span class="comment-username">{comment.username}</span>
                {#if comment.parent_username}
                    <span class="reply-indicator">↳ {$t('comments.reply_to')} @{comment.parent_username}</span>
                {/if}
                {#if comment.is_featured}
                    <span class="featured-badge">{$t('comments.picks_badge')}</span>
                {/if}
                <span class="comment-time">{formatTimestamp(comment.created_at)}</span>
            </div>
            <div class="comment-content">
                {@html renderedContent}
            </div>
            <div class="comment-actions">
                <button class="action-btn like-btn" class:liked={comment.liked} onclick={handleLike} title={$t('comments.like')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={comment.liked ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span>{comment.likes_count || ''}</span>
                </button>
                {#if canReply()}
                    <button class="action-btn" onclick={() => showReplyForm = !showReplyForm} title={$t('comments.reply')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </button>
                {/if}
                {#if user && comment.user_id !== user.id}
                    <button class="action-btn" class:reported onclick={handleReport} disabled={reported} title={$t('comments.report')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                            <line x1="4" y1="22" x2="4" y2="15"></line>
                        </svg>
                        {#if reported}<span>{$t('comments.reported')}</span>{/if}
                    </button>
                {/if}
                {#if canDelete()}
                    <button class="action-btn delete-btn" onclick={handleDelete} title={$t('comments.delete')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                {/if}
                {#if isAdmin}
                    <button class="action-btn pick-btn" class:picked={comment.is_featured} onclick={handlePick} title={$t('comments.picks_badge')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={comment.is_featured ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </button>
                {/if}
            </div>
            {#if showReplyForm}
                <ReplyForm
                    onReply={handleReply}
                    parentUsername={comment.username}
                    onCancel={() => showReplyForm = false}
                />
            {/if}
        </div>
    </div>
{/if}

<style>
    .comment-item {
        display: flex;
        gap: 0.75rem;
        padding: 1rem 0;
        border-bottom: 1px solid var(--border);
        transition: background 0.15s;
    }
    .comment-item:last-child { border-bottom: none; }
    .comment-item.is-featured {
        background: var(--accent-bg);
        margin: 0 -0.75rem;
        padding-left: 0.75rem;
        padding-right: 0.75rem;
        border-left: 2px solid var(--accent);
        border-radius: 0 6px 6px 0;
    }
    .comment-removed {
        padding: 0.75rem 0;
        color: var(--text-muted);
        font-style: italic;
        font-size: 0.875rem;
        border-bottom: 1px solid var(--border);
    }
    .comment-avatar {
        width: 32px;
        height: 32px;
        min-width: 32px;
        border-radius: 50%;
        background: var(--accent-bg);
        border: 1px solid var(--accent-border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-heading);
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--accent);
    }
    .comment-body { flex: 1; min-width: 0; }
    .comment-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.3rem;
    }
    .comment-username {
        font-weight: 500;
        font-size: 0.85rem;
        color: var(--text);
    }
    .reply-indicator {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-style: italic;
    }
    .comment-time {
        font-size: 0.7rem;
        color: var(--text-muted);
        margin-left: auto;
    }
    .featured-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        background: rgba(251, 191, 36, 0.15);
        color: #fbbf24;
        font-size: 0.65rem;
        font-weight: 600;
        padding: 0.1rem 0.4rem;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .comment-content {
        font-size: 0.9rem;
        line-height: 1.6;
        color: var(--text);
        word-wrap: break-word;
    }
    .comment-content :global(p) { margin: 0 0 0.5rem; }
    .comment-content :global(p:last-child) { margin-bottom: 0; }
    .comment-actions {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin-top: 0.5rem;
    }
    .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-family: var(--font-body);
        font-size: 0.75rem;
        padding: 0.25rem 0.4rem;
        border-radius: 4px;
        cursor: pointer;
        transition: color 0.15s, background 0.15s;
    }
    .action-btn:hover { color: var(--text-dim); background: var(--glass-bg); }
    .action-btn:disabled { opacity: 0.4; cursor: default; }
    .action-btn.liked { color: #f87171; }
    .action-btn.reported { color: var(--accent); }
    .action-btn.delete-btn:hover { color: #f87171; }
    .action-btn.pick-btn.picked { color: #fbbf24; }
</style>
