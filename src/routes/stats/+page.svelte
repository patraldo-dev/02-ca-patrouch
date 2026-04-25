<script>
    import { t } from '$lib/i18n';
    import WritingHeatmap from '$lib/components/WritingHeatmap.svelte';
    import BadgeTrophyCase from '$lib/components/BadgeTrophyCase.svelte';
    import WordMilestones from '$lib/components/WordMilestones.svelte';

    let { data } = $props();

    const avgWords = data.writings.length > 0
        ? Math.round(data.totalWords / data.writings.length)
        : 0;
</script>

<svelte:head>
    <title>{$t('pages.home.works.stats')} — patrouch.ca</title>
</svelte:head>

<div class="stats-page">
    <h1>{$t('pages.home.works.stats')}</h1>

    <!-- Summary cards -->
    <div class="stats-grid">
        <div class="stat-card">
            <span class="stat-value">{data.writings.length}</span>
            <span class="stat-label">Writings</span>
        </div>
        <div class="stat-card">
            <span class="stat-value">{data.totalWords.toLocaleString()}</span>
            <span class="stat-label">Total Words</span>
        </div>
        <div class="stat-card">
            <span class="stat-value">{avgWords}</span>
            <span class="stat-label">Avg / Writing</span>
        </div>
    </div>

    <!-- Heatmap -->
    <section class="section-card">
        <h2>Writing Activity</h2>
        <WritingHeatmap writings={data.writings} />
    </section>

    <!-- Milestones -->
    <section class="section-card">
        <h2>Milestones</h2>
        <WordMilestones totalWords={data.totalWords} />
    </section>

    <!-- Badges -->
    <section class="section-card">
        <h2>Badges</h2>
        <BadgeTrophyCase badges={data.badges} />
    </section>
</div>

<style>
    .stats-page {
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1.5rem 4rem;
    }
    .stats-page h1 {
        font-family: var(--font-heading);
        font-size: 2rem;
        font-weight: 300;
        color: var(--text);
        margin-bottom: 1.5rem;
    }
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        margin-bottom: 2rem;
    }
    .stat-card {
        background: var(--surface, #141417);
        border: 1px solid var(--border, #333);
        border-radius: 12px;
        padding: 1.25rem;
        text-align: center;
    }
    .stat-value {
        display: block;
        font-family: var(--font-heading);
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--accent, #c9a87c);
    }
    .stat-label {
        font-size: 0.85rem;
        color: var(--text-muted, #a1a1aa);
    }
    .section-card {
        background: var(--surface, #141417);
        border: 1px solid var(--border, #333);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
    }
    .section-card h2 {
        font-family: var(--font-heading);
        font-size: 1.25rem;
        font-weight: 400;
        color: var(--text);
        margin: 0 0 1rem;
    }
    @media (max-width: 600px) {
        .stats-grid { grid-template-columns: 1fr; }
        .stats-page { padding: 0 1rem 3rem; }
    }
</style>
