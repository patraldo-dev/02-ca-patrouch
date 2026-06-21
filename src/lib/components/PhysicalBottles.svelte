<script>
    import { onMount } from 'svelte';
    import { t } from '$lib/i18n';

    let { player, portalConfig } = $props();

    let physicalBottles = $state([]);
    let openedBottle = $state(null);
    let loading = $state(true);

    onMount(async () => {
        try {
            const res = await fetch('/api/bottlequest/physical');
            const json = await res.json();
            physicalBottles = json.bottles || [];
        } catch {}
        loading = false;
    });

    async function openBottle(bottle) {
        if (bottle.found_by) {
            // Already captured — show content
            openedBottle = bottle;
            return;
        }
        // Not GPS-gated — capture from anywhere
        try {
            const res = await fetch('/api/bottlequest/physical', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bottle_id: bottle.id })
            });
            const result = await res.json();
            if (result.success) {
                openedBottle = result.bottle;
                physicalBottles = physicalBottles.map(b =>
                    b.id === bottle.id ? { ...b, found_by: result.bottle.found_by, found_at: result.bottle.found_at } : b
                );
            } else {
                openedBottle = { ...bottle, error: result.error || 'No disponible' };
            }
        } catch {
            openedBottle = { ...bottle, error: 'Error de red' };
        }
    }

    function closeBottle() {
        openedBottle = null;
    }
</script>

<svelte:head>
    {@html `<style>
        @keyframes revealContent {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0) rotate(-3deg); }
            50% { transform: translateY(-6px) rotate(3deg); }
        }
    </style>`}
</svelte:head>

<div class="physical-container">
    {#if loading}
        <div class="loading-state">
            <div class="spinner"></div>
        </div>
    {:else if physicalBottles.length === 0}
        <div class="empty-state">
            <p>No hay botellas disponibles ahora mismo.</p>
        </div>
    {:else}
        <div class="bottle-grid">
            {#each physicalBottles as bottle, i}
                <button
                    class="bottle-card"
                    class:found={bottle.found_by}
                    onclick={() => openBottle(bottle)}
                >
                    <span class="bottle-float">🏴‍☠️</span>
                    <span class="bottle-num">Pista {i + 1}</span>
                    <strong class="bottle-title">{bottle.title}</strong>
                    {#if bottle.found_by}
                        <span class="tag found">✅ Capturada</span>
                    {:else}
                        <span class="tag available">🔍 Descubrir</span>
                    {/if}
                </button>
            {/each}
        </div>
    {/if}

    <!-- Bottle content modal -->
    {#if openedBottle}
        <div class="modal-overlay" onclick={closeBottle} role="button" tabindex="0">
            <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-label={openedBottle.title}>
                {#if openedBottle.error}
                    <p class="error-text">{openedBottle.error}</p>
                {:else}
                    <h2>🏴‍☠️ {openedBottle.title}</h2>
                    {#if openedBottle.content}
                        <pre class="clue-content">{openedBottle.content.replace(/\\n\s*/g, '\n').trim()}</pre>
                    {/if}
                {/if}
                <button class="close-btn" onclick={closeBottle}>Cerrar</button>
            </div>
        </div>
    {/if}
</div>

<style>
    .physical-container {
        position: relative;
    }

    .loading-state, .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--text-dim);
    }

    .spinner {
        width: 32px;
        height: 32px;
        border: 2px solid var(--border);
        border-top-color: var(--accent);
        border-radius: 50%;
        margin: 0 auto;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .bottle-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }
    @media (min-width: 480px) {
        .bottle-grid { grid-template-columns: 1fr 1fr; }
    }

    .bottle-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.4rem;
        padding: 1.5rem 1rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: var(--font-body);
        color: var(--fg);
        text-align: center;
    }
    .bottle-card:hover {
        border-color: var(--accent);
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    .bottle-card.found {
        opacity: 0.6;
    }

    .bottle-float {
        font-size: 2.5rem;
        animation: float 3s ease-in-out infinite;
        line-height: 1;
    }

    .bottle-num {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-muted);
    }

    .bottle-title {
        font-family: var(--font-heading);
        font-size: 1rem;
        color: var(--text);
    }

    .tag {
        font-size: 0.75rem;
        padding: 2px 10px;
        border-radius: 10px;
    }
    .tag.available {
        background: var(--accent-bg);
        color: var(--accent);
    }
    .tag.found {
        background: rgba(34, 197, 94, 0.15);
        color: #4ade80;
    }

    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
    }

    .modal {
        background: var(--bg);
        color: var(--text);
        padding: 2rem;
        border-radius: 16px;
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        border: 1px solid var(--accent-border, var(--border));
        animation: revealContent 0.4s ease-out;
    }

    .modal h2 {
        text-align: center;
        margin: 0 0 1rem;
        font-family: var(--font-heading);
        font-size: 1.3rem;
        color: var(--accent);
    }

    .clue-content {
        white-space: pre-wrap;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.85rem;
        line-height: 1.6;
        background: var(--surface);
        color: var(--text);
        padding: 1rem;
        border-radius: 8px;
        margin: 0 0 1rem;
        border: 1px solid var(--border);
    }

    .error-text {
        color: #ef4444;
        text-align: center;
        padding: 1rem;
    }

    .close-btn {
        display: block;
        width: 100%;
        padding: 0.75rem;
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        margin-top: 0.5rem;
        font-family: var(--font-body);
    }
    .close-btn:hover {
        border-color: var(--accent);
        color: var(--accent);
    }
</style>
