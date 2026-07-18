<script>
    let { data } = $props();

    let models = $state(data.models || []);
    let showForm = $state(false);
    let editing = $state(null);
    let message = $state('');

    const KINDS = ['quadruped', 'figure', 'vehicle', 'structure', 'plant', 'water', 'light_source', 'object'];
    const PACKS = ['core', 'antoine', 'guest-artist'];
    const TIERS = ['free', 'premium'];
    const COLLIDERS = ['box', 'sphere', 'cylinder', 'capsule'];

    // Form state
    let form = $state({
        id: '', kind: 'figure', label: '', match_labels: '',
        file_path: '', pack: 'core', artist: '', tier: 'free',
        scale: 1.0, collider_type: 'box', collider_size: '[0.5, 0.4, 0.8]',
        description: '', tags: ''
    });

    function resetForm() {
        form = {
            id: '', kind: 'figure', label: '', match_labels: '',
            file_path: '', pack: 'core', artist: '', tier: 'free',
            scale: 1.0, collider_type: 'box', collider_size: '[0.5, 0.4, 0.8]',
            description: '', tags: ''
        };
        editing = null;
    }

    function editModel(m) {
        editing = m.id;
        form = {
            id: m.id,
            kind: m.kind,
            label: m.label,
            match_labels: (m.match_labels || []).join(', '),
            file_path: m.file_path,
            pack: m.pack || 'core',
            artist: m.artist || '',
            tier: m.tier || 'free',
            scale: m.scale || 1.0,
            collider_type: m.collider_type || 'box',
            collider_size: m.collider_size ? JSON.stringify(m.collider_size) : '[0.5, 0.4, 0.8]',
            description: m.description || '',
            tags: (m.tags || []).join(', ')
        };
        showForm = true;
    }

    async function saveModel() {
        message = '';
        const payload = {
            ...form,
            id: form.id || `${form.kind}-${form.label.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36).slice(-4)}`,
            match_labels: form.match_labels ? form.match_labels.split(',').map(s => s.trim()).filter(Boolean) : [],
            collider_size: form.collider_size ? JSON.parse(form.collider_size) : null,
            tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        };

        try {
            const res = await fetch('/api/assets/library/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (res.ok) {
                message = `✓ Saved: ${payload.id}`;
                showForm = false;
                resetForm();
                // Refresh list
                const listRes = await fetch('/api/assets/library/manage');
                const listData = await listRes.json();
                models = listData.models || [];
            } else {
                message = `✗ ${result.error}`;
            }
        } catch (e) {
            message = `✗ ${e.message}`;
        }
    }

    async function retireModel(id) {
        if (!confirm(`Retire ${id}? (Soft delete — won't load in new scenes)`)) return;
        try {
            const res = await fetch(`/api/assets/library/manage/${id}`, { method: 'DELETE' });
            if (res.ok) {
                message = `✓ Retired: ${id}`;
                models = models.filter(m => m.id !== id);
            }
        } catch (e) {
            message = `✗ ${e.message}`;
        }
    }

    function previewUrl(filePath) {
        if (!filePath) return '';
        // GLB files can't be previewed in-browser, but we can link to them
        return `/api/assets/${filePath}`;
    }
</script>

<svelte:head><title>Asset Library — Admin</title></svelte:head>

