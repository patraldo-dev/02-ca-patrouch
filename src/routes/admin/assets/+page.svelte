<script>
    let { data } = $props();

    let models = $state(data.models || []);
    let showForm = $state(false);
    let editing = $state(null);
    let message = $state('');
    let uploading = $state(false);
    let uploadProgress = $state('');

    // ── Categorized options for the dropdowns ──
    const KIND_GROUPS = {
        'Living Things': [
            { value: 'quadruped', label: 'Quadruped (dog, wolf, horse, cat)' },
            { value: 'figure', label: 'Figure (person, crowd, ghost)' },
        ],
        'Built Environment': [
            { value: 'structure', label: 'Structure (building, bridge, tower)' },
            { value: 'vehicle', label: 'Vehicle (car, boat, bike)' },
            { value: 'light_source', label: 'Light Source (lamp, fire, sun)' },
        ],
        'Nature': [
            { value: 'plant', label: 'Plant (tree, flower, bush)' },
            { value: 'water', label: 'Water (river, lake, pool)' },
        ],
        'Other': [
            { value: 'object', label: 'Object (anything else)' },
        ],
    };

    const COLLIDER_PRESETS = {
        box: { label: 'Box (buildings, vehicles)', defaultSize: '[0.5, 0.4, 0.8]' },
        sphere: { label: 'Sphere (rounded objects, spirits)', defaultSize: '[0.4]' },
        cylinder: { label: 'Cylinder (trees, columns)', defaultSize: '[0.2, 2.0]' },
        capsule: { label: 'Capsule (people, figures)', defaultSize: '[0.3, 1.2]' },
    };

    // Extract existing artists and packs from the data for quick selection
    let existingArtists = $derived([...new Set(models.map(m => m.artist).filter(Boolean))].sort());
    let existingPacks = $derived([...new Set(models.map(m => m.pack).filter(Boolean))].sort());

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
        uploadProgress = '';
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

    // When collider type changes, update the default size
    function onColliderChange() {
        const preset = COLLIDER_PRESETS[form.collider_type];
        if (preset) {
            form.collider_size = preset.defaultSize;
        }
    }

    // ── File upload ──
    async function handleFileUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        uploading = true;
        uploadProgress = `Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('kind', form.kind);

            const res = await fetch('/api/assets/upload', {
                method: 'POST',
                body: formData
            });
            const result = await res.json();

            if (res.ok) {
                form.file_path = result.file_path;
                uploadProgress = `✓ Uploaded: ${result.file_path} (${(result.size / 1024 / 1024).toFixed(1)} MB)`;
                // Auto-generate a label from the filename if empty
                if (!form.label) {
                    const baseName = file.name.replace(/\.glb$/i, '').replace(/[-_]/g, ' ');
                    form.label = baseName.split(' ').pop().toLowerCase();
                }
                // Auto-generate ID if empty
                if (!form.id) {
                    form.id = `${form.kind}-${(form.label || 'model').toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36).slice(-4)}`;
                }
            } else {
                uploadProgress = `✗ ${result.error}`;
            }
        } catch (e) {
            uploadProgress = `✗ ${e.message}`;
        } finally {
            uploading = false;
        }
    }

    async function saveModel() {
        message = '';

        if (!form.file_path) {
            message = '✗ Please upload a GLB file first (or enter the R2 path manually)';
            return;
        }

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
        return `/api/assets/${filePath}`;
    }
</script>

<svelte:head><title>GLB Asset Library — Admin</title></svelte:head>

<div class="admin-assets">
    <header>
        <h1>📦 GLB Asset Library</h1>
        <p class="count">{models.length} models · {models.filter(m => m.status === 'active').length} active · {existingArtists.length} artists</p>
        <button class="btn-add" onclick={() => { resetForm(); showForm = !showForm; }}>
            {showForm ? '✕ Cancel' : '+ Add Model'}
        </button>
    </header>

    {#if message}
        <div class="message" role="alert">{message}</div>
    {/if}

    {#if showForm}
        <div class="form-card">
            <h2>{editing ? 'Edit Model' : 'Add New Model'}</h2>

            <!-- File Upload -->
            <div class="upload-section">
                <label class="upload-label" for="file-upload">
                    <span class="field-label">
                        GLB File
                        <span class="tooltip" title="Select the .glb file exported from Monster Mash, Blockbench, or another tool. It uploads to Cloudflare R2 automatically.">ⓘ</span>
                    </span>
                </label>
                <div class="upload-controls">
                    <input
                        id="file-upload"
                        type="file"
                        accept=".glb,model/gltf-binary"
                        onchange={handleFileUpload}
                        disabled={uploading}
                    />
                    {#if form.file_path}
                        <span class="file-done">✓ {form.file_path}</span>
                    {/if}
                </div>
                {#if uploadProgress}
                    <p class="upload-status">{uploadProgress}</p>
                {/if}
            </div>

            <div class="form-grid">
                <label>
                    <span class="field-label">
                        Kind
                        <span class="tooltip" title="The category this model belongs to. Must match what Mistral generates from the writing. When a visitor writes about a dog, Mistral outputs kind='quadruped'.">ⓘ</span>
                    </span>
                    <select bind:value={form.kind}>
                        {#each Object.entries(KIND_GROUPS) as [group, options]}
                            <optgroup label={group}>
                                {#each options as opt}
                                    <option value={opt.value}>{opt.label}</option>
                                {/each}
                            </optgroup>
                        {/each}
                    </select>
                </label>

                <label>
                    <span class="field-label">
                        Label
                        <span class="tooltip" title="The primary name for this object. If Mistral generates 'dog', this should be 'dog'. Keep it short and specific.">ⓘ</span>
                    </span>
                    <input bind:value={form.label} placeholder="dog, tree, person..." />
                </label>

                <label class="wide">
                    <span class="field-label">
                        Match labels
                        <span class="tooltip" title="Comma-separated synonyms that should also match this model. When Mistral generates 'wolf', 'puppy', or 'perro', they all find the dog model. Include translations.">ⓘ</span>
                    </span>
                    <input bind:value={form.match_labels} placeholder="dog, wolf, perro, puppy, chien" />
                </label>

                <label class="wide">
                    <span class="field-label">
                        R2 file path
                        <span class="tooltip" title="The storage path in Cloudflare R2. Auto-filled after upload, or enter manually if you uploaded via wrangler CLI.">ⓘ</span>
                    </span>
                    <input bind:value={form.file_path} placeholder="models/scene-elements/quadruped-dog.glb" />
                </label>

                <label>
                    <span class="field-label">
                        Pack
                        <span class="tooltip" title="The collection this model belongs to. 'core' is the free base library. Named packs (antoine, guest-artist) are premium tier collections with a distinct visual style.">ⓘ</span>
                    </span>
                    <input list="pack-suggestions" bind:value={form.pack} placeholder="core" />
                    <datalist id="pack-suggestions">
                        {#each existingPacks as p}<option value={p}></option>{/each}
                        <option value="core"></option>
                        <option value="antoine"></option>
                        <option value="guest-artist"></option>
                    </datalist>
                </label>

                <label>
                    <span class="field-label">
                        Artist
                        <span class="tooltip" title="The person who created this model. NOT the tool (Monster Mash). The artist is the human author who gets attribution.">ⓘ</span>
                    </span>
                    <input list="artist-suggestions" bind:value={form.artist} placeholder="Antoine Patraldo" />
                    <datalist id="artist-suggestions">
                        {#each existingArtists as a}<option value={a}></option>{/each}
                    </datalist>
                </label>

                <label>
                    <span class="field-label">
                        Tier
                        <span class="tooltip" title="Free models are available to all visitors. Premium models only load for members/admins. Use for artist packs that are a paid feature.">ⓘ</span>
                    </span>
                    <select bind:value={form.tier}>
                        <option value="free">Free (all visitors)</option>
                        <option value="premium">Premium (members only)</option>
                    </select>
                </label>

                <label>
                    <span class="field-label">
                        Scale
                        <span class="tooltip" title="Size multiplier. 1.0 = default. Increase if the model appears too small, decrease if too large. The system normalizes height to ~1.2 units first, then applies this.">ⓘ</span>
                    </span>
                    <input type="number" step="0.1" min="0.1" max="5" bind:value={form.scale} />
                </label>

                <label>
                    <span class="field-label">
                        Collider type
                        <span class="tooltip" title="The simple shape used for collision physics. Do NOT use mesh-accurate colliders for Monster Mash models (too slow). Pick the simplest shape that roughly matches the silhouette.">ⓘ</span>
                    </span>
                    <select bind:value={form.collider_type} onchange={onColliderChange}>
                        {#each Object.entries(COLLIDER_PRESETS) as [value, preset]}
                            <option value={value}>{preset.label}</option>
                        {/each}
                    </select>
                </label>

                <label>
                    <span class="field-label">
                        Collider size (JSON)
                        <span class="tooltip" title="Dimensions as a JSON array. Box: [width, height, depth]. Sphere: [radius]. Cylinder/Capsule: [radius, height]. Auto-updates when you change collider type.">ⓘ</span>
                    </span>
                    <input bind:value={form.collider_size} placeholder="[0.5, 0.4, 0.8]" />
                </label>

                <label class="wide">
                    <span class="field-label">
                        Description
                        <span class="tooltip" title="Optional notes about this model. E.g. which artwork it was derived from, or creation notes.">ⓘ</span>
                    </span>
                    <input bind:value={form.description} placeholder="Yellow figure created from Antoine's sketch via Monster Mash" />
                </label>

                <label class="wide">
                    <span class="field-label">
                        Tags
                        <span class="tooltip" title="Comma-separated keywords for search and organization. E.g. 'animal, mammal, ground'.">ⓘ</span>
                    </span>
                    <input bind:value={form.tags} placeholder="animal, mammal, character" />
                </label>
            </div>
            <div class="form-actions">
                <button class="btn-save" onclick={saveModel} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Save Model'}
                </button>
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
                            <a href={previewUrl(m.file_path)} target="_blank" title="View file" rel="noopener">🔗</a>
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

    /* Upload section */
    .upload-section {
        background: var(--bg); border: 2px dashed var(--border);
        border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;
    }
    .upload-label { display: block; margin-bottom: 0.5rem; }
    .upload-controls { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .upload-controls input[type="file"] {
        padding: 0.4rem; background: var(--surface); border: 1px solid var(--border);
        border-radius: 6px; color: var(--text); font-size: 0.85rem;
    }
    .file-done { color: #8fbc8f; font-size: 0.85rem; font-family: monospace; }
    .upload-status { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem; }

    /* Form */
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

    /* Field labels with tooltips */
    .field-label {
        font-size: 0.8rem; color: var(--text-muted); font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.5px;
        display: inline-flex; align-items: center; gap: 0.3rem;
    }
    .tooltip {
        display: inline-flex; align-items: center; justify-content: center;
        width: 16px; height: 16px; border-radius: 50%;
        background: var(--surface-raised); color: var(--text-dim);
        font-size: 0.7rem; cursor: help; font-weight: 700;
    }
    .tooltip:hover { background: var(--accent); color: var(--bg); }

    .form-grid input, .form-grid select {
        padding: 0.5rem; background: var(--bg); color: var(--text);
        border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem;
    }
    .form-actions { margin-top: 1.5rem; }
    .btn-save {
        padding: 0.6rem 1.5rem; background: var(--accent); color: var(--bg);
        border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
    }
    .btn-save:disabled { opacity: 0.5; cursor: default; }

    /* Table */
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
