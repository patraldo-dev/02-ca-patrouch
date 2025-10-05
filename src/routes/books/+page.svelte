<!-- src/routes/privacy/+page.svelte -->
<script>
  import { t } from '$lib/translations';
</script>

<svelte:head>
  <title>{$t('pages.privacy.title')}</title>
</svelte:head>

<div class="container">
  <h1>{$t('pages.privacy.heading')}</h1>
  
  <p class="last-updated">{$t('pages.privacy.lastUpdated', { date: 'October 2025' })}</p>

  <section>
    <h2>{$t('pages.privacy.sections.responsable.title')}</h2>
    <p><strong>patrouch.ca</strong></p>
    <p><strong>{$t('pages.privacy.sections.responsable.addressLabel')}:</strong> {$t('pages.privacy.sections.responsable.address')}</p>
    <p><strong>{$t('pages.privacy.sections.responsable.emailLabel')}:</strong> {$t('pages.privacy.contactEmail')}</p>
  </section>

  <section>
    <h2>{$t('pages.privacy.sections.dataCollection.title')}</h2>
    <p>{$t('pages.privacy.sections.dataCollection.intro')}</p>
    <ul>
      <li>{$t('pages.privacy.sections.dataCollection.items.username')}</li>
      <li>{$t('pages.privacy.sections.dataCollection.items.email')}</li>
      <li>{$t('pages.privacy.sections.dataCollection.items.password')}</li>
      <li>{$t('pages.privacy.sections.dataCollection.items.reviews')}</li>
      <li>{$t('pages.privacy.sections.dataCollection.items.navigation')}</li>
    </ul>
  </section>

  <section>
    <h2>{$t('pages.privacy.sections.purposes.title')}</h2>
    <p>{$t('pages.privacy.sections.purposes.intro')}</p>
    <ul>
      <li>{$t('pages.privacy.sections.purposes.items.account')}</li>
      <li>{$t('pages.privacy.sections.purposes.items.reviews')}</li>
      <li>{$t('pages.privacy.sections.purposes.items.notifications')}</li>
      <li>{$t('pages.privacy.sections.purposes.items.improvement')}</li>
      <li>{$t('pages.privacy.sections.purposes.items.legal')}</li>
    </ul>
  </section>

  <section>
    <h2>{$t('pages.privacy.sections.transfers.title')}</h2>
    <p>{$t('pages.privacy.sections.transfers.intro')}</p>
    <ul>
      <li><strong>{$t('pages.privacy.sections.transfers.cloudflare')}</strong></li>
      <li><strong>{$t('pages.privacy.sections.transfers.mailgun')}</strong></li>
    </ul>
    <p>{$t('pages.privacy.sections.transfers.conclusion')}</p>
  </section>

  <section>
    <h2>{$t('pages.privacy.sections.arcoRights.title')}</h2>
    <p>{$t('pages.privacy.sections.arcoRights.intro')}</p>
    <ul>
      <li><strong>{$t('pages.privacy.sections.arcoRights.access')}</strong></li>
      <li><strong>{$t('pages.privacy.sections.arcoRights.rectification')}</strong></li>
      <li><strong>{$t('pages.privacy.sections.arcoRights.cancellation')}</strong></li>
      <li><strong>{$t('pages.privacy.sections.arcoRights.opposition')}</strong></li>
    </ul>
    <p>{$t('pages.privacy.sections.arcoRights.contact')} <strong>{$t('pages.privacy.contactEmail')}</strong></p>
  </section>

  <section>
    <h2>{$t('pages.privacy.sections.consent.title')}</h2>
    <p>{$t('pages.privacy.sections.consent.text')} <strong>{$t('pages.privacy.contactEmail')}</strong></p>
  </section>

  <section>
    <h2>{$t('pages.privacy.sections.cookies.title')}</h2>
    <p>{$t('pages.privacy.sections.cookies.text')}</p>
  </section>

  <section>
    <h2>{$t('pages.privacy.sections.security.title')}</h2>
    <p>{$t('pages.privacy.sections.security.text')}</p>
  </section>

  <section>
    <h2>{$t('pages.privacy.sections.changes.title')}</h2>
    <p>{$t('pages.privacy.sections.changes.text')}</p>
  </section>

  <section>
    <h2>{$t('pages.privacy.sections.contact.title')}</h2>
    <p>{$t('pages.privacy.sections.contact.text')} <strong>{$t('pages.privacy.contactEmail')}</strong></p>
  </section>

  <div class="back-link">
    <a href="/" class="btn-secondary">{$t('pages.privacy.backToHome')}</a>
  </div>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
  }
  
  h1 {
    margin-bottom: 1rem;
  }
  
  .last-updated {
    color: #6b7280;
    font-style: italic;
    margin-bottom: 2rem;
  }
  
  section {
    margin-bottom: 2rem;
  }
  
  h2 {
    color: #1f2937;
    margin-bottom: 1rem;
    margin-top: 2rem;
  }
  
  ul {
    margin-left: 1.5rem;
    line-height: 1.8;
  }
  
  .back-link {
    margin-top: 3rem;
  }
</style>
