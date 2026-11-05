<!-- src/routes/projects/+page.svelte
     The member's serials and collections — plus the AI gatherer: Workers
     AI reads the author's pieces (published and drafts) and proposes
     thematic collections, which are created only on explicit confirm. -->
<script>
    import { t } from '#lib/i18n/index.js';
    import { invalidateAll } from '$app/navigation';

    let { data } = $props();

    // inline creation
    let creatingKind = $state(null); // 'serial' | 'collection'
    let newTitle = $state('');
    let busy = $state(false);
    let createError = $state('');

    // AI gather
    let suggesting = $state(false);
    let suggestions = $state([]);
    let suggestError = $state('');
    let creatingIdx = $state(-1);
    let createdTitles = $state([]);
    let suggestTitles = $state({});   // piece id → title, from the suggest response

    function pidTitle(pid) {
        return suggestTitles[pid] || pid.slice(0, 8) + '…';
    }

    async function createProject(kind) {
        const title = newTitle.trim();
        if (!title || busy) return;
        busy = true;
        createError = '';
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, kind })
            });
            if (res.ok) {
                const d = await res.json();
                createdTitles = [...createdTitles, d.title];
                newTitle = '';
                creatingKind = null;
                // refresh server data
                await invalidateAll();
            } else {
                createError = $t('projects.create_failed');
            }
        } catch {
            createError = $t('projects.create_failed');
        }
        busy = false;
    }

    async function suggest() {
        if (suggesting) return;
        suggesting = true;
        suggestError = '';
        suggestions = [];
        try {
            const res = await fetch('/api/projects/suggest', { method: 'POST' });
            const d = await res.json();
            if (res.ok) {
                suggestions = d.suggestions || [];
                suggestError = suggestions.length ? '' : $t('projects.ai_none');
            } else if (d.code !== 'too_few') {
                suggestError = $t('projects.ai_failed');
            } else {
                suggestError = $t('projects.ai_few');
            }
        } catch {
            suggestError = $t('projects.ai_failed');
        }
        suggesting = false;
    }

    async function createFromSuggestion(s, i) {
        if (creatingIdx !== -1) return;
        creatingIdx = i;
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: s.title,
                    description: s.description,
                    kind: 'collection',
                    writing_ids: s.pieces
                })
            });
            if (res.ok) {
                createdTitles = [...createdTitles, s.title];
                suggestions = suggestions.filter((_, j) => j !== i);
                await invalidateAll();
            }
        } catch {}
        creatingIdx = -1;
    }
</script>

<svelte:head>
    <title>{$t('projects.page_title')} — Patrouch</title>
</svelte:head>

