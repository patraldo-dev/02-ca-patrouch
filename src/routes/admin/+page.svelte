<!-- src/routes/admin/+page.svelte -->
<script>
    import { t } from '$lib/i18n';
    let { data } = $props();
</script>

<svelte:head>
    <title>{$t('pages.admin.title')}</title>
</svelte:head>

<div class="admin-container">
    <header class="admin-header">
        <h1>{$t('pages.admin.heading')}</h1>
        <p>{$t('pages.admin.welcome')}</p>
    </header>

    <div class="admin-grid">
        <!-- Users -->
        <section class="admin-card">
            <h2>{$t('pages.admin.sections.users.title')}</h2>
            <p class="card-desc">{$t('pages.admin.sections.users.subtitle')}</p>
            <div class="admin-actions">
                <a href="/admin/users" class="btn-primary">{$t('pages.admin.sections.users.manage')}</a>
            </div>
        </section>

        <!-- Analytics -->
        <section class="admin-card">
            <h2>{$t('pages.admin.sections.analytics.title')}</h2>
            <p class="card-desc">{$t('pages.admin.sections.analytics.subtitle')}</p>
            <div class="admin-actions">
                <a href="/admin/analytics" class="btn-primary">{$t('pages.admin.sections.analytics.view')}</a>
            </div>
        </section>

    </div>

    <div class="admin-footer">
        <a href="/" class="btn-secondary">← {$t('pages.admin.backToHome')}</a>
    </div>
</div>

<style>
    .admin-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem 1.5rem;
    }
    .admin-header {
        text-align: center;
        margin-bottom: 3rem;
    }
    .admin-header h1 {
        font-family: var(--font-heading);
        font-size: 2rem;
        font-weight: 300;
        color: var(--text);
        margin-bottom: 0.5rem;
    }
    .admin-header p {
        color: var(--text-muted);
        font-size: 0.95rem;
    }
    .admin-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }
    .admin-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.5rem;
    }
    .admin-card h2 {
        font-family: var(--font-heading);
        font-size: 1.2rem;
        color: var(--text);
        margin-bottom: 0.5rem;
        font-weight: 400;
    }
    .card-desc {
        color: var(--text-muted);
        font-size: 0.85rem;
        margin-bottom: 1.25rem;
        line-height: 1.5;
    }
    .admin-actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .btn-primary, .btn-secondary {
        display: inline-block;
        padding: 0.6rem 1.25rem;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 500;
        text-align: center;
        font-family: var(--font-body);
        font-size: 0.9rem;
        transition: all 0.2s;
    }
    .btn-primary {
        background: var(--accent);
        color: var(--bg);
    }
    .btn-primary:hover { opacity: 0.85; }
    .btn-secondary {
        background: var(--glass-bg);
        color: var(--text-dim);
        border: 1px solid var(--border);
    }
    .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
    .admin-footer {
        text-align: center;
        padding-top: 2rem;
        border-top: 1px solid var(--border);
    }
</style>
