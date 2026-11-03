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
            }
        } catch {}
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
        background: rgba(0,0,0,0.25); border: 1px solid var(--border, #3a3f4d); border-radius: 8px;
        color: inherit; font-family: inherit; font-size: 0.82rem; padding: 0.4rem 0.55rem;
    }
    .pp-select:focus, .pp-input:focus { outline: none; border-color: var(--accent, #c9a87c); }
    .pp-input { flex: 1; min-width: 10rem; }
    .pp-btn {
        background: none; border: 1px solid var(--border, #3a3f4d); border-radius: 8px;
        color: var(--text-dim, #aaa); padding: 0.35rem 0.6rem; font-size: 0.85rem; cursor: pointer;
    }
    .pp-btn:hover:not(:disabled) { border-color: var(--accent, #c9a87c); color: var(--accent, #c9a87c); }
    .pp-btn:disabled { opacity: 0.5; cursor: wait; }
</style>
