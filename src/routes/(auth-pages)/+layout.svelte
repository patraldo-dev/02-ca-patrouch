<!-- src/routes/(auth-pages)/+layout.svelte -->
<script>
    /** @type {import('./$types').LayoutData} */
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
        border: 1px solid #27272a;
        border-radius: 8px;
        background: #141417;
        color: #e4e4e7;
    }
</style>
