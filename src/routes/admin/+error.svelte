<!-- src/routes/admin/+error.svelte -->
<script>
  export let status;
  export let error;
</script>

<div class="error-page">
  {#if status === 403}
    <h1>Access Denied</h1>
    <p>You need admin privileges to view this page.</p>
    <a href="/" class="btn">Back to Home</a>
  {:else}
    <h1>{status}: {error.message}</h1>
  {/if}
</div>
