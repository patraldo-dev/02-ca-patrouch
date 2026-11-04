<!-- src/routes/oulipo/+page.svelte
     The reserved-word game, explained. One word per writer per day;
     every reserved word disappears from the story world — the
     community ties Sappho down like Gulliver, cord by cord. -->
<script>
    import { t } from '#lib/i18n/index.js';
    import InkText from '#lib/components/InkText.svelte';
</script>

<svelte:head>
    <title>{$t('pages.oulipo.title')} — Patrouch</title>
</svelte:head>

<div class="oulipo-page ambient-glow">
    <div class="oulipo-card glass-surface">
        <h1><InkText text={$t('pages.oulipo.title')} step={60} /></h1>
        <p class="oulipo-intro">{$t('pages.oulipo.intro')}</p>

        <h2>{$t('pages.oulipo.how_title')}</h2>
        <ol class="oulipo-steps">
            <li>{$t('pages.oulipo.how_1')}</li>
            <li>{$t('pages.oulipo.how_2')}</li>
            <li>{$t('pages.oulipo.how_3')}</li>
        </ol>

        <h2>{$t('pages.oulipo.more_title')}</h2>
        <p class="oulipo-more">{$t('pages.oulipo.more_body')}</p>
        <div class="oulipo-links">
            <a href="/write">✍️ {$t('common.nav.write')}</a>
            <a href="/agora?author=both">🎭 {$t('agora.game.challenge')}</a>
            <a href="/portals">🚪 {$t('common.nav.games')}</a>
        </div>
    </div>
</div>

<style>
    .oulipo-page {
        max-width: 720px;
        margin: 0 auto;
        padding: 2.5rem 1.25rem 4rem;
    }

    .oulipo-card {
        padding: 2rem 1.75rem;
    }

    h1 {
        font-family: var(--font-display);
        font-size: clamp(2.4rem, 8vw, 3.6rem);
        line-height: 1;
        font-weight: 900;
        color: var(--signature);
        margin: 0 0 1.2rem;
        text-wrap: balance;
    }

    .oulipo-intro {
        color: var(--text-dim);
        line-height: 1.75;
        font-size: 1.02rem;
        margin-bottom: 1.75rem;
    }

    h2 {
        font-family: var(--font-heading);
        font-weight: 400;
        font-size: 1.25rem;
        color: var(--text);
        margin: 0 0 0.75rem;
    }

    .oulipo-steps {
        margin: 0 0 1.75rem 1.25rem;
        color: var(--text-dim);
        line-height: 1.7;
    }
    .oulipo-steps li + li { margin-top: 0.35rem; }

    .oulipo-more {
        color: var(--text-dim);
        line-height: 1.7;
        margin-bottom: 1.5rem;
    }

    .oulipo-links {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
    }
    .oulipo-links a {
        text-decoration: none;
        color: var(--accent);
        border: 1px solid var(--accent-border);
        border-radius: 999px;
        padding: 0.5rem 1.1rem;
        font-size: 0.9rem;
        font-weight: 600;
        transition: all 0.2s;
    }
    .oulipo-links a:hover {
        background: var(--accent-bg);
        border-color: var(--accent);
    }
</style>
