<!-- src/routes/admin/maintenance/+page.svelte — cleanup & maintenance tools -->
<script>
    import { browser } from '$app/env';
    import { onMount } from 'svelte';

    let report = $state(null);
    let busy = $state('');
    let results = $state([]);
    let deleteUserEmail = $state('');

    async function loadReport() {
        if (!browser) return;
        try {
            const res = await fetch('/api/admin/maintenance');
            if (res.ok) report = await res.json();
        } catch {}
    }

    function armOrRun(btn, run) {
        if (btn.dataset.armed) {
            delete btn.dataset.armed;
            btn.textContent = btn.dataset.label;
            run();
        } else {
            btn.dataset.armed = '1';
            btn.dataset.label = btn.textContent;
            btn.textContent = '⚠ Confirm — click again';
            setTimeout(() => {
                if (btn.dataset.armed) {
                    delete btn.dataset.armed;
                    btn.textContent = btn.dataset.label;
                }
            }, 3000);
        }
    }

    async function run(action, extra = {}, btn = null) {
        if (btn) {
            const act = () => execute(action, extra);
            armOrRun(btn, act);
            return;
        }
        execute(action, extra);
    }

    async function execute(action, extra = {}) {
        busy = action;
        try {
            const res = await fetch('/api/admin/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...extra })
            });
            const d = await res.json();
            if (!res.ok) {
                results.unshift({ action, ok: false, msg: d.message || 'Failed' });
            } else {
                results.unshift({ action, ok: true, msg: summarize(action, d) });
                if (extra.email) deleteUserEmail = '';
            }
            results = results.slice(0, 8);
            await loadReport();
        } catch (e) {
            results.unshift({ action, ok: false, msg: 'Network error' });
        }
        busy = '';
    }

    function summarize(action, d) {
        switch (action) {
            case 'purge_sessions': return `${d.deleted} expired session(s) deleted`;
            case 'purge_notifications': return `${d.deleted} old read notification(s) deleted`;
            case 'purge_test_prompts': return `${d.deleted} test prompt(s) deleted (${d.logRows} log rows)`;
            case 'delete_user': return `Removed ${d.email} (${d.details.writings || 0} writings, ${d.details.comments || 0} comments)`;
            case 'dedupe_writings': return `${d.deleted} duplicate writing(s) removed across ${d.groups} group(s)${d.skipped ? `, ${d.skipped} skipped (have comments)` : ''}`;
            case 'recompute_stats': return `${d.corrected} user stat row(s) corrected`;
            default: return JSON.stringify(d);
        }
    }

    onMount(loadReport);
</script>

<svelte:head><title>Maintenance · Admin</title></svelte:head>