<div class="projects-page ambient-glow">
    <h1><span class="sig">{$t('projects.page_title')}</span></h1>

    <div class="actions glass-surface">
        <button class="act" onclick={() => (creatingKind = 'serial')}>➕ {$t('projects.new_serial')}</button>
        <button class="act" onclick={() => (creatingKind = 'collection')}>➕ {$t('projects.new_collection')}</button>
        <button class="act ai" onclick={suggest} disabled={suggesting}>
            {suggesting ? $t('projects.ai_working') : '✨ ' + $t('projects.ai_button')}
        </button>
        {#if creatingKind}
            <div class="create-row">
                <input
                    type="text"
                    bind:value={newTitle}
                    maxlength="120"
                    placeholder={creatingKind === 'serial' ? $t('projects.new_serial') : $t('projects.new_collection')}
                    onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createProject(creatingKind); } }}
                />
                <button class="act" onclick={() => createProject(creatingKind)} disabled={busy || !newTitle.trim()}>✓</button>
                <button class="act" onclick={() => (creatingKind = null)}>✕</button>
            </div>
        {/if}
        {#if createError}<span class="err">{createError}</span>{/if}
        {#if suggestError}<span class="err">{suggestError}</span>{/if}
        {#if createdTitles.length}
            <span class="ok">✓ {createdTitles.join(' · ')}</span>
        {/if}
    </div>

    {#if suggestions.length}
        <div class="suggestions">
            <h2>✨ {$t('projects.ai_title')}</h2>
            {#each suggestions as s, i (i)}
                <div class="suggestion glass-surface">
                    <div class="sug-head">
                        <h3>{s.title}</h3>
                        <button class="act" onclick={() => createFromSuggestion(s, i)} disabled={creatingIdx !== -1}>
                            {creatingIdx === i ? '…' : $t('projects.ai_create')}
                        </button>
                    </div>
                    {#if s.description}<p class="sug-desc">{s.description}</p>{/if}
                    <ul class="sug-pieces">
                        {#each s.pieces as pid (pid)}
                            <li><a href="/writings/{pid}">{pidTitle(pid)}</a></li>
                        {/each}
                    </ul>
                </div>
            {/each}
        </div>
    {/if}

    <section>
        <h2>{$t('projects.my_serials')}</h2>
        {#if data.serials.length === 0}
            <p class="empty">{$t('projects.empty')}</p>
        {:else}
            <div class="grid">
                {#each data.serials as p (p.id)}
                    <a href="/projects/{p.id}" class="pcard glass-surface">
                        <span class="kind">{$t('projects.kind_serial')}</span>
                        <h3>{p.title}</h3>
                        <span class="count">{$t('projects.count_parts').replace('{n}', p.piece_count)}</span>
                    </a>
                {/each}
            </div>
        {/if}
    </section>

    <section>
        <h2>{$t('projects.my_collections')}</h2>
        {#if data.collections.length === 0}
            <p class="empty">{$t('projects.empty')}</p>
        {:else}
            <div class="grid">
                {#each data.collections as p (p.id)}
                    <a href="/projects/{p.id}" class="pcard glass-surface">
                        <span class="kind coll">{$t('projects.kind_collection')}</span>
                        <h3>{p.title}</h3>
                        <span class="count">{$t('projects.count_pieces').replace('{n}', p.piece_count)}</span>
                    </a>
                {/each}
            </div>
        {/if}
    </section>
</div>

<style>
    .projects-page { max-width: 860px; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
    h1 { font-family: var(--font-display); font-weight: 900; font-size: clamp(2.2rem, 7vw, 3.2rem); line-height: 1; margin: 0 0 1.5rem; }
    .sig { color: var(--signature); }
    h2 { font-family: var(--font-heading); font-weight: 400; font-size: 1.25rem; margin: 2.25rem 0 1rem; color: var(--text); }

    .actions { padding: 1rem 1.1rem; display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
    .act {
        background: var(--glass-bg); border: 1px solid var(--border); border-radius: 999px;
        color: var(--text); font-family: var(--font-body); font-size: 0.85rem; font-weight: 600;
        padding: 0.5rem 1rem; cursor: pointer; transition: all 0.2s;
    }
    .act:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
    .act.ai { border-color: var(--accent-border); color: var(--accent); }
    .act:disabled { opacity: 0.6; cursor: wait; }
    .create-row { display: flex; gap: 0.5rem; flex: 1 1 100%; }
    .create-row input {
        flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
        color: inherit; font-family: inherit; font-size: 0.9rem; padding: 0.5rem 0.7rem;
    }
    .err { color: #e07a7a; font-size: 0.82rem; flex: 1 1 100%; }
    .ok { color: var(--accent); font-size: 0.82rem; flex: 1 1 100%; }

    .suggestion { padding: 1.25rem 1.4rem; margin-bottom: 1rem; }
    .sug-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .sug-head h3 { font-family: var(--font-heading); font-weight: 600; font-size: 1.15rem; margin: 0; color: var(--text); }
    .sug-desc { color: var(--text-dim); font-size: 0.9rem; margin: 0.5rem 0 0.75rem; }
    .sug-pieces { margin: 0 0 0 1.1rem; color: var(--text-muted); font-size: 0.85rem; line-height: 1.6; }
    .sug-pieces a { color: var(--text-dim); text-decoration: none; }
    .sug-pieces a:hover { color: var(--accent); }

    .grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
    @media (min-width: 640px) { .grid { grid-template-columns: 1fr 1fr; } }
    .pcard { padding: 1.3rem 1.4rem; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 0.5rem; transition: translate 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
    .pcard:hover { translate: 0 -4px; border-color: var(--accent); box-shadow: 0 16px 36px rgba(90, 110, 101, 0.16); }
    .pcard h3 { font-family: var(--font-heading); font-weight: 600; font-size: 1.1rem; margin: 0; color: var(--text); }
    .kind { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); }
    .kind.coll { color: var(--signature); }
    .count { font-size: 0.82rem; color: var(--text-muted); }
    .empty { color: var(--text-muted); font-style: italic; }
</style>
