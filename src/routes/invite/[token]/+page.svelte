<!-- src/routes/invite/[token]/+page.svelte -->
<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { t } from '$lib/i18n';

    let { data } = $props();
    let loading = $state(true);
    let success = $state(false);
    let errorMsg = $state('');

    async function acceptInvite() {
        try {
            const res = await fetch(`/api/invite/${$page.params.token}`);
            if (res.ok) {
                success = true;
                setTimeout(() => goto('/'), 2000);
            } else {
                const body = await res.json();
                errorMsg = body.message || 'Invalid or expired invitation';
            }
        } catch {
            errorMsg = 'Network error. Please try again.';
        } finally {
            loading = false;
        }
    }

    if (data.user) {
        acceptInvite();
    }
</script>

<div class="invite-page">
    {#if loading}
        <div class="card">
            <div class="spinner"></div>
            <p>{$t('invite.accepting')}</p>
        </div>
    {:else if success}
        <div class="card success">
            <div class="icon">✨</div>
            <h2>{$t('invite.success.title')}</h2>
            <p>{$t('invite.success.message')}</p>
        </div>
    {:else}
        <div class="card error">
            <div class="icon">⚠️</div>
            <h2>{$t('invite.error.title')}</h2>
            <p>{errorMsg}</p>
            <a href="/" class="btn">{$t('invite.back_home')}</a>
        </div>
    {/if}
</div>

<style>
    .invite-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0f172a;
        padding: 2rem;
    }
    .card {
        background: #1e293b;
        border-radius: 16px;
        padding: 3rem;
        text-align: center;
        color: #e2e8f0;
        max-width: 420px;
        width: 100%;
    }
    .card.success { border: 1px solid #22c55e; }
    .card.error { border: 1px solid #ef4444; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h2 { font-size: 1.5rem; margin-bottom: 0.5rem; color: white; }
    p { color: #94a3b8; margin-bottom: 1rem; }
    .spinner {
        width: 40px; height: 40px;
        border: 3px solid #334155;
        border-top-color: #3b82f6;
        border-radius: 50%;
        margin: 0 auto 1.5rem;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn {
        display: inline-block;
        margin-top: 1rem;
        padding: 0.6rem 1.5rem;
        background: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
    }
    .btn:hover { background: #2563eb; }
</style>
