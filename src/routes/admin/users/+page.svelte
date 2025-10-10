<!-- src/routes/admin/users/+page.svelte -->
<script>
  import { t } from '$lib/translations';
  export let data;
  $: users = data.users || [];
</script>

<svelte:head>
  <title>{$t('pages.admin.sections.users.title')}</title>
</svelte:head>

<div class="admin-users-container">
  <header class="page-header">
    <h1>{$t('pages.admin.sections.users.heading')}</h1>
    <p class="subtitle">{$t('pages.admin.sections.users.subtitle')}</p>
  </header>

  {#if users.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" stroke-width="2"/>
          <path d="M12 14C7.5 14 4 16.5 4 19.5V21H20V19.5C20 16.5 16.5 14 12 14Z" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>
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
                  {user.role === 'admin' ? $t('pages.admin.sections.users.roles.admin') : $t('pages.admin.sections.users.roles.user')}
                </span>
              </td>
              <td class="actions-cell">
                <button 
                  class="action-btn delete-btn"
                  on:click={() => alert('Delete functionality not implemented yet')}
                  title={$t('pages.admin.sections.users.delete')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 7L18.1327 19.1425C18.056 20.2163 17.1536 21 16.0759 21H7.92412C6.84642 21 5.94403 20.2163 5.86728 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .admin-users-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    margin-bottom: 2.5rem;
    text-align: center;
  }

  .page-header h1 {
    font-size: 2.25rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    color: #64748b;
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    background: #f8fafc;
    border-radius: 16px;
    margin: 2rem 0;
  }

  .empty-icon {
    margin-bottom: 1.5rem;
    color: #94a3b8;
  }

  .empty-state p {
    color: #475569;
    font-size: 1.1rem;
    font-weight: 500;
  }

  .users-table-wrapper {
    overflow-x: auto;
    border-radius: 16px;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08);
    background: white;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;
  }

  .users-table th {
    background: #f8fafc;
    padding: 1.25rem 1.5rem;
    text-align: left;
    font-weight: 600;
    color: #334155;
    font-size: 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .users-table td {
    padding: 1.25rem 1.5rem;
    border-top: 1px solid #e2e8f0;
    color: #1e293b;
  }

  .user-row:hover {
    background-color: #f8fafc;
    transition: background-color 0.2s ease;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .username-text {
    font-weight: 600;
    font-size: 1rem;
  }

  .email-cell {
    color: #64748b;
    font-size: 0.95rem;
  }

  .role-badge {
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .role-admin {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .role-user {
    background: #f0fdf4;
    color: #166534;
  }

  .actions-column {
    width: 80px;
    text-align: center;
  }

  .actions-cell {
    text-align: center;
  }

  .action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
  }

  .action-btn:hover {
    background: #f1f5f9;
    color: #ef4444;
    transform: scale(1.1);
  }

  .delete-btn svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 768px) {
    .admin-users-container {
      padding: 1.5rem;
    }
    
    .page-header h1 {
      font-size: 1.875rem;
    }
    
    .users-table th,
    .users-table td {
      padding: 1rem;
    }
    
    .user-info {
      gap: 0.75rem;
    }
    
    .user-avatar {
      width: 32px;
      height: 32px;
      font-size: 0.8rem;
    }
    
    .username-text {
      font-size: 0.95rem;
    }
  }

  @media (max-width: 480px) {
    .admin-users-container {
      padding: 1rem;
    }
    
    .users-table th:nth-child(2),
    .users-table td:nth-child(2) {
      display: none;
    }
    
    .page-header h1 {
      font-size: 1.5rem;
    }
  }
</style>
