<script>
    import { onMount } from 'svelte';

    import { t, getLocale } from '$lib/i18n';

    let { heatmapData = {} } = $props();

    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let weeks = $state([]);
    let selectedDay = $state(null);

    onMount(() => {
        if (Object.keys(heatmapData).length > 0) {
            buildGrid(heatmapData);
        }
    });

    function buildGrid(data) {
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1); // 12 months back
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
                    month: current.getMonth(),
                    isFuture: current > today
                });
                current.setDate(current.getDate() + 1);
            }
            grid.push(week);
        }

        weeks = grid;
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
        if (weekIndex === 0) return MONTHS[week[0].month];
        const prevWeek = weeks[weekIndex - 1];
        if (week[0].month !== prevWeek[0].month) {
            return MONTHS[week[0].month];
        }
        return '';
    }

    function handleDayClick(day) {
        if (day.isFuture || day.count === 0) return;
        selectedDay = selectedDay?.date === day.date ? null : day;
    }
</script>

<div class="heatmap-container">
    <div class="heatmap-header">
        <span class="heatmap-title">{$t('write.heatmap_title')} <span class="heatmap-year">{new Date().getFullYear()}</span></span>
        <div class="legend">
            <span class="label">{$t('write.heatmap_less')}</span>
            <span class="cell level-0"></span>
            <span class="cell level-1"></span>
            <span class="cell level-2"></span>
            <span class="cell level-3"></span>
            <span class="cell level-4"></span>
            <span class="label">{$t('write.heatmap_more')}</span>
        </div>
    </div>

    <div class="heatmap-grid">
        <!-- Month labels -->
        <div class="month-labels">
            {#each weeks as week, i}
                <span class="month-label">{getMonthLabel(i)}</span>
            {/each}
        </div>

        <!-- Cells -->
        <div class="cells">
            {#each weeks as week}
                <div class="week-col">
                    {#each week as day}
                        <button
                            class="cell level-{getLevel(day.count)}"
                            class:active={selectedDay?.date === day.date}
                            onclick={() => handleDayClick(day)}
                            title="{day.date}: {day.count} writing{day.count !== 1 ? 's' : ''}, {day.words} words"
                            disabled={day.isFuture}
                        ></button>
                    {/each}
                </div>
            {/each}
        </div>
    </div>

    {#if selectedDay}
        <div class="day-tooltip">
            <strong>{selectedDay.date}</strong>
            <span>{selectedDay.count} writing{selectedDay.count !== 1 ? 's' : ''} · {selectedDay.words} words</span>
        </div>
    {/if}
</div>

<style>
    .heatmap-container {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1rem;
        overflow: hidden;
    }

    .heatmap-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
    }

    .heatmap-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text);
    }
    .heatmap-year {
        font-weight: 400;
        color: var(--text-muted);
    }

    .legend {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .label {
        font-size: 0.7rem;
        color: var(--text-muted);
    }

    .heatmap-grid {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .month-labels {
        display: flex;
        gap: 2px;
        margin-bottom: 2px;
    }

    .month-label {
        font-size: 0.65rem;
        color: var(--text-muted);
        width: 12px;
        text-align: center;
        flex-shrink: 0;
    }

    .cells {
        display: flex;
        gap: 2px;
    }

    .week-col {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex-shrink: 0;
    }

    .cell {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        border: none;
        padding: 0;
        cursor: pointer;
        transition: outline 0.1s;
    }

    .cell:hover:not(:disabled) {
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
        margin-top: 0.5rem;
        padding: 0.4rem 0.6rem;
        background: rgba(201, 168, 124, 0.1);
        border-radius: 6px;
        font-size: 0.85rem;
        color: var(--text-dim);
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .day-tooltip strong {
        color: var(--accent);
    }
</style>
