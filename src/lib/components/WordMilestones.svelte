<script>
    let { stats = {} } = $props();

    const totalWords = stats.total_words || 0;
    const totalWritings = stats.total_writings || 0;
    const currentStreak = stats.current_streak || 0;

    const wordMilestones = [
        { value: 1000, label: '1K', icon: '📝' },
        { value: 5000, label: '5K', icon: '📝' },
        { value: 10000, label: '10K', icon: '📖' },
        { value: 25000, label: '25K', icon: '📖' },
        { value: 50000, label: '50K', icon: '📚' },
        { value: 100000, label: '100K', icon: '📚' }
    ];

    const writingMilestones = [
        { value: 1, label: '1', icon: '✍️' },
        { value: 5, label: '5', icon: '✍️' },
        { value: 10, label: '10', icon: '🖊️' },
        { value: 25, label: '25', icon: '🖊️' },
        { value: 50, label: '50', icon: '🏆' },
        { value: 100, label: '100', icon: '🏆' }
    ];

    const streakMilestones = [
        { value: 3, label: '3 days', icon: '🔥' },
        { value: 7, label: '7 days', icon: '🔥' },
        { value: 14, label: '14 days', icon: '🔥' },
        { value: 30, label: '30 days', icon: '💫' },
        { value: 60, label: '60 days', icon: '💫' },
        { value: 100, label: '100 days', icon: '⭐' }
    ];

    function getProgress(current, target) {
        return Math.min(100, (current / target) * 100);
    }

    function getNextMilestone(milestones, current) {
        return milestones.find(m => current < m.value) || null;
    }

    const nextWordMilestone = $derived(getNextMilestone(wordMilestones, totalWords));
    const nextWritingMilestone = $derived(getNextMilestone(writingMilestones, totalWritings));
    const nextStreakMilestone = $derived(getNextMilestone(streakMilestones, currentStreak));
</script>

<div class="milestones">
    <h3>📊 Progress Milestones</h3>

    <!-- Words -->
    <section class="milestone-group">
        <h4>📝 Total Words: {totalWords.toLocaleString()}</h4>
        {#if nextWordMilestone}
            <div class="milestone-track">
                {#each wordMilestones as m}
                    <div class="milestone-dot" class:achieved={totalWords >= m.value}>
                        <span class="dot">{totalWords >= m.value ? m.icon : '○'}</span>
                        <span class="label">{m.label}</span>
                    </div>
                {/each}
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {getProgress(totalWords, nextWordMilestone.value)}%"></div>
            </div>
            <p class="next-milestone">Next: {nextWordMilestone.label} words ({(nextWordMilestone.value - totalWords).toLocaleString()} to go)</p>
        {:else}
            <p class="all-complete">🎉 All word milestones achieved!</p>
        {/if}
    </section>

    <!-- Writings -->
    <section class="milestone-group">
        <h4>🖊️ Writings: {totalWritings}</h4>
        {#if nextWritingMilestone}
            <div class="milestone-track">
                {#each writingMilestones as m}
                    <div class="milestone-dot" class:achieved={totalWritings >= m.value}>
                        <span class="dot">{totalWritings >= m.value ? m.icon : '○'}</span>
                        <span class="label">{m.label}</span>
                    </div>
                {/each}
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {getProgress(totalWritings, nextWritingMilestone.value)}%"></div>
            </div>
            <p class="next-milestone">Next: {nextWritingMilestone.label} writings ({nextWritingMilestone.value - totalWritings} to go)</p>
        {:else}
            <p class="all-complete">🎉 All writing milestones achieved!</p>
        {/if}
    </section>

    <!-- Streak -->
    <section class="milestone-group">
        <h4>🔥 Current Streak: {currentStreak} days</h4>
        {#if nextStreakMilestone}
            <div class="milestone-track">
                {#each streakMilestones as m}
                    <div class="milestone-dot" class:achieved={currentStreak >= m.value}>
                        <span class="dot">{currentStreak >= m.value ? m.icon : '○'}</span>
                        <span class="label">{m.label}</span>
                    </div>
                {/each}
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {getProgress(currentStreak, nextStreakMilestone.value)}%"></div>
            </div>
            <p class="next-milestone">Next: {nextStreakMilestone.label} ({nextStreakMilestone.value - currentStreak} days to go)</p>
        {:else}
            <p class="all-complete">🎉 All streak milestones achieved!</p>
        {/if}
    </section>
</div>

<style>
    .milestones {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1.25rem;
    }

    .milestones > h3 {
        font-family: var(--font-heading);
        color: var(--accent);
        font-size: 1rem;
        margin: 0 0 1rem;
    }

    .milestone-group {
        margin-bottom: 1.25rem;
        padding-bottom: 1.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .milestone-group:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
    }

    .milestone-group h4 {
        color: var(--text);
        font-size: 0.85rem;
        margin: 0 0 0.75rem;
        font-weight: 500;
    }

    .milestone-track {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .milestone-dot {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        flex: 1;
    }

    .dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(201, 168, 124, 0.1);
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        transition: all 0.3s;
    }

    .milestone-dot.achieved .dot {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--bg);
    }

    .label {
        font-size: 0.55rem;
        color: var(--text-muted);
    }

    .progress-bar {
        height: 4px;
        background: rgba(201, 168, 124, 0.1);
        border-radius: 2px;
        margin-bottom: 0.3rem;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: var(--accent);
        border-radius: 2px;
        transition: width 0.5s ease;
    }

    .next-milestone {
        font-size: 0.7rem;
        color: var(--text-muted);
        margin: 0;
    }

    .all-complete {
        font-size: 0.8rem;
        color: var(--accent);
        margin: 0;
        font-weight: 500;
    }
</style>
