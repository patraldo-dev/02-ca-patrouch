<!-- src/lib/components/CommentForm.svelte -->
<script>
    import { enhance } from '$app/forms';
    import { t } from '$lib/i18n'; // Adjust this import path based on your i18n setup

    export let reviewId;
    export let onCommentPosted;

    let content = '';
    let error = '';
    let loading = false;

    async function handleSubmit(e) {
        e.preventDefault();
        if (!content.trim()) return;

        loading = true;
        error = '';

        const res = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                review_id: reviewId,
                content: content.trim()
            })
        });

        const data = await res.json();

        if (!res.ok) {
            error = data.error || $t('common.commentForm.error.failedToPost');
            loading = false;
            return;
        }

        // Reset form
        content = '';
        loading = false;

        // Notify parent
        if (onCommentPosted) {
            onCommentPosted(data.comment);
        }
    }
</script>

<div class="comment-form">
    <h3>{$t('common.commentForm.title')}</h3>
    {#if error}
        <div class="alert error">{error}</div>
    {/if}
    <form on:submit|preventDefault={handleSubmit} use:enhance>
        <textarea
            bind:value={content}
            placeholder={$t('common.commentForm.placeholder')}
            rows="3"
            required
            maxlength="1000"
        ></textarea>
        <button type="submit" disabled={loading || !content.trim()}>
            {loading ? $t('common.commentForm.button.posting') : $t('common.commentForm.button.post')}
        </button>
    </form>
</div>

<style>
    .comment-form {
        background: #f8fafc;
        padding: 1.5rem;
        border-radius: 12px;
        margin: 2rem 0;
    }
    h3 {
        margin: 0 0 1rem 0;
        color: #333;
        font-size: 1.2rem;
    }
    textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
        resize: vertical;
        min-height: 80px;
    }
    button {
        margin-top: 1rem;
        padding: 0.75rem 1.5rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
    }
    button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }
    .alert {
        padding: 0.75rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }
    .error {
        background: #fee2e2;
        color: #991b1b;
    }
</style>
