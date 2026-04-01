<!-- src/routes/(auth-pages)/+layout.svelte -->
<script>
    import { t } from '$lib/i18n';
</script>

<header class="auth-header">
    <a href="/" class="auth-logo">C. R Patraldo</a>
</header>

<div class="auth-body">
    <slot />
</div>

<style>
    .auth-header {
        display: flex;
        justify-content: center;
        padding: 1.5rem 1rem;
    }

    .auth-logo {
        font-family: var(--font-heading);
        font-size: 1.25rem;
        font-style: italic;
        color: var(--accent);
        text-decoration: none;
        letter-spacing: 0.05em;
        transition: opacity 0.2s;
    }

    .auth-logo:hover {
        opacity: 0.8;
    }

    .auth-body {
        /* intentionally empty — each page handles its own container */
    }
</style>
