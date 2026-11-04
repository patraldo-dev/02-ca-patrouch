<!-- src/routes/prompt/[id]/+page.svelte
     The revisit view: a daily stimulus and every published piece it
     inspired. The CTA opens /write with this prompt pre-wired. -->
<script>
    import { t } from '#lib/i18n/index.js';
    import { goto } from '$app/navigation';

    let { data } = $props();

    function excerpt(text, n = 160) {
        const clean = String(text || '').replace(/[#*>`_~]/g, '').trim();
        return clean.length > n ? clean.slice(0, n).trimEnd() + '…' : clean;
    }

    function writeFromPrompt() {
        sessionStorage.setItem('continue_prompt', JSON.stringify({
            id: data.prompt.id,
            text: data.prompt.prompt_text,
            category: data.prompt.category
        }));
        goto('/write');
    }

    function formatDate(iso) {
        try {
            return new Date(iso.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        } catch { return iso; }
    }
</script>

<svelte:head>
    <title>{$t('pages.prompt.title')} — Patrouch</title>
</svelte:head>

<div class="prompt-page ambient-glow">
    <div class="prompt-hero glass-surface">
        <span class="prompt-date">{formatDate(data.prompt.prompt_date)}</span>
        <h1>{data.prompt.prompt_text}</h1>
        <button class="prompt-cta" onclick={writeFromPrompt}>
            ✍️ {$t('pages.prompt.write_cta')}
        </button>
    </div>

    <h2>{$t('pages.prompt.responses')}</h2>
    {#if data.writings.length === 0}
        <p class="prompt-empty">{$t('pages.prompt.empty')}</p>
    {:else}
        <div class="prompt-pieces">
            {#each data.writings as w (w.id)}
                <a href="/writings/{w.id}" class="piece-card glass-surface">
                    <h3>{w.title}</h3>
                    <p>{excerpt(w.content)}</p>
                    <span class="piece-meta">
                        {w.show_profile ? (w.display_name || w.username) : '·'}
                        · {formatDate(w.created_at)}
                        · {w.word_count} {$t('write.dashboard.words_word')}
                    </span>
                </a>
            {/each}
        </div>
    {/if}
</div>

<style>
    .prompt-page {
        max-width: 760px;
        margin: 0 auto;
        padding: 2.5rem 1.25rem 4rem;
    }

    .prompt-hero {
        padding: 2rem 1.75rem;
        margin-bottom: 2.5rem;
        text-align: center;
    }

    .prompt-date {
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
    }

    .prompt-hero h1 {
        font-family: var(--font-display);
        font-size: clamp(1.5rem, 5vw, 2.2rem);
        line-height: 1.15;
        font-weight: 700;
        color: var(--text);
        margin: 0.75rem 0 1.5rem;
        text-wrap: balance;
    }

    .prompt-cta {
        background: var(--glass-bg);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid var(--accent-border);
        border-radius: 1.25rem;
        color: var(--text);
        font-family: var(--font-display);
        font-size: 1.05rem;
        font-weight: 700;
        padding: 0.85rem 2.2rem;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: translate 0.3s ease, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        box-shadow: 0 8px 32px rgba(60, 45, 20, 0.12);
    }
    .prompt-cta:hover {
        background: var(--glass-hover);
        border-color: var(--accent);
        translate: 0 -3px;
        box-shadow: 0 16px 40px rgba(90, 110, 101, 0.25);
    }

    h2 {
        font-family: var(--font-heading);
        font-weight: 400;
        font-size: 1.3rem;
        color: var(--text);
        margin: 0 0 1.25rem;
    }

    .prompt-empty {
        color: var(--text-muted);
        font-style: italic;
    }

    .prompt-pieces {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.25rem;
    }
    @media (min-width: 640px) {
        .prompt-pieces { grid-template-columns: 1fr 1fr; }
    }

    .piece-card {
        padding: 1.4rem 1.4rem 1.1rem;
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        transition: translate 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    }
    .piece-card:hover {
        translate: 0 -4px;
        border-color: var(--accent);
        box-shadow: 0 16px 36px rgba(90, 110, 101, 0.16);
    }

    .piece-card h3 {
        font-family: var(--font-heading);
        font-weight: 600;
        font-size: 1.1rem;
        color: var(--text);
        margin: 0;
    }
    .piece-card p {
        color: var(--text-dim);
        font-size: 0.92rem;
        line-height: 1.6;
        margin: 0;
        flex: 1;
    }
    .piece-meta {
        font-size: 0.78rem;
        color: var(--text-muted);
    }
</style>
