<!-- src/lib/components/InkText.svelte
     Letter-by-letter ink reveal: each glyph appears out of blur on its own
     beat, as if being written. Pure CSS per-letter animations, started only
     after two animation frames (the SSR paint-race guard — flipping or
     starting before first paint renders as an instant pop).

     Letters are grouped in inline-block word spans so lines break BETWEEN
     words, never mid-word (each letter span is inline-block; without the
     grouping every letter is a break opportunity and long labels shatter
     at the viewport edge — the French hero label did exactly that). -->
<script>
    import { onMount } from 'svelte';

    let { text = '', delay = 0, step = 55 } = $props();

    let go = $state(false);

    // Words with each one's starting letter index, so the stagger runs
    // continuously across word boundaries.
    let groups = $derived.by(() => {
        const out = [];
        let offset = 0;
        for (const word of String(text).split(' ')) {
            out.push({ word, offset });
            offset += Array.from(word).length;
        }
        return out;
    });

    onMount(() => {
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                setTimeout(() => (go = true), delay);
            })
        );
    });
</script>

<span class="ink-text" class:go aria-label={text}>
    <!-- {#key text}: a locale switch changes the string, but Svelte
         reconciles the letter spans BY INDEX — surviving spans keep
         their finished animations while appended ones animate fresh,
         producing stray late letters ("Playful"'s second L, the tail
         of "Écriture"). Keying on the text rebuilds every letter so
         the whole line re-inks as one cascade. -->
    {#key text}
        {#each groups as g, wi}
            <span class="word" aria-hidden="true">
                {#each Array.from(g.word) as ch, i}
                    <span class="lt" style="--i: {g.offset + i}">{ch}</span>
                {/each}
            </span>
            {#if wi < groups.length - 1}{' '}{/if}
        {/each}
    {/key}
</span>

<style>
    .ink-text {
        display: inline;
    }
    .word {
        display: inline-block;
        white-space: nowrap;
    }
    .lt {
        display: inline-block;
        opacity: 0;
        filter: blur(4px);
        transform: translateY(0.12em);
    }
    .go .lt {
        animation: letter-ink 0.5s cubic-bezier(0.3, 0.7, 0.4, 1) forwards;
        animation-delay: calc(var(--i) * var(--step, 55ms));
    }
    @keyframes letter-ink {
        0% {
            opacity: 0;
            filter: blur(4px);
            transform: translateY(0.12em);
        }
        60% {
            opacity: 1;
            filter: blur(0.5px);
        }
        100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .lt {
            opacity: 1;
            filter: none;
            transform: none;
            animation: none;
        }
    }
</style>
