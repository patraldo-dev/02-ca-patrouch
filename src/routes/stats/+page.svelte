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
        max-width: 100%;
        margin: 1.5rem auto;
        padding: 0 2rem 4rem;
        font-size: 1.15rem;
    }
    .stats-page h1 {
        font-family: var(--font-heading);
        font-size: 2.75rem;
        font-weight: 300;
        color: var(--text);
        margin-bottom: 1.25rem;
    }
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }
    .stat-card {
        background: var(--surface, #141417);
        border: 1px solid var(--border, #333);
        border-radius: 12px;
        padding: 2.5rem 1rem;
        text-align: center;
    }
    .stat-value {
        display: block;
        font-family: var(--font-heading);
        font-size: 3.25rem;
        font-weight: 700;
        color: var(--accent, #c9a87c);
        line-height: 1;
    }
    .stat-label {
        font-size: 1.1rem;
        color: var(--text-muted, #a1a1aa);
        margin-top: 0.35rem;
    }
    .section-card {
        background: var(--surface, #141417);
        border: 1px solid var(--border, #333);
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 1rem;
    }
    .section-card h2 {
        font-family: var(--font-heading);
        font-size: 1.75rem;
        font-weight: 400;
        color: var(--text);
        margin: 0 0 0.75rem;
    }
    @media (max-width: 600px) {
        .stats-grid { grid-template-columns: 1fr; gap: 0.5rem; }
        .stats-page { padding: 0 1rem 3rem; }
        .stat-value { font-size: 2.5rem; }
        .stat-card { padding: 1.5rem 1rem; }
    }
</style>
