<!-- src/routes/admin/users/+page.svelte -->
<script>
  import { t } from '$lib/translations';
  export let data;
  $: users = data.users || [];
</script>

<svelte:head>
  <title>{$t('pages.admin.users.title')}</title>
</svelte:head>

<div class="admin-users">
  <h1>{$t('pages.admin.users.heading')}</h1>
  
  {#if users.length === 0}
    <p>{$t('pages.admin.users.empty')}</p>
  {:else}
    <table class="users-table">
      <thead>
        <tr>
          <th>{$t('pages.admin.users.table.username')}</th>
          <th>{$t('pages.admin.users.table.email')}</th>
          <th>{$t('pages.admin.users.table.role')}</th>
          <th>{$t('pages.admin.users.table.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {#each users as user}
          <tr>
            <td>{user.username}</td>
            <td>{user.email}</td>
            <td>
              <select 
                value={user.role} 
                on:change={(e) => updateUserRole(user.id, e.target.value)}
                disabled={!user.canEditRole}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </td>
            <td>
              <button on:click={() => deleteUser(user.id)} class="btn-danger">
                {$t('pages.admin.users.delete')}
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
