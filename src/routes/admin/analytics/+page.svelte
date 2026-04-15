<script>
    import { onMount } from 'svelte';

    let analytics = $state({ overview: {}, byType: [], countries: [], devices: [], daily: [], topWritings: [] });
    let days = $state(30);
    let loading = $state(true);
    let error = $state(null);

    onMount(() => { loadAnalytics(); });

    async function loadAnalytics() {
        loading = true;
        error = null;
        try {
            const res = await fetch(`/api/analytics?days=${days}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            analytics = {
                overview: data.overview || {},
                byType: data.byType || [],
                countries: data.countries || [],
                devices: data.devices || [],
                daily: data.daily || [],
                topWritings: data.topWritings || []
            };
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    function handleDaysChange(e) {
        days = parseInt(e.target.value);
        loadAnalytics();
    }

    function getCountryFlag(code) {
        if (code === 'unknown') return '🌍';
        return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
    }

    function friendlyEvent(type) {
        const labels = { page_view: 'Page View', view_writing: 'View Writing', accept_prompt: 'Accept Prompt', pass_prompt: 'Pass Prompt' };
        return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    function fmtNum(n) { return n != null ? n.toLocaleString() : '0'; }

    function getMaxVisitors() {
        if (!analytics.daily || analytics.daily.length === 0) return 1;
        const max = Math.max(...analytics.daily.map(d => d.visitors || 0));
        return max > 0 ? max : 1;
    }
</script>

<svelte:head>
    <title>Analytics — patrouch.ca</title>
</svelte:head>

<div class="analytics-dashboard">
    <header>
        <h1>Analytics</h1>
        <div class="controls">
            <label for="days">Period:</label>
            <select id="days" value={days} onchange={handleDaysChange}>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
            </select>
        </div>
    </header>

    {#if error}
        <div class="error">{error}</div>
    {:else if loading}
        <div class="loading">Loading analytics...</div>
    {:else}
        <!-- Overview -->
        <section class="stats-overview">
            <div class="stat-card">
                <h3>Total Events</h3>
                <p class="big-number">{fmtNum(analytics.overview?.total_events)}</p>
            </div>
            <div class="stat-card">
                <h3>Unique Visitors</h3>
                <p class="big-number">{fmtNum(analytics.overview?.unique_visitors)}</p>
            </div>
            <div class="stat-card">
                <h3>Active Days</h3>
                <p class="big-number">{fmtNum(analytics.overview?.active_days)}</p>
            </div>
            <div class="stat-card">
                <h3>Countries</h3>
                <p class="big-number">{fmtNum(analytics.countries?.length)}</p>
            </div>
        </section>

        <!-- Events by Type -->
        <section class="data-section">
            <h2>Events by Type</h2>
            {#if analytics.byType?.length > 0}
                <table>
                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>Count</th>
                            <th>Unique Visitors</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each analytics.byType as row}
                            <tr>
                                <td>{friendlyEvent(row.event_type)}</td>
                                <td>{fmtNum(row.count)}</td>
                                <td>{fmtNum(row.unique_visitors)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {:else}
                <p class="empty">No event data yet</p>
            {/if}
        </section>

        <div class="two-col">
            <!-- Countries -->
            <section class="data-section">
                <h2>Countries</h2>
                {#if analytics.countries?.length > 0}
                    <ul class="country-list">
                        {#each analytics.countries as row}
                            <li>
                                <span class="flag">{getCountryFlag(row.country)}</span>
                                <span class="name">{row.country}</span>
                                <span class="count">{fmtNum(row.visitors)}</span>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="empty">No geographic data yet</p>
                {/if}
            </section>

            <!-- Devices -->
            <section class="data-section">
                <h2>Devices</h2>
                {#if analytics.devices?.length > 0}
                    <ul class="device-list">
                        {#each analytics.devices as row}
                            <li>
                                <span class="device-icon">{row.device === 'mobile' ? '📱' : row.device === 'tablet' ? '📱' : '🖥️'}</span>
                                <span class="name">{row.device}</span>
                                <span class="count">{fmtNum(row.count)}</span>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="empty">No device data yet</p>
                {/if}
            </section>
        </div>

        <!-- Daily Trend -->
        <section class="data-section">
            <h2>Daily Trend</h2>
            {#if analytics.daily?.length > 0}
                <div class="trend-chart">
                    {#each analytics.daily as row}
                        <div class="trend-bar-container" title="{row.date}: {fmtNum(row.visitors)} visitors, {fmtNum(row.events)} events">
                            <div class="trend-bar" style="height: {Math.max(4, ((row.visitors || 0) / getMaxVisitors()) * 100)}%"></div>
                            <span class="trend-label">{row.date.slice(5)}</span>
                        </div>
                    {/each}
                </div>
            {:else}
                <p class="empty">No daily data yet</p>
            {/if}
        </section>

        <!-- Top Writings -->
        <section class="data-section">
            <h2>Top Viewed Writings</h2>
            {#if analytics.topWritings?.length > 0}
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Views</th>
                            <th>Unique Visitors</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each analytics.topWritings as row}
                            <tr>
                                <td>
                                    <a href="/writings/{row.entity_id}">{row.title || row.entity_id}</a>
                                </td>
                                <td>{fmtNum(row.views)}</td>
                                <td>{fmtNum(row.unique_visitors)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {:else}
                <p class="empty">No writing view data yet</p>
            {/if}
        </section>
    {/if}
</div>

<style>
    .analytics-dashboard {
        max-width: 1100px;
        margin: 0 auto;
        padding: 2rem 1.5rem;
    }

    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;
    }

    h1 { font-family: var(--font-heading); color: var(--text); margin: 0; }
    h2 { font-family: var(--font-heading); color: var(--accent); font-size: 1.1rem; margin-bottom: 1rem; }

    .controls { display: flex; align-items: center; gap: 0.5rem; }
    .controls label { color: var(--text-dim); font-size: 0.85rem; }
    .controls select {
        padding: 0.4rem 0.75rem;
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 0.85rem;
    }

    .loading, .error, .empty {
        text-align: center;
        color: var(--text-muted);
        padding: 2rem;
    }
    .error { color: #fca5a5; }

    .stats-overview {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .stat-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1.25rem;
    }
    .stat-card h3 { color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.5rem; }
    .big-number { font-family: var(--font-heading); font-size: 2rem; color: var(--accent); margin: 0; }

    .data-section {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
    }

    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }
    td { padding: 0.6rem 0.75rem; color: var(--text-dim); border-bottom: 1px solid rgba(39,39,42,0.5); font-size: 0.85rem; }
    td a { color: var(--accent); text-decoration: none; }
    td a:hover { text-decoration: underline; }
    code { color: var(--accent); background: rgba(201,168,124,0.1); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.8rem; }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
    @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }

    .country-list, .device-list { list-style: none; padding: 0; margin: 0; }
    .country-list li, .device-list li { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; color: var(--text-dim); font-size: 0.85rem; border-bottom: 1px solid rgba(39,39,42,0.3); }
    .flag { font-size: 1.1rem; }
    .device-icon { font-size: 1rem; }
    .name { flex: 1; }
    .count { color: var(--accent); font-weight: 600; font-variant-numeric: tabular-nums; }

    .trend-chart {
        display: flex;
        align-items: flex-end;
        gap: 2px;
        height: 120px;
        padding-top: 1rem;
    }
    .trend-bar-container { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
    .trend-bar { width: 100%; max-width: 24px; background: var(--accent); border-radius: 3px 3px 0 0; min-height: 4px; transition: height 0.3s; opacity: 0.8; }
    .trend-bar:hover { opacity: 1; }
    .trend-label { font-size: 0.6rem; color: var(--text-muted); margin-top: 4px; }
</style>