<div class="maint-container">
    <header class="maint-header">
        <h1>Maintenance</h1>
        <p>Cleanup tools. The report is read-only — every destructive action needs a second confirming click. Nothing here deletes admin accounts.</p>
    </header>

    {#if !report}
        <p class="loading">Loading report…</p>
    {:else}
        <div class="maint-grid">
            <section class="maint-card">
                <h2>Expired sessions</h2>
                <p class="card-desc">{report.expiredSessions} session(s) past expiry.</p>
                <button class="btn" onclick={(e) => run('purge_sessions', {}, e.currentTarget)} disabled={busy === 'purge_sessions' || !report.expiredSessions}>
                    Purge expired sessions
                </button>
            </section>

            <section class="maint-card">
                <h2>Old notifications</h2>
                <p class="card-desc">{report.oldNotifications} read notification(s) older than 30 days.</p>
                <button class="btn" onclick={(e) => run('purge_notifications', {}, e.currentTarget)} disabled={busy === 'purge_notifications' || !report.oldNotifications}>
                    Purge old notifications
                </button>
            </section>

            <section class="maint-card">
                <h2>Duplicate writings</h2>
                <p class="card-desc">
                    {report.duplicateGroups} group(s) with the same user + prompt, {report.duplicateRows} duplicate row(s).
                    Keeps the published (or latest) one; {report.duplicateBlocked} blocked by comments.
                </p>
                <button class="btn" onclick={(e) => run('dedupe_writings', {}, e.currentTarget)} disabled={busy === 'dedupe_writings' || !report.duplicateRows}>
                    Remove duplicates
                </button>
            </section>

            <section class="maint-card">
                <h2>Test prompts</h2>
                <p class="card-desc">{report.testPrompts} prompt(s) with a <code>test-</code> id or <code>test</code> category.</p>
                <button class="btn" onclick={(e) => run('purge_test_prompts', {}, e.currentTarget)} disabled={busy === 'purge_test_prompts' || !report.testPrompts}>
                    Delete test prompts
                </button>
            </section>

            <section class="maint-card">
                <h2>Writing stats</h2>
                <p class="card-desc">{report.statsDrift} user(s) whose totals disagree with their actual writings (leftover from the duplicate-save bug).</p>
                <button class="btn" onclick={() => run('recompute_stats')} disabled={busy === 'recompute_stats' || !report.statsDrift}>
                    Recompute from writings
                </button>
            </section>

            <section class="maint-card danger">
                <h2>Delete a user</h2>
                <p class="card-desc">Removes the user and everything they own (writings, comments, stats, sessions). Admin accounts are refused.</p>
                <div class="row">
                    <input type="email" placeholder="user@example.com" bind:value={deleteUserEmail} />
                    <button class="btn" onclick={(e) => { e.preventDefault(); if (deleteUserEmail.trim()) run('delete_user', { email: deleteUserEmail.trim() }, e.currentTarget); }} disabled={busy === 'delete_user' || !deleteUserEmail.trim()}>
                        Delete user
                    </button>
                </div>
            </section>
        </div>
    {/if}

    {#if results.length}
        <div class="results">
            <h3>Results</h3>
            {#each results as r, i}
                <div class="result" class:bad={!r.ok}>{r.ok ? '✓' : '✗'} <strong>{r.action}</strong> — {r.msg}</div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .maint-container { max-width: 72rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
    .maint-header { margin-bottom: 1.5rem; }
    .maint-header h1 { font-size: 1.6rem; }
    .maint-header p { color: var(--muted, #999); font-size: 0.9rem; max-width: 60ch; }
    .loading { color: var(--muted, #999); }
    .maint-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr)); gap: 1rem; }
    .maint-card { background: var(--surface, #1b1e27); border: 1px solid var(--border, #333); border-radius: 10px; padding: 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .maint-card.danger { border-color: rgba(224, 141, 109, 0.5); }
    .maint-card h2 { font-size: 1rem; margin: 0; }
    .card-desc { color: var(--muted, #999); font-size: 0.83rem; flex: 1; }
    .card-desc code { background: rgba(255,255,255,0.06); padding: 0 0.3rem; border-radius: 4px; }
    .btn { align-self: flex-start; background: none; border: 1px solid var(--border, #3a3f4d); color: inherit; border-radius: 8px; padding: 0.5rem 0.9rem; font-size: 0.85rem; cursor: pointer; font-family: inherit; }
    .btn:hover:not(:disabled) { border-color: var(--accent, #a8bdb3); color: var(--accent, #a8bdb3); }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .maint-card.danger .btn:hover:not(:disabled) { border-color: #e08d6d; color: #e08d6d; }
    .row { display: flex; gap: 0.5rem; }
    .row input { flex: 1; background: rgba(0,0,0,0.25); border: 1px solid var(--border, #3a3f4d); border-radius: 8px; padding: 0.5rem 0.7rem; color: inherit; font-family: inherit; font-size: 0.85rem; }
    .results { margin-top: 1.5rem; }
    .results h3 { font-size: 0.95rem; }
    .result { font-size: 0.85rem; padding: 0.45rem 0.7rem; border: 1px solid var(--border, #333); border-radius: 8px; margin-bottom: 0.4rem; color: var(--muted, #aaa); }
    .result.bad { color: #e08d6d; }
</style>