<div class="admin-assets">
    <header>
        <h1>GLB Asset Library</h1>
        <p class="count">{models.length} models · {models.filter(m => m.status === 'active').length} active</p>
        <button class="btn-add" onclick={() => { resetForm(); showForm = !showForm; }}>
            {showForm ? '✕ Cancel' : '+ Add Model'}
        </button>
    </header>

    {#if message}
        <div class="message">{message}</div>
    {/if}

    {#if showForm}
        <div class="form-card">
            <h2>{editing ? 'Edit Model' : 'Add New Model'}</h2>
            <div class="form-grid">
                <label>
                    <span>ID</span>
                    <input bind:value={form.id} placeholder="auto: kind-label-xxxx (leave blank)" />
                </label>
                <label>
                    <span>Kind *</span>
                    <select bind:value={form.kind}>
                        {#each KINDS as k}<option value={k}>{k}</option>{/each}
                    </select>
                </label>
                <label>
                    <span>Label *</span>
                    <input bind:value={form.label} placeholder="dog, tree, person..." />
                </label>
                <label>
                    <span>Match labels (comma-separated)</span>
                    <input bind:value={form.match_labels} placeholder="dog, wolf, perro, puppy" />
                </label>
                <label class="wide">
                    <span>R2 file path *</span>
                    <input bind:value={form.file_path} placeholder="models/scene-elements/quadruped-dog-01.glb" />
                </label>
                <label>
                    <span>Pack</span>
                    <select bind:value={form.pack}>
                        {#each PACKS as p}<option value={p}>{p}</option>{/each}
                    </select>
                </label>
                <label>
                    <span>Tier</span>
                    <select bind:value={form.tier}>
                        {#each TIERS as t}<option value={t}>{t}</option>{/each}
                    </select>
                </label>
                <label>
                    <span>Artist</span>
                    <input bind:value={form.artist} placeholder="Antoine Patraldo" />
                </label>
                <label>
                    <span>Scale</span>
                    <input type="number" step="0.1" bind:value={form.scale} />
                </label>
                <label>
                    <span>Collider type</span>
                    <select bind:value={form.collider_type}>
                        {#each COLLIDERS as c}<option value={c}>{c}</option>{/each}
                    </select>
                </label>
                <label>
                    <span>Collider size (JSON array)</span>
                    <input bind:value={form.collider_size} placeholder="[0.5, 0.4, 0.8]" />
                </label>
                <label class="wide">
                    <span>Description</span>
                    <input bind:value={form.description} placeholder="Optional notes" />
                </label>
                <label class="wide">
                    <span>Tags (comma-separated)</span>
                    <input bind:value={form.tags} placeholder="animal, mammal, ground" />
                </label>
            </div>
            <div class="form-actions">
                <button class="btn-save" onclick={saveModel}>Save Model</button>
            </div>
        </div>
    {/if}

    {#if models.length === 0}
        <div class="empty">No models in the library yet. Click "Add Model" to create the first one.</div>
    {:else}
        <table class="model-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Kind</th>
                    <th>Label</th>
                    <th>Artist</th>
                    <th>File</th>
                    <th>Pack</th>
                    <th>Tier</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {#each models as m (m.id)}
                    <tr class:retired={m.status === 'retired'}>
                        <td class="mono">{m.id}</td>
                        <td><span class="badge kind-{m.kind}">{m.kind}</span></td>
                        <td>{m.label}</td>
                        <td>{m.artist || '—'}</td>
                        <td class="mono small">{m.file_path}</td>
                        <td>{m.pack}</td>
                        <td>{m.tier}</td>
                        <td>{m.status}</td>
                        <td class="actions">
                            <button title="Edit" onclick={() => editModel(m)}>✎</button>
                            <button title="Retire" onclick={() => retireModel(m.id)}>🗑</button>
                            <a href={previewUrl(m.file_path)} target="_blank" title="View file">🔗</a>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>

<style>
    .admin-assets { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }
    header { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
    h1 { margin: 0; font-size: 1.6rem; color: var(--text); }
    .count { color: var(--text-muted); font-size: 0.9rem; }
    .btn-add {
        margin-left: auto; padding: 0.5rem 1.2rem; background: var(--accent);
        color: var(--bg); border: none; border-radius: 8px; cursor: pointer;
        font-weight: 600; font-size: 0.9rem;
    }
    .message { padding: 0.75rem 1rem; background: var(--surface-raised); border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.9rem; }

    .form-card {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;
    }
    .form-card h2 { margin: 0 0 1rem; font-size: 1.1rem; }
    .form-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem;
    }
    .form-grid label { display: flex; flex-direction: column; gap: 0.3rem; }
    .form-grid label.wide { grid-column: 1 / -1; }
    .form-grid span { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-grid input, .form-grid select {
        padding: 0.5rem; background: var(--bg); color: var(--text);
        border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem;
    }
    .form-actions { margin-top: 1.5rem; }
    .btn-save {
        padding: 0.6rem 1.5rem; background: var(--accent); color: var(--bg);
        border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
    }

    .empty { padding: 3rem; text-align: center; color: var(--text-muted); }

    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 0.6rem; border-bottom: 2px solid var(--border); font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); }
    td { padding: 0.6rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    tr.retired { opacity: 0.5; }
    .mono { font-family: monospace; }
    .small { font-size: 0.75rem; }
    .badge { padding: 0.15rem 0.5rem; border-radius: 50px; font-size: 0.75rem; font-weight: 600; background: var(--surface-raised); }
    .actions { display: flex; gap: 0.4rem; }
    .actions button, .actions a {
        padding: 0.25rem 0.5rem; background: var(--surface-raised); border: 1px solid var(--border);
        border-radius: 4px; cursor: pointer; text-decoration: none; font-size: 0.85rem; color: var(--text);
    }
    .actions button:hover { border-color: var(--accent); }

    @media (max-width: 700px) {
        .form-grid { grid-template-columns: 1fr; }
        table { font-size: 0.75rem; }
    }
</style>
