<!-- src/routes/about/+page.svelte -->
<script>
  import { t } from '$lib/translations';
</script>

<svelte:head>
  <title>{$t('pages.about.title')}</title>
</svelte:head>

<div class="container">
  <h1>{$t('pages.about.heading')}</h1>
  <p>{$t('pages.about.paragraph1')}</p>
  <p>{$t('pages.about.paragraph2')}</p>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    line-height: 1.6;
  }
  h1 {
    color: #333;
    margin-bottom: 1rem;
  }
  p {
    margin-bottom: 1rem;
    color: #555;
  }
</style>
