<!-- src/lib/components/CommentForm.svelte -->
<script>
    import { t } from '$lib/i18n';

    let { writingId, parentId = null, onCommentPosted, userRole = 'user' } = $props();

    let content = $state('');
    let error = $state('');
    let loading = $state(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!content.trim()) return;

        if (parentId && userRole === 'user') {
            error = 'Only members can reply';
            return;
        }

        loading = true;
        error = '';

        try {
            const res = await fetch(`/api/writings/${writingId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content.trim().slice(0, 1500),
                    parent_id: parentId
                })
            });

            const data = await res.json();

            if (!res.ok) {
                error = data.error || 'Failed to post comment';
                loading = false;
                return;
            }

            content = '';
            loading = false;

            if (onCommentPosted) {
                onCommentPosted(data.comment);
            }
        } catch (err) {
            error = 'Failed to post comment';
            loading = false;
        }
    }
</script>

<div class="comment-form">
    {#if parentId}
        <textarea
            bind:value={content}
            placeholder="Write a reply..."
            rows="3"
            disabled={loading}
            maxlength="1500"
        ></textarea>
    {:else}
        <textarea
            bind:value={content}
            placeholder="Share your thoughts on this piece..."
            rows="4"
            disabled={loading}
            maxlength="1500"
        ></textarea>
    {/if}
    <div class="comment-form-footer">
        <span class="char-count">{content.length}/1500</span>
        <button onclick={handleSubmit} disabled={loading || content.trim().length < 3}>
            {loading ? '...' : parentId ? 'Reply' : 'Post Comment'}
        </button>
    </div>
    {#if error}
        <p class="comment-error">{error}</p>
    {/if}
</div>

<style>
    .comment-form {
        margin-bottom: 1rem;
    }
    .comment-form textarea {
        width: 100%;
        padding: 0.75rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.95rem;
        resize: vertical;
        min-height: 60px;
        box-sizing: border-box;
    }
    .comment-form textarea:focus {
        outline: none;
        border-color: var(--accent);
    }
    .comment-form-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.5rem;
    }
    .char-count {
        font-size: 0.8rem;
        color: var(--text-dim);
    }
    .comment-form button {
        padding: 0.5rem 1.25rem;
        background: var(--accent);
        color: #000;
        border: none;
        border-radius: 6px;
        font-family: var(--font-body);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    .comment-form button:hover { opacity: 0.85; }
    .comment-form button:disabled { opacity: 0.4; cursor: not-allowed; }
    .comment-error {
        color: #e74c3c;
        font-size: 0.85rem;
        margin-top: 0.35rem;
    }
</style>
