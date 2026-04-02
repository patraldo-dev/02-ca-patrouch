<!-- src/routes/admin/users/+page.svelte -->
<script>
    import { t } from '$lib/i18n';
    let { data } = $props();
    let users = $state(data.users || []);
    let deletingId = $state(null);
    let message = $state('');
    let messageError = $state(false);

    async function deleteUser(id, username) {
        if (deletingId) return;
        if (!confirm(`Delete "${username}"? This will also delete their writings, profiles, and data.`)) return;

        deletingId = id;
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                users = users.filter(u => u.id !== id);
                message = `${username} deleted.`;
                messageError = false;
                setTimeout(() => { message = ''; }, 3000);
            } else {
                const err = await res.json();
                message = err.error || 'Delete failed';
                messageError = true;
                setTimeout(() => { message = ''; }, 3000);
            }
        } catch {
            message = 'Network error';
            messageError = true;
            setTimeout(() => { message = ''; }, 3000);
        }
        deletingId = null;
    }
</script>

<svelte:head>
    <title>{$t('pages.admin.sections.users.title')}</title>
</svelte:head>

<div class="admin-users-container">
    <header class="page-header">
        <h1>{$t('pages.admin.sections.users.heading')}</h1>
        <p class="subtitle">{$t('pages.admin.sections.users.subtitle')}</p>
    </header>

    {#if message}
        <div class="message" class:error={messageError}>{message}</div>
    {/if}

    {#if users.length === 0}
        <div class="empty-state">
            <p>{$t('pages.admin.sections.users.empty')}</p>
        </div>
    {:else}
        <div class="users-table-wrapper">
            <table class="users-table">
                <thead>
                    <tr>
                        <th>{$t('pages.admin.sections.users.table.username')}</th>
                        <th>{$t('pages.admin.sections.users.table.email')}</th>
                        <th>{$t('pages.admin.sections.users.table.role')}</th>
                        <th class="actions-column">{$t('pages.admin.sections.users.table.actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {#each users as user}
                        <tr class="user-row">
                            <td class="username-cell">
                                <div class="user-info">
                                    <div class="user-avatar">
                                        {user.username.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span class="username-text">{user.username}</span>
                                </div>
                            </td>
                            <td class="email-cell">{user.email}</td>
                            <td class="role-cell">
                                <span class="role-badge role-{user.role}">
                                    {user.role === 'admin' ? $t('pages.admin.sections.users.roles.admin') : user.role === 'agent' ? 'Agent' : $t('pages.admin.sections.users.roles.user')}
                                </span>
                            </td>
                            <td class="actions-cell">
                                {#if user.role !== 'admin'}
                                    <button
                                        class="action-btn delete-btn"
                                        onclick={() => deleteUser(user.id, user.username)}
                                        disabled={deletingId === user.id}
                                        aria-label={$t('pages.admin.sections.users.delete')}
                                    >
                                        {#if deletingId === user.id}
                                            <span class="spinner"></span>
                                        {:else}
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                        {/if}
                                    </button>
                                {:else}
                                    <span class="protected-label">—</span>
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}

    <div class="back-link">
        <a href="/admin">← {$t('pages.admin.backToHome')}</a>
    </div>
</div>

<style>
    .admin-users-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem 1.5rem;
    }
    .page-header {
        margin-bottom: 2rem;
    }
    .page-header h1 {
        font-family: var(--font-heading);
        font-size: 1.75rem;
        font-weight: 300;
        color: var(--text);
        margin-bottom: 0.5rem;
    }
    .subtitle {
        color: var(--text-muted);
        font-size: 0.9rem;
    }
    .message {
        padding: 0.75rem 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        font-size: 0.9rem;
        background: rgba(74, 222, 128, 0.1);
        border: 1px solid rgba(74, 222, 128, 0.3);
        color: #4ade80;
    }
    .message.error {
        background: rgba(248, 113, 113, 0.1);
        border-color: rgba(248, 113, 113, 0.3);
        color: #f87171;
    }
    .empty-state {
        text-align: center;
        padding: 3rem 2rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        color: var(--text-muted);
    }
    .users-table-wrapper {
        overflow-x: auto;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: var(--surface);
    }
    .users-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 500px;
    }
    .users-table th {
        background: rgba(255,255,255,0.03);
        padding: 0.75rem 1.25rem;
        text-align: left;
        font-weight: 600;
        color: var(--text-muted);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .users-table td {
        padding: 0.75rem 1.25rem;
        border-top: 1px solid var(--border);
        color: var(--text);
        font-size: 0.9rem;
    }
    .user-row:hover { background: rgba(255,255,255,0.02); }
    .user-info { display: flex; align-items: center; gap: 0.75rem; }
    .user-avatar {
        width: 32px; height: 32px; border-radius: 50%;
        background: var(--accent); color: var(--bg);
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 0.7rem; flex-shrink: 0;
    }
    .username-text { font-weight: 500; }
    .email-cell { color: var(--text-muted); }
    .role-badge {
        padding: 0.2rem 0.6rem; border-radius: 999px;
        font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .role-admin { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }
    .role-user { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
    .role-agent { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
    .actions-column { width: 60px; text-align: center; }
    .actions-cell { text-align: center; }
    .action-btn {
        background: none; border: 1px solid transparent; cursor: pointer;
        padding: 0.4rem; border-radius: 6px; transition: all 0.2s;
        display: inline-flex; align-items: center; justify-content: center;
        color: var(--text-muted);
    }
    .action-btn:hover { border-color: rgba(248, 113, 113, 0.3); color: #f87171; background: rgba(248, 113, 113, 0.08); }
    .action-btn:disabled { opacity: 0.5; cursor: wait; }
    .protected-label { color: var(--text-muted); font-size: 0.8rem; }
    .spinner {
        width: 14px; height: 14px; border: 2px solid var(--border);
        border-top-color: #f87171; border-radius: 50%;
        animation: spin 0.6s linear infinite; display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .back-link { margin-top: 2rem; }
    .back-link a {
        color: var(--text-muted); text-decoration: none; font-size: 0.9rem;
    }
    .back-link a:hover { color: var(--accent); }
</style>
