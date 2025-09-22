<!-- src/routes/(auth-pages)/+layout.svelte -->
<script>
    /** @type {import('./$types').LayoutData} */
    export let data;
</script>

<!-- Shared auth page container -->
<div class="auth-container">
    <slot />
</div>

<style>
    .auth-container {
        max-width: 400px;
        margin: 2rem auto;
        padding: 2rem;
        border: 1px solid #eee;
        border-radius: 8px;
        background: white;
    }
</style>
