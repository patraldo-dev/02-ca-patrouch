<!-- src/routes/admin/landmarks/+page.svelte -->
<script>
  let { data } = $props();
  let landmarks = $state(data.landmarks || []);
  let message = $state('');
  let messageError = $state(false);
  let editingId = $state(null);

  // New landmark form
  let newLandmark = $state({
    name: '',
    description: '',
    lat: '',
    lng: '',
    category: 'landmark',
    sort_order: 0,
  });

  // Edit state
  let editData = $state({});

  function showMsg(text, isError = false) {
    message = text;
    messageError = isError;
    setTimeout(() => { message = ''; }, 4000);
  }

  async function addLandmark() {
    if (!newLandmark.name || !newLandmark.lat || !newLandmark.lng) {
      showMsg('Name, lat, lng required', true);
      return;
    }

    try {
      const res = await fetch('/api/admin/landmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLandmark,
          lat: parseFloat(newLandmark.lat),
          lng: parseFloat(newLandmark.lng),
          sort_order: parseInt(newLandmark.sort_order) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`"${newLandmark.name}" added`);
        newLandmark = { name: '', description: '', lat: '', lng: '', category: 'landmark', sort_order: 0 };
        await reload();
      } else {
        showMsg(data.error || 'Failed', true);
      }
    } catch {
      showMsg('Network error', true);
    }
  }

  async function saveEdit(id) {
    try {
      const res = await fetch('/api/admin/landmarks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...editData,
          lat: parseFloat(editData.lat),
          lng: parseFloat(editData.lng),
          sort_order: parseInt(editData.sort_order) || 0,
          active: editData.active ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('Updated');
        editingId = null;
        await reload();
      } else {
        showMsg(data.error || 'Failed', true);
      }
    } catch {
      showMsg('Network error', true);
    }
  }

  async function deleteLandmark(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/landmarks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMsg(`"${name}" deleted`);
        await reload();
      } else {
        const err = await res.json();
        showMsg(err.error || 'Failed', true);
      }
    } catch {
      showMsg('Network error', true);
    }
  }

  async function toggleActive(landmark) {
    const newActive = landmark.active ? 0 : 1;
    try {
      await fetch('/api/admin/landmarks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: landmark.id, active: newActive }),
      });
      await reload();
    } catch { /* silent */ }
  }

  function startEdit(landmark) {
    editingId = landmark.id;
    editData = {
      name: landmark.name,
      description: landmark.description || '',
      lat: landmark.lat,
      lng: landmark.lng,
      category: landmark.category || 'landmark',
      image_url: landmark.image_url || '',
      link_url: landmark.link_url || '',
      sort_order: landmark.sort_order || 0,
      active: landmark.active,
    };
  }

  async function reload() {
    const res = await fetch('/api/admin/landmarks');
    if (res.ok) {
      const data = await res.json();
      landmarks = data.landmarks || [];
    }
  }

  const categories = ['landmark', 'monument', 'park', 'museum', 'church', 'plaza', 'sculpture', 'other'];
</script>

<svelte:head>
  <title>Tour Landmarks — Admin</title>
</svelte:head>

