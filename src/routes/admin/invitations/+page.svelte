<!-- src/routes/admin/invitations/+page.svelte -->
<script>
    import { t } from '$lib/i18n';
    import { page } from '$app/stores';

    let invitations = $state([]);
    let email = $state('');
    let creating = $state(false);
    let newToken = $state(null);
    let copied = $state(false);

    async function loadInvitations() {
        const res = await fetch('/api/admin/invite');
        if (res.ok) invitations = await res.json();
    }

    async function createInvite() {
        creating = true;
        newToken = null;
        copied = false;
        try {
            const res = await fetch('/api/admin/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email || null })
            });
            if (res.ok) {
                const data = await res.json();
                newToken = data.token;
                email = '';
                await loadInvitations();
            }
        } finally {
            creating = false;
        }
    }

    async function copyLink(token) {
        const url = `${$page.url.origin}/invite/${token}`;
        await navigator.clipboard.writeText(url);
        copied = true;
        setTimeout(() => copied = false, 2000);
    }

    function formatDate(ts) {
        if (!ts) return '—';
        return new Date(ts * 1000).toLocaleDateString();
    }

    loadInvitations();
</script>

<div class="invitations-page">
    <h1>{$t('admin.invitations.title')}</h1>
    <p class="subtitle">{$t('admin.invitations.subtitle')}</p>

    <!-- Create form -->
    <div class="create-section">
        <h2>{$t('admin.invitations.create_title')}</h2>
        <form onsubmit={(e) => { e.preventDefault(); createInvite(); }}>
            <input
                type="email"
                bind:value={email}
                placeholder={$t('admin.invitations.email_placeholder')}
            />
            <button type="submit" disabled={creating}>
                {creating ? $t('admin.invitations.creating') : $t('admin.invitations.create_button')}
            </button>
        </form>

        {#if newToken}
            <div class="new-invite">
                <p>{$t('admin.invitations.link_label')}</p>
                <div class="link-box">
                    <code>{newToken}</code>
                    <button onclick={() => copyLink(newToken)}>
                        {copied ? '✅' : '📋'}
                    </button>
                </div>
            </div>
        {/if}
    </div>

    <!-- List -->
    <div class="list-section">
        <h2>{$t('admin.invitations.list_title')}</h2>
        {#if invitations.length === 0}
            <p class="empty">{$t('admin.invitations.no_invitations')}</p>
        {:else}
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>{$t('admin.invitations.col.email')}</th>
                            <th>{$t('admin.invitations.col.created')}</th>
                            <th>{$t('admin.invitations.col.status')}</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each invitations as inv}
                            <tr>
                                <td>{inv.email || '—'}</td>
                                <td>{formatDate(inv.created_at)}</td>
                                <td>
                                    {#if inv.used}
                                        <span class="badge used">{$t('admin.invitations.status.used')}</span>
                                    {:else}
                                        <span class="badge pending">{$t('admin.invitations.status.pending')}</span>
                                    {/if}
                                </td>
                                <td>
                                    {#if !inv.used}
                                        <button class="copy-btn" onclick={() => copyLink(inv.token)}>📋</button>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>

<style>
    .invitations-page { padding: 0; }
    h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
    .subtitle { color: #64748b; margin-bottom: 2rem; }
    h2 { font-size: 1.15rem; margin-bottom: 0.75rem; color: #334155; }

    .create-section {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 2rem;
    }
    .create-section form { display: flex; gap: 0.75rem; }
    .create-section input {
        flex: 1;
        padding: 0.6rem 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.9rem;
    }
    .create-section button {
        padding: 0.6rem 1.25rem;
        background: #1e293b;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
    }
    .create-section button:disabled { opacity: 0.5; }

    .new-invite {
        margin-top: 1rem;
        padding: 1rem;
        background: #f0fdf4;
        border: 1px solid #86efac;
        border-radius: 8px;
    }
    .new-invite p { font-size: 0.85rem; color: #166534; margin-bottom: 0.5rem; }
    .link-box {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .link-box code {
        flex: 1;
        font-size: 0.8rem;
        background: white;
        padding: 0.4rem;
        border-radius: 4px;
        word-break: break-all;
    }
    .link-box button {
        padding: 0.4rem 0.6rem;
        background: none;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1.1rem;
    }

    .list-section h2 { margin-bottom: 0.75rem; }
    .empty { color: #94a3b8; font-style: italic; }

    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { text-align: left; padding: 0.5rem; border-bottom: 2px solid #e2e8f0; color: #64748b; }
    td { padding: 0.5rem; border-bottom: 1px solid #f1f5f9; }
    .badge {
        display: inline-block;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .badge.pending { background: #fef3c7; color: #92400e; }
    .badge.used { background: #e2e8f0; color: #64748b; }
    .copy-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
    }
</style>
