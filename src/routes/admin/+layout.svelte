<!-- src/routes/admin/+layout.svelte -->
<script>
    import { page } from '$app/stores';
    import { t } from '$lib/i18n';
    let { children } = $props();
</script>

<svelte:head>