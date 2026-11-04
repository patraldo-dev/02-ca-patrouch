<script>
    // ProjectPicker — choose (or create) the serial/collection a writing
    // belongs to. Projects v1: title + description, nothing more. Creating
    // happens immediately on ✚ so the parent only ever deals with a projectId.
    import { t } from '#lib/i18n/index.js';
    import { browser } from '$app/env';

    let { projectId = $bindable(null), onPick } = $props();

    let projects = $state([]);
    let loaded = $state(false);
    let creating = $state(false);
    let newTitle = $state('');
    let busy = $state(false);
    // Feedback after creating: name it saved + where to find it.
    let saved = $state(null);   // { id, title }
    let createError = $state('');

    async function load() {
        try {
            const res = await fetch('/api/projects');
            if (res.ok) {
                const d = await res.json();
                projects = d.projects || [];
            }
        } catch {}
        loaded = true;
    }

    if (browser) load();

    async function createProject() {
        const title = newTitle.trim();
        if (!title || busy) return;
        busy = true;
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
            if (res.ok) {
                const d = await res.json();
                projects = [{ id: d.id, title: d.title, part_count: 0, description: null, locale: 'es' }, ...projects];
                projectId = d.id;
                onPick?.(d.id);
                creating = false;
                newTitle = '';
                saved = { id: d.id, title: d.title };
                createError = '';
            } else {
                createError = $t('projects.create_failed');
            }
        } catch {
            createError = $t('projects.create_failed');
        }
        busy = false;
    }
</script>

<div class="pp">
    <label class="pp-label" for="pp-select">📚 {$t('projects.label')}</label>
    {#if creating}
        <input
            class="pp-input"
            type="text"
            bind:value={newTitle}
            maxlength="120"
            placeholder={$t('projects.new_placeholder')}
            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createProject(); } }}
        />
        <button class="pp-btn" onclick={createProject} disabled={busy || !newTitle.trim()}>
            {busy ? '…' : '✓'}
        </button>
        <button class="pp-btn" onclick={() => (creating = false)}>×</button>
    {:else}
        {#if saved}
            <span class="pp-note">
                ✓ {$t('projects.created')} «{saved.title}» —
                <a href="/projects/{saved.id}">{$t('projects.open')}</a>
            </span>
        {/if}
        {#if createError}
            <span class="pp-note pp-err">{createError}</span>
        {/if}
        <select
            id="pp-select"
            class="pp-select"
            value={projectId ?? ''}
            onchange={(e) => {
                const v = e.target.value;
                if (v === '__new__') { creating = true; return; }
                projectId = v || null;
                onPick?.(projectId);
            }}
        >
            <option value="">{$t('projects.none')}</option>
            {#each projects as p}
                <option value={p.id}>{p.title}{p.part_count ? ` · ${p.part_count}` : ''}</option>
            {/each}
            <option value="__new__">➕ {$t('projects.new')}</option>
        </select>
    {/if}
</div>

<style>
    .pp { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .pp-label { font-size: 0.8rem; color: var(--text-dim, #aaa); }
    .pp-select, .pp-input {
        background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
        color: inherit; font-family: inherit; font-size: 0.82rem; padding: 0.4rem 0.55rem;
    }
    .pp-note { font-size: 0.78rem; color: var(--text-dim); }
    .pp-note a { color: var(--accent); font-weight: 600; text-decoration: underline; }
    .pp-err { color: #e07a7a; }
    .pp-select:focus, .pp-input:focus { outline: none; border-color: var(--accent, #a8bdb3); }
    .pp-input { flex: 1; min-width: 10rem; }
    .pp-btn {
        background: none; border: 1px solid var(--border, #3a3f4d); border-radius: 8px;
        color: var(--text-dim, #aaa); padding: 0.35rem 0.6rem; font-size: 0.85rem; cursor: pointer;
    }
    .pp-btn:hover:not(:disabled) { border-color: var(--accent, #a8bdb3); color: var(--accent, #a8bdb3); }
    .pp-btn:disabled { opacity: 0.5; cursor: wait; }
</style>
