<!-- src/routes/admin/+page.svelte -->
<script>
  import { t } from '$lib/translations';
export let data;
  $: user = data.user;
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
    <!-- Books Section -->
    <section class="admin-card">
      <h2>{$t('pages.admin.sections.books.title')}</h2>
      <div class="admin-actions">
        <a href="/admin/books" class="btn-primary">{$t('pages.admin.sections.books.view')}</a>
        <a href="/admin/books/add" class="btn-secondary">{$t('pages.admin.sections.books.add')}</a>
      </div>
    </section>

    <!-- Reviews Section -->
    <section class="admin-card">
      <h2>{$t('pages.admin.sections.reviews.title')}</h2>
      <div class="admin-actions">
        <a href="/admin/reviews" class="btn-primary">{$t('pages.admin.sections.reviews.view')}</a>
        <a href="/admin/reviews/add" class="btn-secondary">{$t('pages.admin.sections.reviews.add')}</a>
      </div>
    </section>

    <!-- Blog Section -->
    <section class="admin-card">
      <h2>{$t('pages.admin.sections.blog.title')}</h2>
      <div class="admin-actions">
        <a href="/admin/blog" class="btn-primary">{$t('pages.admin.sections.blog.view')}</a>
        <a href="/admin/blog/write" class="btn-secondary">{$t('pages.admin.sections.blog.write')}</a>
      </div>
    </section>

    <!-- Users Section -->
    <section class="admin-card">
      <h2>{$t('pages.admin.sections.users.title')}</h2>
      <div class="admin-actions">
        <a href="/api/admin/users" class="btn-primary">{$t('pages.admin.sections.users.manage')}</a>
      </div>
    </section>
  </div>

  <div class="admin-footer">
    <a href="/" class="btn-secondary">{$t('pages.admin.backToHome')}</a>
  </div>
</div>

<style>
  .admin-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .admin-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .admin-header h1 {
    font-size: 2.5rem;
    color: #1e293b;
    margin-bottom: 1rem;
  }

  .admin-header p {
    color: #475569;
    font-size: 1.1rem;
    line-height: 1.6;
  }

  .admin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .admin-card {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
  }

  .admin-card h2 {
    font-size: 1.5rem;
    color: #1e293b;
    margin-bottom: 1.5rem;
    font-weight: 600;
  }

  .admin-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .btn-primary, .btn-secondary {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
    text-align: center;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: #f1f5f9;
    color: #1e293b;
    border: 1px solid #cbd5e1;
  }

  .btn-secondary:hover {
    background: #e2e8f0;
    transform: translateY(-1px);
  }

  .admin-footer {
    text-align: center;
    padding-top: 2rem;
    border-top: 1px solid #e2e8f0;
  }

  @media (max-width: 768px) {
    .admin-container {
      padding: 1.5rem;
    }
    
    .admin-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
