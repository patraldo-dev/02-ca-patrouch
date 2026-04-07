<script>
    import { t } from '$lib/i18n';
    import { getLocale } from '$lib/i18n';
    import { get } from 'svelte/store';

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

    function translate(key) {
        return get(t)(key);
    }

    function badgeName(badge) {
        const key = 'badges.' + badge.id + '_name';
        return translate(key) || badge.name;
    }

    function badgeDesc(badge) {
        const key = 'badges.' + badge.id + '_description';
        return translate(key) || badge.description;
    }

    function shareBadge(badge) {
        const name = badgeName(badge);
        const desc = badgeDesc(badge);
        const rarity = translate('badges.rarity_' + badge.rarity);
        const text = `🏅 ${name} — ${desc} (${rarity})\n\n🏆 patrouch.ca`;
        if (navigator.share) {
            navigator.share({ title: name, text });
        } else {
            navigator.clipboard.writeText(text);
        }
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
                onclick={() => selectedBadge = badge}
            >
                <span class="badge-icon">{badge.unlocked ? badge.icon : '🔒'}</span>
                <span class="badge-name">{badge.unlocked ? badgeName(badge) : '???'}</span>
                <span class="badge-rarity {badge.rarity}">{$t('badges.rarity_' + badge.rarity)}</span>
            </button>
        {/each}
    </div>
</div>

{#if selectedBadge}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="badge-modal-overlay" onclick={() => selectedBadge = null}>
        <div class="badge-modal" onclick={e => e.stopPropagation()}>
            <button class="badge-modal-close" onclick={() => selectedBadge = null}>×</button>

            <div class="badge-modal-icon {selectedBadge.unlocked ? 'unlocked' : ''}">
                {selectedBadge.unlocked ? selectedBadge.icon : '🔒'}
            </div>

            <div class="badge-modal-info">
                <span class="badge-modal-rarity {selectedBadge.rarity}">
                    {$t('badges.rarity_' + selectedBadge.rarity)}
                </span>
                <h3 class="badge-modal-name">
                    {selectedBadge.unlocked ? badgeName(selectedBadge) : $t('badges.locked')}
                </h3>
                <p class="badge-modal-desc">
                    {badgeDesc(selectedBadge)}
                </p>
                {#if selectedBadge.unlocked && selectedBadge.unlockedAt}
                    <p class="badge-modal-date">
                        {$t('badges.unlocked_on').replace('{date}', new Date(selectedBadge.unlockedAt.replace(' ', 'T')).toLocaleDateString(getLocale() || 'en', { month: 'long', day: 'numeric', year: 'numeric' }))}
                    </p>
                {:else if !selectedBadge.unlocked}
                    <p class="badge-modal-hint">{$t('badges.locked_hint')}</p>
                {/if}
                {#if selectedBadge.unlocked}
                    <button class="badge-share-btn" onclick={() => shareBadge(selectedBadge)}>
                        {$t('badges.share')}
                    </button>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .trophy-case {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1rem;
        overflow: hidden;
    }

    .trophy-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
    }

    .trophy-header h3 {
        font-family: var(--font-heading);
        color: var(--text);
        font-size: 1rem;
        margin: 0;
    }

    .count {
        font-size: 0.7rem;
        color: var(--text-muted);
    }

    .progress-bar {
        height: 3px;
        background: var(--glass-bg);
        border-radius: 2px;
        margin-bottom: 0.75rem;
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
        gap: 0.35rem;
        margin-bottom: 0.75rem;
    }

    .filter-btn {
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: transparent;
        color: var(--text-muted);
        font-size: 0.65rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .filter-btn.active {
        background: var(--accent-bg);
        border-color: var(--accent-border);
        color: var(--accent);
    }

    .filter-btn:hover { border-color: var(--accent); }

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

    .badge-card.locked { opacity: 0.4; }

    .badge-icon { font-size: 1.5rem; }

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
        font-size: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
    }

    /* Modal */
    .badge-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
    }

    .badge-modal {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 2rem;
        max-width: 340px;
        width: 100%;
        text-align: center;
        position: relative;
    }

    .badge-modal-close {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 1.25rem;
        cursor: pointer;
        line-height: 1;
    }

    .badge-modal-close:hover { color: var(--text); }

    .badge-modal-icon {
        font-size: 3.5rem;
        margin-bottom: 1rem;
        opacity: 0.3;
    }

    .badge-modal-icon.unlocked { opacity: 1; }

    .badge-modal-info { display: flex; flex-direction: column; gap: 0.5rem; }

    .badge-modal-rarity {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-muted);
    }

    .badge-modal-rarity.common { color: var(--text-muted); }
    .badge-modal-rarity.uncommon { color: #4ade80; }
    .badge-modal-rarity.rare { color: #60a5fa; }
    .badge-modal-rarity.legendary { color: #fbbf24; }

    .badge-modal-name {
        font-family: var(--font-heading);
        font-size: 1.25rem;
        color: var(--text);
        margin: 0;
    }

    .badge-modal-desc {
        color: var(--text-dim);
        font-size: 0.85rem;
        margin: 0;
        line-height: 1.5;
    }

    .badge-modal-date {
        font-size: 0.75rem;
        color: var(--accent);
        margin: 0;
    }

    .badge-modal-hint {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin: 0;
        font-style: italic;
    }

    .badge-share-btn {
        margin-top: 1rem;
        padding: 0.5rem 1.25rem;
        background: var(--accent-bg);
        border: 1px solid var(--accent-border);
        border-radius: 999px;
        color: var(--accent);
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .badge-share-btn:hover {
        background: var(--accent);
        color: var(--bg);
    }
</style>
