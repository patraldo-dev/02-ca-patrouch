<script>
    import { t } from '$lib/i18n';
    import PhysicalBottles from '$lib/components/PhysicalBottles.svelte';

    let { data } = $props();
</script>

<svelte:head>
    <title>{$t('booty.arbooty.title')} — patrouch.ca</title>
</svelte:head>

<section class="bottles-page">
    <a href="/games/booty" class="back-link">← {$t('booty.arbooty.back')}</a>
    <h1 class="page-title">🏴☠️ Arbooty <span class="title-accent">— Búsqueda del Tesoro</span></h1>
    <p class="page-desc">{$t('booty.arbooty.description')}</p>

    {#if data.myPlayer}
        <PhysicalBottles player={data.myPlayer} />
    {:else}
        <div class="join-prompt">
            <p>{$t('booty.arbooty.join_required')}</p>
            <a href="/games/booty" class="btn-accent">🏁 {$t('booty.arbooty.join_btn')}</a>
        </div>
    {/if}
</section>

<style>
    .bottles-page {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }
    .back-link {
        display: inline-block;
        color: var(--accent);
        text-decoration: none;
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }
    .back-link:hover { text-decoration: underline; }
    .page-title {
        font-family: Playfair Display, serif;
        font-size: 2rem;
        color: var(--text);
        margin-bottom: 0.5rem;
    }
    .title-accent {
        color: var(--accent);
    }
    .page-desc {
        color: var(--text-dim);
        font-size: 1rem;
        margin-bottom: 2rem;
    }
    .join-prompt {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--text-dim);
    }
    .join-prompt p { margin-bottom: 1rem; }
    .btn-accent {
        display: inline-block;
        padding: 0.75rem 2rem;
        background: var(--accent);
        color: var(--bg);
        font-weight: 600;
        border-radius: var(--radius);
        text-decoration: none;
    }
    .btn-accent:hover { opacity: 0.9; }
</style>
