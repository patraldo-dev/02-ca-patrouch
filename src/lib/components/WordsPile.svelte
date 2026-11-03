<!-- src/lib/components/WordsPile.svelte
     NYT-style piling words (v3 — the funnel). Words fall from the top of
     the container through a narrow central "funnel", spreading out and
     rotating as they drop, and land in a ragged, tilted pile with a
     squash-and-settle bounce. One word arrives first, then the rest
     quicker and quicker. Resting positions are still measured
     (flow-wrapped rows with jittered spacing) so words never overlap on
     any screen size; positions/rotations travel through the animation
     via CSS variables. -->
<script>
    import { onMount, onDestroy } from 'svelte';

    let { words = [], onDone } = $props();

    const FALL = 800;
    const GAP = 20;
    const LINE = 58;

    let host;
    let slots = $state([]);
    let boxH = $state(280);
    let fading = $state(false);
    let timer;

    // cheap deterministic scatter
    const rnd = (seed) => ((Math.sin(seed * 127.1) * 43758.5453) % 1 + 1) % 1;

    onMount(() => {
        const list = (words || []).filter((w) => w && w.length >= 4).slice(0, 20);

        const probe = document.createElement('span');
        probe.style.cssText =
            'position:absolute;visibility:hidden;white-space:nowrap;font-family:var(--font-heading,serif);font-weight:400;font-size:1.7rem';
        host.appendChild(probe);
        const widths = list.map((w) => {
            probe.textContent = w;
            return probe.offsetWidth + 1;
        });
        probe.remove();

        const W = host.clientWidth || 600;

        // Flow-wrap into rows (no overlap possible), then jitter each row's
        // spacing and alignment so the pile reads as a jumble, not a table.
        const rows = [];
        let row = { x: 0, items: [] };
        for (let i = 0; i < list.length; i++) {
            if (row.x + widths[i] > W && row.items.length) {
                rows.push(row);
                row = { x: 0, items: [] };
            }
            row.items.push({ i, x: row.x });
            row.x += widths[i] + GAP;
        }
        if (row.items.length) rows.push(row);
        boxH = rows.length * LINE + 40;

        const placed = [];
        let n = 0;
        rows.forEach((r, ri) => {
            const slack = Math.max(0, W - (r.x - GAP));
            // ragged alignment: each row leans a different way
            const lean = (rnd(ri * 3 + 1) - 0.5) * slack * 0.5;
            let prevJitter = lean;
            for (const item of r.items) {
                // spread the remaining slack unevenly between words
                const jitter = prevJitter + (rnd(item.i * 7 + ri) - 0.35) * slack * 0.16;
                prevJitter = jitter;
                const restRot = (rnd(item.i * 5 + 2) - 0.5) * 26; // ±13°
                placed[item.i] = {
                    w: list[item.i],
                    x: Math.max(0, Math.min(W - widths[item.i], Math.round(item.x + jitter))),
                    y: -ri * LINE,
                    r1: restRot.toFixed(1),
                    r0: (restRot * 1.9).toFixed(1),
                    fx: Math.round(W / 2 - widths[item.i] / 2),
                    // first word drops alone, then the rush accelerates
                    delay: Math.round(400 + (n <= 2 ? n * 260 : 780 + (n - 3) * 105)),
                    dim: (item.i * 7) % 5 === 0
                };
                n++;
            }
        });

        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                slots = placed;
            })
        );

        const lastDelay = Math.max(...placed.map((p) => p.delay));
        const total = lastDelay + FALL + 400;
        timer = setTimeout(() => {
            fading = true;
            setTimeout(() => onDone?.(), 700);
        }, total);
    });
    onDestroy(() => clearTimeout(timer));
</script>

<div class="words-pile" bind:this={host} class:fading style="height: {boxH}px" aria-hidden="true">
    {#each slots as p}
        <span
            class="pile-word"
            class:dim={p.dim}
            style="--tx: {p.x}px; --ty: {p.y}px; --fx: {p.fx}px; --r0: {p.r0}deg; --r1: {p.r1}deg; animation-delay: {p.delay}ms;"
        >{p.w}</span>
    {/each}
</div>

<style>
    .words-pile {
        position: relative;
        max-width: 650px;
        margin: 0 auto;
        overflow: hidden;
        transition: opacity 0.7s ease;
    }
    .words-pile.fading {
        opacity: 0;
    }
    .pile-word {
        position: absolute;
        left: 0;
        bottom: 12px;
        font-family: var(--font-heading, serif);
        font-weight: 400;
        font-size: 1.7rem;
        line-height: 1;
        color: var(--text-dim, #aab);
        white-space: nowrap;
        opacity: 0;
        transform: translate(var(--tx), var(--ty)) rotate(var(--r1));
        animation: word-fall 0.8s cubic-bezier(0.35, 0, 0.3, 1) forwards;
    }
    .pile-word.dim {
        color: var(--text-muted, #889);
    }
    @keyframes word-fall {
        0% {
            opacity: 0;
            transform: translate(var(--fx), -190px) rotate(var(--r0)) scale(1.05);
            filter: blur(2px);
        }
        45% {
            opacity: 1;
            filter: blur(0);
        }
        72% {
            /* impact: squash into the pile, rotation over-rotates slightly */
            opacity: 1;
            transform: translate(var(--tx), calc(var(--ty) + 7px)) rotate(calc(var(--r1) * 1.12)) scale(1.04, 0.94);
        }
        87% {
            /* rebound off the pile */
            transform: translate(var(--tx), calc(var(--ty) - 4px)) rotate(var(--r1));
        }
        100% {
            opacity: 1;
            transform: translate(var(--tx), var(--ty)) rotate(var(--r1));
            filter: blur(0);
        }
    }
</style>
