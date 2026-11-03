<!-- src/routes/languages/+page.svelte — Idioma / Language / Langue.
     The site's language picker (and a small declaration of identity:
     everything here happens in Spanish, English and French). Choosing a
     language sets the cookie the server reads for SSR, the localStorage
     key the client store reads, then reloads so both follow. -->
<script>
    import { t, locale, setLocale, locales } from '#lib/i18n/index.js';
    import { browser } from '$app/env';
    import { onMount } from 'svelte';

    const CARDS = {
        es: { name: 'Español', flag: '🇪🇸' },
        en: { name: 'English', flag: '🐙' },
        fr: { name: 'Français', flag: '🇫🇷' }
    };

    let current = $state('');

    onMount(() => {
        let l = '';
        locale.subscribe((v) => (l = v))();
        current = l;
    });

    function choose(lang) {
        if (!browser) return;
        // Same mechanism as the desktop nav switcher: /api/locale sets the
        // preferredLanguage cookie the server reads for SSR.
        localStorage.setItem('preferredLanguage', lang);
        setLocale(lang);
        fetch('/api/locale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locale: lang })
        }).finally(() => window.location.reload());
    }
</script>

<svelte:head><title>{$t('languages.title')} · Patrouch</title></svelte:head>

<div class="lang-page">
    <header>
        <h1>{$t('languages.title')}</h1>
        <p class="subtitle">{$t('languages.subtitle')}</p>
    </header>

    <div class="cards">
        {#each locales as lang}
            <button class="card" class:current={lang === current} onclick={() => choose(lang)}>
                <span class="flag">{CARDS[lang].flag}</span>
                <span class="name">{CARDS[lang].name}</span>
                <span class="tag">{$t(`languages.tag_${lang}`)}</span>
                {#if lang === current}
                    <span class="badge">✓</span>
                {/if}
            </button>
        {/each}
    </div>

    <p class="note">{$t('languages.note')}</p>
</div>

<style>
    .lang-page { max-width: 40rem; margin: 0 auto; padding: 3rem 1rem 4rem; }
    header h1 { font-family: var(--font-heading, serif); font-size: 1.9rem; font-weight: 400; margin: 0 0 0.4rem; }
    .subtitle { color: var(--muted, #999); margin: 0 0 2rem; }
    .cards { display: grid; gap: 0.9rem; }
    .card {
        display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.3rem 0.9rem;
        background: var(--surface, #1b1e27); border: 1px solid var(--border, #2a2e39);
        border-radius: 12px; padding: 1.1rem 1.3rem; cursor: pointer; text-align: left;
        color: inherit; font-family: inherit; transition: border-color 0.2s;
    }
    .card:hover { border-color: var(--accent, #a8bdb3); }
    .card.current { border-color: var(--accent, #a8bdb3); background: rgba(168,189,179,0.06); }
    .flag { font-size: 1.6rem; grid-row: span 2; }
    .name { font-size: 1.15rem; font-weight: 600; }
    .tag { grid-column: 2; color: var(--muted, #999); font-size: 0.85rem; font-style: italic; }
    .badge { color: var(--accent, #a8bdb3); font-weight: 700; grid-row: span 2; }
    .note { color: var(--muted, #888); font-size: 0.8rem; margin-top: 1.6rem; text-align: center; }
</style>
