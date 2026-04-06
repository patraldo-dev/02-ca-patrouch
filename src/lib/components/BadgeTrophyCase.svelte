<script>
    import { t } from '$lib/i18n';
    import { getLocale } from '$lib/i18n';

    let { badges = [] } = $props();

    let selectedBadge = $state(null);
    let filter = $state('all');

    const categories = ['all', 'streak', 'words', 'agora', 'social', 'challenge', 'milestone'];
    const categoryLabelKeys = {
        all: 'badges.all',
        streak: 'badges.streaks',
        words: 'badges.words',
        agora: 'badges.agora',
        social: 'badges.social',
        challenge: 'badges.challenges',
        milestone: 'badges.milestones'
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

    function badgeName(badge) {
        const key = 'badges.badge_' + badge.id + '_name';
        return $t(key) || badge.name;
    }

    function badgeDesc(badge) {
        const key = 'badges.badge_' + badge.id + '_description';
        return $t(key) || badge.description;
    }
</script>

<div class="trophy-case">
    <div class="trophy-header">
        <h3>{$t('badges.title')}</h3>
        <span class="count">{$t('badges.unlocked').replace('{unlocked}', unlockedCount).replace('{total}', totalCount)}</span>
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
                {$t(categoryLabelKeys[cat])}
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
                <span class="badge-name">{badge.unlocked ? badgeName(badge) : '???'}</span>
                <span class="badge-rarity {badge.rarity}">{$t('badges.rarity_' + badge.rarity)}</span>
            </button>
        {/each}
    </div>

    {#if selectedBadge}
        <div class="badge-detail">
            <div class="badge-detail-header">
                <span class="detail-icon">{selectedBadge.unlocked ? selectedBadge.icon : '🔒'}</span>
                <div>
                    <h4>{selectedBadge.unlocked ? badgeName(selectedBadge) : $t('badges.locked')}</h4>
                    <span class="detail-rarity {selectedBadge.rarity}">{$t('badges.rarity_' + selectedBadge.rarity)}</span>
                </div>
            </div>
            <p class="detail-desc">{badgeDesc(selectedBadge)}</p>
            {#if selectedBadge.unlocked && selectedBadge.unlockedAt}
                <p class="detail-unlocked">
                    {$t('badges.unlocked_on').replace('{date}', new Date(selectedBadge.unlockedAt.replace(' ', 'T')).toLocaleDateString(getLocale() || 'en', { month: 'long', day: 'numeric', year: 'numeric' }))}
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
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 0.5rem;
        margin-bottom: 1rem;
        overflow: hidden;
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
        min-width: 0;
        overflow: hidden;
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
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
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
