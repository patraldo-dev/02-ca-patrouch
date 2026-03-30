<!-- src/routes/about/+page.svelte -->
<script>
  import { t } from '$lib/i18n';
</script>

<svelte:head>
  <title>{$t('pages.about.title')}</title>
</svelte:head>

<div class="container">
  <div class="about-header">
    <div class="section-label fade-in">{$t('pages.about.heading')}</div>
    <h1 class="fade-in">Christophe R Patraldo</h1>
  </div>
  <div class="about-content fade-in">
    <p>{$t('pages.about.paragraph1')}</p>
    <p>{$t('pages.about.paragraph2')}</p>
  </div>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .about-header {
    margin-bottom: 2rem;
  }

  .about-header h1 {
    margin-bottom: 0;
  }

  .about-content p {
    color: var(--text-dim);
    font-size: 1.05rem;
    line-height: 1.8;
    margin-bottom: 1.5rem;
  }
</style>
