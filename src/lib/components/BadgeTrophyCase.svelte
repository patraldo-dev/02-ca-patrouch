<script>
    import { onMount } from 'svelte';

    let { badges = [] } = $props();

    let selectedBadge = $state(null);
    let filter = $state('all');

    const categories = ['all', 'streak', 'words', 'agora', 'social', 'challenge', 'milestone'];
    const categoryLabels = {
        all: 'All',
        streak: '🔥 Streaks',
        words: '📝 Words',
        agora: '🔍 Agora',
        social: '🌟 Social',
        challenge: '🎯 Challenges',
        milestone: '🏆 Milestones'
    };

    const rarityOrder = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

    let sortedBadges = $derived([...badges].sort((a, b) => {
        if (a.unlocked !== b.unlocked) return b.unlocked - a.unlocked;
        return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
    }));

    let filteredBadges = $derived(filter === 'all'
        ? sortedBadges
        : sortedBadges.filter(b => b.category === filter)
    );

    let unlockedCount = $derived(badges.filter(b => b.unlocked).length);
    let totalCount = $derived(badges.length);
</script>

<div class="trophy-case">
    <div class="trophy-header">
        <h3>🏅 Badge Collection</h3>
        <span class="count">{unlockedCount} / {totalCount} unlocked</span>
    </div>

    <div class="progress-bar">
        <div class="progress-fill" style="width: {totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%"></div>
    </div>

    <div class="filters">
        {#each categories as cat}
            <button
                class="filter-btn"
                class:active={filter === cat}
                onclick={() => filter = cat}
            >
                {categoryLabels[cat]}
            </button>
        {/each}
    </div>

    <div class="badge-grid">
        {#each filteredBadges as badge}
            <button
                class="badge-card"
                class:unlocked={badge.unlocked}
                class:locked={!badge.unlocked}
                class:selected={selectedBadge?.id === badge.id}
                onclick={() => selectedBadge = selectedBadge?.id === badge.id ? null : badge}
            >
                <span class="badge-icon">{badge.unlocked ? badge.icon : '🔒'}</span>
                <span class="badge-name">{badge.unlocked ? badge.name : '???'}</span>
                <span class="badge-rarity {badge.rarity}">{badge.rarity}</span>
            </button>
        {/each}
    </div>

    {#if selectedBadge}
        <div class="badge-detail">
            <div class="badge-detail-header">
                <span class="detail-icon">{selectedBadge.unlocked ? selectedBadge.icon : '🔒'}</span>
                <div>
                    <h4>{selectedBadge.unlocked ? selectedBadge.name : 'Locked'}</h4>
                    <span class="detail-rarity {selectedBadge.rarity}">{selectedBadge.rarity}</span>
                </div>
            </div>
            <p class="detail-desc">{selectedBadge.description}</p>
            {#if selectedBadge.unlocked && selectedBadge.unlockedAt}
                <p class="detail-unlocked">
                    Unlocked {new Date(selectedBadge.unlockedAt.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
            {/if}
        </div>
    {/if}
</div>

<style>
    .trophy-case {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1.25rem;
    }

    .trophy-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
    }

    .trophy-header h3 {
        font-family: var(--font-heading);
        color: var(--accent);
        font-size: 1rem;
        margin: 0;
    }

    .count {
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .progress-bar {
        height: 4px;
        background: rgba(201, 168, 124, 0.1);
        border-radius: 2px;
        margin-bottom: 1rem;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: var(--accent);
        border-radius: 2px;
        transition: width 0.5s ease;
    }

    .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-bottom: 1rem;
    }

    .filter-btn {
        font-size: 0.7rem;
        padding: 0.3rem 0.6rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.2s;
    }

    .filter-btn:hover {
        border-color: var(--accent);
        color: var(--accent);
    }

    .filter-btn.active {
        background: var(--accent);
        color: var(--bg);
        border-color: var(--accent);
    }

    .badge-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .badge-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3rem;
        padding: 0.75rem 0.5rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s;
    }

    .badge-card.unlocked:hover {
        border-color: var(--accent);
        transform: translateY(-2px);
    }

    .badge-card.selected {
        border-color: var(--accent);
        background: rgba(201, 168, 124, 0.1);
    }

    .badge-card.locked {
        opacity: 0.4;
        cursor: default;
    }

    .badge-icon {
        font-size: 1.5rem;
    }

    .badge-name {
        font-size: 0.65rem;
        color: var(--text-dim);
        text-align: center;
        line-height: 1.2;
    }

    .badge-rarity {
        font-size: 0.55rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.1rem 0.3rem;
        border-radius: 3px;
    }

    .badge-rarity.common { color: #9ca3af; }
    .badge-rarity.uncommon { color: #4ade80; }
    .badge-rarity.rare { color: #60a5fa; }
    .badge-rarity.legendary { color: #fbbf24; }

    .badge-detail {
        background: rgba(201, 168, 124, 0.05);
        border: 1px solid rgba(201, 168, 124, 0.2);
        border-radius: 8px;
        padding: 1rem;
    }

    .badge-detail-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
    }

    .detail-icon {
        font-size: 2rem;
    }

    .badge-detail h4 {
        margin: 0;
        color: var(--text);
        font-size: 0.95rem;
    }

    .detail-rarity {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .detail-rarity.common { color: #9ca3af; }
    .detail-rarity.uncommon { color: #4ade80; }
    .detail-rarity.rare { color: #60a5fa; }
    .detail-rarity.legendary { color: #fbbf24; }

    .detail-desc {
        color: var(--text-dim);
        font-size: 0.85rem;
        margin: 0.5rem 0;
    }

    .detail-unlocked {
        color: var(--accent);
        font-size: 0.75rem;
        margin: 0;
    }
</style>
