<script>
    import { t } from '$lib/i18n';
    import { page } from '$app/stores';

    let { data } = $props();
    let w = $state(data.writing);

    function formatDate(d) {
        if (!d) return '';
        const s = d.replace(' ', 'T');
        return new Date(s).toLocaleDateString($t('common.locale_code') || 'en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function wordCountDisplay(n) {
        return n != null ? n.toLocaleString() : '0';
    }

    async function handleDelete() {
        if (!confirm($t('write.view.confirm_delete'))) return;
    }

    async function confirmDelete() {
        const form = document.querySelector('#delete-form');
        if (form) form.submit();
    }
</script>

<div class="view-page">
    <a href="/write" class="back-link">← {$t('write.editor.back')}</a>

    <article class="writing-view">
        <header class="writing-header">
            <h1>{w.title}</h1>
            <div class="writing-meta">
                <span class="meta-date">{formatDate(w.created_at)}</span>
                <span class="meta-words">{wordCountDisplay(w.word_count)} {$t('write.dashboard.words_word')}</span>
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
        </header>

        <div class="writing-content">
            {w.content.split('\n').map(para => para.trim() ? `<p>${para}</p>` : '').join('')}
            {@html w.content.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
        </div>

        <footer class="writing-footer">
            <form id="delete-form" method="POST" action="?/delete" style="display:none"></form>
            <div class="footer-actions">
                <a href="/writings/{w.id}/edit" class="btn-glass">{$t('write.view.edit')}</a>
                <button onclick={() => { if (confirm($t('write.view.confirm_delete'))) confirmDelete(); }} class="btn-danger">{$t('write.view.delete')}</button>
            </div>
        </footer>
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
        gap: 0.75rem;
        font-size: 0.8rem;
        color: var(--text-muted);
    }

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
    }

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

    .btn-danger {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.25);
        border-radius: var(--radius);
        padding: 0.5rem 1.25rem;
        color: #fca5a5;
        font-family: var(--font-body);
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-danger:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.4);
    }
</style>