<div class="landmarks-container">
  <header class="page-header">
    <h1>Tour Landmarks</h1>
    <p class="subtitle">Manage coordinates and details for the WebXR tour map</p>
  </header>

  {#if message}
    <div class="message" class:error={messageError}>{message}</div>
  {/if}

  <!-- Add new landmark -->
  <section class="add-section">
    <h2>+ Add Landmark</h2>
    <div class="form-grid">
      <div class="field">
        <label>Name</label>
        <input type="text" bind:value={newLandmark.name} placeholder="Monumento a...">
      </div>
      <div class="field">
        <label>Latitude</label>
        <input type="number" step="any" bind:value={newLandmark.lat} placeholder="20.67750">
      </div>
      <div class="field">
        <label>Longitude</label>
        <input type="number" step="any" bind:value={newLandmark.lng} placeholder="-103.34725">
      </div>
      <div class="field">
        <label>Category</label>
        <select bind:value={newLandmark.category}>
          {#each categories as cat}
            <option value={cat}>{cat}</option>
          {/each}
        </select>
      </div>
      <div class="field">
        <label>Description</label>
        <input type="text" bind:value={newLandmark.description} placeholder="Short description">
      </div>
      <div class="field">
        <label>Sort Order</label>
        <input type="number" bind:value={newLandmark.sort_order} placeholder="0">
      </div>
    </div>
    <button class="btn-add" onclick={addLandmark}>Add Landmark</button>
  </section>

  <!-- Landmarks table -->
  <section class="table-section">
    {#if landmarks.length === 0}
      <div class="empty-state">
        <p>No landmarks yet. Add one above.</p>
      </div>
    {:else}
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th class="col-active">Active</th>
              <th>Name</th>
              <th>Lat</th>
              <th>Lng</th>
              <th>Category</th>
              <th class="col-order">Order</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each landmarks as lm (lm.id)}
              {#if editingId === lm.id}
                <!-- Edit row -->
                <tr class="edit-row">
                  <td>
                    <input type="checkbox" bind:checked={editData.active} />
                  </td>
                  <td>
                    <input type="text" bind:value={editData.name} class="edit-input" />
                    <input type="text" bind:value={editData.description} class="edit-input desc" placeholder="Description" />
                    <input type="text" bind:value={editData.image_url} class="edit-input desc" placeholder="Image URL" />
                    <input type="text" bind:value={editData.link_url} class="edit-input desc" placeholder="Link URL" />
                  </td>
                  <td>
                    <input type="number" step="any" bind:value={editData.lat} class="edit-input coord" />
                  </td>
                  <td>
                    <input type="number" step="any" bind:value={editData.lng} class="edit-input coord" />
                  </td>
                  <td>
                    <select bind:value={editData.category}>
                      {#each categories as cat}
                        <option value={cat}>{cat}</option>
                      {/each}
                    </select>
                  </td>
                  <td>
                    <input type="number" bind:value={editData.sort_order} class="edit-input small" />
                  </td>
                  <td class="actions-cell">
                    <button class="btn-save" onclick={() => saveEdit(lm.id)}>💾</button>
                    <button class="btn-cancel" onclick={() => editingId = null}>✕</button>
                  </td>
                </tr>
              {:else}
                <!-- Display row -->
                <tr class:inactive={!lm.active}>
                  <td>
                    <button class="toggle-btn" class:on={lm.active} onclick={() => toggleActive(lm)}>
                      {lm.active ? '●' : '○'}
                    </button>
                  </td>
                  <td>
                    <div class="name-cell">
                      <strong>{lm.name}</strong>
                      {#if lm.description}
                        <span class="desc-text">{lm.description}</span>
                      {/if}
                    </div>
                  </td>
                  <td class="coord-cell">{lm.lat}</td>
                  <td class="coord-cell">{lm.lng}</td>
                  <td>
                    <span class="cat-badge">{lm.category || 'landmark'}</span>
                  </td>
                  <td class="order-cell">{lm.sort_order || 0}</td>
                  <td class="actions-cell">
                    <button class="btn-edit" onclick={() => startEdit(lm)}>✏️</button>
                    <button class="btn-delete" onclick={() => deleteLandmark(lm.id, lm.name)}>🗑️</button>
                    <a
                      href="https://www.google.com/maps?q={lm.lat},{lm.lng}"
                      target="_blank"
                      rel="noopener"
                      class="btn-map"
                      title="Open in Google Maps"
                    >📍</a>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <div class="back-link">
    <a href="/admin">← Back to Admin</a>
  </div>
</div>

<style>
  .landmarks-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }
  .page-header { margin-bottom: 2rem; }
  .page-header h1 {
    font-family: var(--font-heading);
    font-size: 1.75rem;
    font-weight: 300;
    color: var(--text);
    margin-bottom: 0.5rem;
  }
  .subtitle { color: var(--text-muted); font-size: 0.9rem; }
  .message {
    padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem;
    font-size: 0.9rem;
    background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); color: #4ade80;
  }
  .message.error {
    background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.3); color: #f87171;
  }

  /* Add section */
  .add-section {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    padding: 1.5rem; margin-bottom: 2rem;
  }
  .add-section h2 {
    font-family: var(--font-heading); font-size: 1.1rem; font-weight: 400;
    color: var(--text); margin-bottom: 1rem;
  }
  .form-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem; margin-bottom: 1rem;
  }
  .field { display: flex; flex-direction: column; gap: 0.3rem; }
  .field label {
    font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
    color: var(--text-muted); font-weight: 600;
  }
  .field input, .field select {
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    padding: 0.5rem 0.75rem; color: var(--text); font-size: 0.85rem;
    font-family: var(--font-body);
  }
  .field input:focus, .field select:focus {
    outline: none; border-color: var(--accent);
  }
  .btn-add {
    background: var(--accent); color: var(--bg); border: none; border-radius: 8px;
    padding: 0.6rem 1.5rem; font-weight: 600; cursor: pointer; font-size: 0.9rem;
    transition: opacity 0.2s;
  }
  .btn-add:hover { opacity: 0.85; }

  /* Table */
  .table-section { margin-bottom: 2rem; }
  .empty-state {
    text-align: center; padding: 3rem 2rem;
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    color: var(--text-muted);
  }
  .table-wrapper {
    overflow-x: auto; border-radius: 12px; border: 1px solid var(--border);
    background: var(--surface);
  }
  table { width: 100%; border-collapse: collapse; min-width: 700px; }
  th {
    background: rgba(255,255,255,0.03); padding: 0.75rem 1rem; text-align: left;
    font-weight: 600; color: var(--text-muted); font-size: 0.75rem;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  td {
    padding: 0.75rem 1rem; border-top: 1px solid var(--border);
    color: var(--text); font-size: 0.85rem; vertical-align: top;
  }
  tr:hover { background: rgba(255,255,255,0.02); }
  tr.inactive { opacity: 0.5; }
  tr.edit-row { background: rgba(201, 168, 124, 0.05); }

  .col-active { width: 50px; text-align: center; }
  .col-order { width: 60px; text-align: center; }
  .col-actions { width: 100px; text-align: center; }

  .name-cell { display: flex; flex-direction: column; gap: 0.2rem; }
  .desc-text { font-size: 0.75rem; color: var(--text-muted); }
  .coord-cell { font-family: monospace; font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; }
  .order-cell { text-align: center; }

  .cat-badge {
    padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem;
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
    background: rgba(96, 165, 250, 0.12); color: #60a5fa;
  }

  /* Buttons */
  .toggle-btn {
    background: none; border: none; cursor: pointer; font-size: 1.1rem;
    color: var(--text-muted); transition: color 0.2s;
  }
  .toggle-btn.on { color: #4ade80; }
  .actions-cell { white-space: nowrap; }
  .btn-edit, .btn-delete, .btn-save, .btn-cancel, .btn-map {
    background: none; border: 1px solid transparent; cursor: pointer;
    padding: 0.3rem 0.4rem; border-radius: 6px; font-size: 0.85rem;
    transition: all 0.2s; text-decoration: none;
  }
  .btn-edit:hover { background: rgba(96, 165, 250, 0.1); border-color: rgba(96, 165, 250, 0.3); }
  .btn-delete:hover { background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.3); }
  .btn-save { color: #4ade80; }
  .btn-save:hover { background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.3); }
  .btn-cancel { color: var(--text-muted); }
  .btn-cancel:hover { background: rgba(255,255,255,0.05); }
  .btn-map { color: var(--text-muted); }
  .btn-map:hover { color: var(--accent); }

  /* Edit inputs */
  .edit-input {
    background: var(--bg); border: 1px solid var(--border); border-radius: 4px;
    padding: 0.3rem 0.5rem; color: var(--text); font-size: 0.8rem; width: 100%;
    margin-bottom: 0.3rem;
  }
  .edit-input.coord { width: 110px; font-family: monospace; }
  .edit-input.small { width: 50px; text-align: center; }
  .edit-input:focus { outline: none; border-color: var(--accent); }

  .back-link { margin-top: 2rem; }
  .back-link a { color: var(--text-muted); text-decoration: none; font-size: 0.9rem; }
  .back-link a:hover { color: var(--accent); }
</style>
