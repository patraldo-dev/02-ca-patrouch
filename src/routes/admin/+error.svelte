<!-- src/routes/admin/+error.svelte -->
<script>
  import { page } from '$app/stores';
  import { t } from '$lib/i18n';

  let { status } = $props();
</script>

<div class="error-page">
  {#if status === 403}
    <h1>{$t('pages.admin.error.access_denied')}</h1>
    <p>{@html $t('pages.admin.error.reserved')}</p>
    <a href="/write" class="btn-accent">{$t('pages.admin.error.go_write')}</a>
    <a href="/" class="btn-glass">{$t('pages.admin.error.back_home')}</a>
  {:else}
    <h1>{status}</h1>
    <p>{$t('pages.admin.error.something_wrong')}</p>
    <a href="/" class="btn">{$t('pages.admin.error.back_home')}</a>
  {/if}
</div>

<style>
  .error-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    padding: 2rem;
    gap: 1rem;
  }
  .error-page h1 {
    font-family: var(--font-heading);
    font-size: 2.5rem;
    color: var(--text);
    margin-bottom: 0.5rem;
  }
  .error-page p {
    color: var(--text-dim);
    font-size: 1.1rem;
    max-width: 400px;
    line-height: 1.6;
  }
  .error-page a {
    text-decoration: none;
    display: inline-block;
    margin-top: 0.5rem;
  }
  .btn-accent {
    background: var(--accent);
    color: var(--bg);
    padding: 0.75rem 2rem;
    border-radius: var(--radius);
    font-weight: 600;
  }
  .btn-glass {
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 0.75rem 2rem;
    border-radius: var(--radius);
  }
</style>
