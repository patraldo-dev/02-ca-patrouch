<script>
    import { onMount } from 'svelte';

    let { heatmapData = {} } = $props();

    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let weeks = $state([]);
    let selectedDay = $state(null);
    let loading = $state(true);

    onMount(async () => {
        if (Object.keys(heatmapData).length > 0) {
            buildGrid(heatmapData);
            loading = false;
        }
    });

    function buildGrid(data) {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 364);
        // Align to Monday
        const dayOfWeek = startDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate.setDate(startDate.getDate() + mondayOffset);

        const grid = [];
        const current = new Date(startDate);

        while (current <= today) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                const dateStr = current.toISOString().split('T')[0];
                const entry = data[dateStr] || { count: 0, words: 0 };
                week.push({
                    date: dateStr,
                    count: entry.count,
                    words: entry.words,
                    day: current.getDate(),
                    month: current.getMonth(),
                    isFuture: current > today
                });
                current.setDate(current.getDate() + 1);
            }
            grid.push(week);
        }

        weeks = grid;
        loading = false;
    }

    function getLevel(count) {
        if (count === 0) return 0;
        if (count === 1) return 1;
        if (count <= 3) return 2;
        if (count <= 5) return 3;
        return 4;
    }

    function getMonthLabel(weekIndex) {
        const week = weeks[weekIndex];
        if (!week) return '';
        // Find the first day of the week that's in a new month
        for (let i = 0; i < week.length; i++) {
            if (i === 0 || week[i].month !== week[i - 1]?.month) {
                return MONTHS[week[i].month];
            }
        }
        return '';
    }

    function handleDayClick(day) {
        if (day.isFuture || day.count === 0) return;
        selectedDay = selectedDay?.date === day.date ? null : day;
    }
</script>

<div class="heatmap-container">
    {#if loading}
        <div class="loading">Loading activity...</div>
    {:else}
        <div class="heatmap-header">
            <span class="label">Less</span>
            <div class="legend">
                <span class="cell level-0"></span>
                <span class="cell level-1"></span>
                <span class="cell level-2"></span>
                <span class="cell level-3"></span>
                <span class="cell level-4"></span>
            </div>
            <span class="label">More</span>
        </div>

        <div class="heatmap-scroll">
            <div class="heatmap-grid">
                <!-- Day labels -->
                <div class="day-labels">
                    {#each DAYS as day, i}
                        <span>{day}</span>
                    {/each}
                </div>

                <!-- Weeks -->
                <div class="weeks">
                    <!-- Month labels row -->
                    <div class="month-labels">
                        {#each weeks as week, i}
                            <span class="month-label" style="grid-column: {i + 1}">{getMonthLabel(i)}</span>
                        {/each}
                    </div>

                    <!-- Cells -->
                    <div class="cells">
                        {#each weeks as week, wi}
                            {#each week as day, di}
                                <button
                                    class="cell level-{getLevel(day.count)}"
                                    class:active={selectedDay?.date === day.date}
                                    class:empty={day.count === 0}
                                    onclick={() => handleDayClick(day)}
                                    title="{day.date}: {day.count} writing{day.count !== 1 ? 's' : ''}, {day.words} words"
                                    disabled={day.isFuture}
                                ></button>
                            {/each}
                        {/each}
                    </div>
                </div>
            </div>
        </div>

        {#if selectedDay}
            <div class="day-tooltip">
                <strong>{selectedDay.date}</strong>
                <span>{selectedDay.count} writing{selectedDay.count !== 1 ? 's' : ''} · {selectedDay.words} words</span>
            </div>
        {/if}
    {/if}
</div>

<style>
    .heatmap-container {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1.25rem;
    }

    .loading {
        text-align: center;
        color: var(--text-muted);
        padding: 2rem;
    }

    .heatmap-header {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.4rem;
        margin-bottom: 0.5rem;
    }

    .label {
        font-size: 0.65rem;
        color: var(--text-muted);
    }

    .legend {
        display: flex;
        gap: 3px;
    }

    .heatmap-scroll {
        overflow-x: auto;
        padding-bottom: 0.5rem;
    }

    .heatmap-grid {
        display: flex;
        gap: 0.5rem;
        min-width: fit-content;
    }

    .day-labels {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding-top: 14px;
    }

    .day-labels span {
        font-size: 0.6rem;
        color: var(--text-muted);
        height: 11px;
        line-height: 11px;
    }

    .weeks {
        display: flex;
        flex-direction: column;
    }

    .month-labels {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 11px;
        margin-bottom: 4px;
        height: 12px;
    }

    .month-label {
        font-size: 0.6rem;
        color: var(--text-muted);
    }

    .cells {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 11px;
        gap: 3px;
    }

    .cell {
        width: 11px;
        height: 11px;
        border-radius: 2px;
        border: none;
        padding: 0;
        cursor: pointer;
        transition: outline 0.1s;
    }

    .cell:hover:not(.empty):not(:disabled) {
        outline: 1px solid var(--accent);
    }

    .cell:disabled {
        cursor: default;
    }

    .level-0 { background: rgba(201, 168, 124, 0.06); }
    .level-1 { background: rgba(201, 168, 124, 0.2); }
    .level-2 { background: rgba(201, 168, 124, 0.4); }
    .level-3 { background: rgba(201, 168, 124, 0.65); }
    .level-4 { background: rgba(201, 168, 124, 0.9); }

    .cell.active {
        outline: 2px solid var(--accent);
    }

    .day-tooltip {
        margin-top: 0.75rem;
        padding: 0.5rem 0.75rem;
        background: rgba(201, 168, 124, 0.1);
        border-radius: 6px;
        font-size: 0.8rem;
        color: var(--text-dim);
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .day-tooltip strong {
        color: var(--accent);
    }
</style>
