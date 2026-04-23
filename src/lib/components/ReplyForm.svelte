<script>
    import { t } from '$lib/i18n';

    let { onReply, parentUsername = '', onCancel } = $props();
    let replyText = $state('');
    let submitting = $state(false);
    let error = $state('');

    const MAX_CHARS = 1500;

    async function submitReply() {
        if (!replyText.trim() || submitting) return;
        if (replyText.length > MAX_CHARS) return;

        submitting = true;
        error = '';
        try {
            await onReply(replyText.trim());
            replyText = '';
        } catch (e) {
            error = e?.message || 'Failed to post reply';
        }
        submitting = false;
    }
</script>

<div class="reply-form">
    {#if error}
        <div class="reply-error">{error}</div>
    {/if}
    <textarea
        bind:value={replyText}
        maxlength={MAX_CHARS}
        placeholder={$t('comments.reply_placeholder')}
        class="reply-textarea"
        rows="3"
    ></textarea>
    <div class="reply-actions">
        <span class="char-count" class:over={replyText.length > MAX_CHARS}>{replyText.length}/{MAX_CHARS}</span>
        <div class="reply-buttons">
            <button class="btn-cancel" onclick={onCancel} disabled={submitting}>Cancel</button>
            <button class="btn-submit" onclick={submitReply} disabled={!replyText.trim() || submitting}>
                {submitting ? '...' : $t('comments.reply')}
            </button>
        </div>
    </div>
</div>

<style>
    .reply-form {
        margin-top: 0.5rem;
        padding-left: 0.5rem;
    }
    .reply-error {
        color: #f87171;
        font-size: 0.8rem;
        margin-bottom: 0.4rem;
    }
    .reply-textarea {
        width: 100%;
        background: var(--surface-raised);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.875rem;
        padding: 0.6rem 0.75rem;
        resize: vertical;
        min-height: 60px;
    }
    .reply-textarea:focus {
        outline: none;
        border-color: var(--accent);
    }
    .reply-textarea::placeholder {
        color: var(--text-muted);
    }
    .reply-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.4rem;
    }
    .char-count {
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    .char-count.over { color: #f87171; }
    .reply-buttons { display: flex; gap: 0.5rem; }
    .btn-cancel {
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.8rem;
        padding: 0.35rem 0.75rem;
        cursor: pointer;
    }
    .btn-cancel:hover { border-color: var(--text-dim); }
    .btn-cancel:disabled { opacity: 0.4; cursor: default; }
    .btn-submit {
        background: var(--accent);
        border: none;
        border-radius: 6px;
        color: var(--bg);
        font-family: var(--font-body);
        font-size: 0.8rem;
        font-weight: 600;
        padding: 0.35rem 0.75rem;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    .btn-submit:hover { opacity: 0.85; }
    .btn-submit:disabled { opacity: 0.4; cursor: default; }
</style>
