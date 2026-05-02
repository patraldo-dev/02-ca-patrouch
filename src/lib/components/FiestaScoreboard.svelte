<script>
    import { onMount } from 'svelte';

    let scores = $state([]);
    let online = $state(0);
    let ws = null;

    onMount(async () => {
        const res = await fetch('/api/bottlequest/fiesta/scores');
        const data = await res.json();
        scores = data.scores || [];

        // WebSocket for live updates
        const player = window.__bqPlayer;
        const wsUrl = 'wss://booty-chat-worker.chef-tech.workers.dev/chat/ws?username=' +
            encodeURIComponent(player?.username || 'guest') + '&display_name=' +
            encodeURIComponent(player?.display_name || 'Guest');
        try {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (e) => {
                const msg = JSON.parse(e.data);
                if (msg.type === 'capture') {
                    refreshScores();
                }
                if (msg.type === 'online') online = msg.count || 0;
                if (msg.type === 'online_update') online = msg.count || 0;
            };
            ws.onopen = () => ws.send(JSON.stringify({ type: 'location', lat: 0, lon: 0 }));
        } catch {}
    });

    async function refreshScores() {
        const res = await fetch('/api/bottlequest/fiesta/scores');
        const data = await res.json();
        scores = data.scores || [];
    }

    function medal(rank) {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    }
</script>

<div class="scoreboard">
    <div class="scoreboard-header">
        <h3>🏆 Marcador Fiesta</h3>
        <span class="online-badge">👥 {online} online</span>
    </div>

    {#if scores.length === 0}
        <p class="empty">Nadie ha capturado todavía... ¡sé el primero!</p>
    {:else}
        <div class="score-list">
            {#each scores as s}
                <div class="score-row" class:first={s.rank === 1}>
                    <span class="rank">{medal(s.rank)}</span>
                    <span class="name">{s.username}</span>
                    <span class="caps">{s.captures} {s.captures === 1 ? 'captura' : 'capturas'}</span>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .scoreboard {
        background: var(--surface, #141417);
        border: 1px solid rgba(201, 168, 124, 0.3);
        border-radius: 12px;
        padding: 1rem;
        max-width: 400px;
        margin: 1rem auto;
    }
    .scoreboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
    }
    .scoreboard-header h3 {
        margin: 0;
        font-family: Playfair Display, serif;
        color: var(--text, #e4e4e7);
        font-size: 1.1rem;
    }
    .online-badge {
        background: rgba(201, 168, 124, 0.15);
        color: #c9a87c;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
    }
    .empty {
        text-align: center;
        color: var(--text-dim, #71717a);
        font-size: 0.9rem;
        margin: 0;
    }
    .score-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .score-row {
        display: flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 8px;
        background: rgba(255,255,255,0.03);
    }
    .score-row.first {
        background: rgba(201, 168, 124, 0.1);
        border: 1px solid rgba(201, 168, 124, 0.3);
    }
    .rank {
        font-size: 1.2rem;
        min-width: 36px;
    }
    .name {
        flex: 1;
        font-weight: 600;
        color: var(--text, #e4e4e7);
        font-size: 0.95rem;
    }
    .caps {
        color: #c9a87c;
        font-weight: 600;
        font-size: 0.9rem;
    }
</style>
