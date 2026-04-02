<!-- src/routes/profile/+page.svelte -->
<script>
    import { t } from '$lib/i18n';
    import { goto } from '$app/navigation';

    let { data } = $props();

    let profiles = $state(data.profiles || []);
    let newName = $state('');
    let newLocale = $state('en');
    let newBio = $state('');
    let isCreating = $state(false);
    let editingId = $state(null);
    let editName = $state('');
    let editLocale = $state('');
    let editBio = $state('');
    let message = $state('');
    let messageError = $state(false);

    function flash(msg, isError = false) {
        message = msg;
        messageError = isError;
        setTimeout(() => { message = ''; }, 3000);
    }

    async function createProfile() {
        if (newName.trim().length < 2) return;
        isCreating = true;
        try {
            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ display_name: newName, locale: newLocale, bio: newBio })
            });
            if (res.ok) {
                const d = await res.json();
                profiles = [...profiles, { ...d.profile, is_active: 0 }];
                newName = ''; newBio = '';
                flash($t('profile.created'));
                goto('?t=' + Date.now());
            } else {
                const err = await res.json();
                flash(err.error || 'Error', true);
            }
        } catch { flash('Network error', true); }
        finally { isCreating = false; }
    }

    function startEdit(p) {
        editingId = p.id;
        editName = p.display_name;
        editLocale = p.locale;
        editBio = p.bio || '';
    }

    function cancelEdit() {
        editingId = null;
    }

    async function saveEdit(id) {
        try {
            const res = await fetch(`/api/profiles/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ display_name: editName, locale: editLocale, bio: editBio })
            });
            if (res.ok) {
                profiles = profiles.map(p => p.id === id ? { ...p, display_name: editName, locale: editLocale, bio: editBio } : p);
                editingId = null;
                flash($t('profile.updated'));
            } else {
                const err = await res.json();
                flash(err.error || 'Error', true);
            }
        } catch { flash('Network error', true); }
    }

    async function deleteProfile(id, name) {
        if (!confirm(`Delete "${name}"?`)) return;
        try {
            const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
            if (res.ok) {
                profiles = profiles.filter(p => p.id !== id);
                flash($t('profile.deleted'));
            } else {
                const err = await res.json();
                flash(err.error || 'Error', true);
            }
        } catch { flash('Network error', true); }
    }
</script>

<svelte:head>
    <title>{$t('profile.title')}</title>
</svelte:head>

<div class="profile-page">
    <h1>{$t('profile.title')}</h1>
    <p class="profile-subtitle">{$t('profile.subtitle')}</p>

    {#if message}
        <div class="message" class:error={messageError}>{message}</div>
    {/if}

    <!-- Existing Profiles -->
    <div class="profiles-list">
        {#each profiles as p}
            <div class="profile-card" class:active={p.is_active}>
                <div class="profile-card-header">
                    <span class="profile-card-avatar">{p.display_name[0].toUpperCase()}</span>
                    <div class="profile-card-info">
                        <h3>{p.display_name}</h3>
                        <div class="profile-card-meta">
                            <span>{p.locale?.toUpperCase()}</span>
                            {#if p.is_primary} <span class="primary-badge">{$t('profile.primary')}</span> {/if}
                            {#if p.is_active} <span class="active-badge">{$t('profile.active')}</span> {/if}
                        </div>
                    </div>
                </div>

                {#if p.bio}
                    <p class="profile-card-bio">{p.bio}</p>
                {/if}

                {#if editingId === p.id}
                    <div class="profile-edit-form">
                        <input bind:value={editName} placeholder="Display name" />
                        <select bind:value={editLocale}>
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                        </select>
                        <textarea bind:value={editBio} placeholder="Bio (optional)" rows="2"></textarea>
                        <div class="edit-actions">
                            <button class="btn-save" onclick={() => saveEdit(p.id)}>{$t('profile.save')}</button>
                            <button class="btn-cancel" onclick={cancelEdit}>{$t('profile.cancel')}</button>
                        </div>
                    </div>
                {:else}
                    <div class="profile-card-actions">
                        <button onclick={() => startEdit(p)}>{$t('profile.edit')}</button>
                        {#if !p.is_primary}
                            <button class="btn-delete" onclick={() => deleteProfile(p.id, p.display_name)}>{$t('profile.delete')}</button>
                        {/if}
                    </div>
                {/if}
            </div>
        {/each}
    </div>

    <!-- Create New -->
    {#if profiles.length < 5}
        <div class="create-card">
            <h2>{$t('profile.create_new')}</h2>
            <div class="create-form">
                <input bind:value={newName} placeholder={$t('profile.name_placeholder')} minlength="2" />
                <select bind:value={newLocale}>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                </select>
                <textarea bind:value={newBio} placeholder={$t('profile.bio_placeholder')} rows="2"></textarea>
                <button class="btn-create" onclick={createProfile} disabled={isCreating || newName.trim().length < 2}>
                    {isCreating ? '...' : $t('profile.create')}
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    .profile-page {
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
    }
    .profile-page h1 {
        font-family: var(--font-heading);
        font-size: 2rem;
        font-weight: 300;
        color: var(--text);
        margin-bottom: 0.5rem;
    }
    .profile-subtitle {
        color: var(--text-muted);
        font-size: 0.9rem;
        margin-bottom: 2rem;
    }
    .message {
        padding: 0.75rem 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        font-size: 0.9rem;
        background: rgba(74, 222, 128, 0.1);
        border: 1px solid rgba(74, 222, 128, 0.3);
        color: #4ade80;
    }
    .message.error {
        background: rgba(248, 113, 113, 0.1);
        border-color: rgba(248, 113, 113, 0.3);
        color: #f87171;
    }
    .profiles-list { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
    .profile-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.25rem;
    }
    .profile-card.active { border-color: var(--accent); }
    .profile-card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .profile-card-avatar {
        width: 40px; height: 40px; border-radius: 50%; background: var(--accent);
        color: var(--bg); display: flex; align-items: center; justify-content: center;
        font-size: 1rem; font-weight: 700;
    }
    .profile-card-info h3 { font-size: 1rem; color: var(--text); margin: 0; }
    .profile-card-meta { display: flex; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); align-items: center; }
    .primary-badge, .active-badge {
        font-size: 0.6rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
        padding: 0.1rem 0.4rem; border-radius: 999px;
    }
    .primary-badge { background: rgba(201, 168, 124, 0.15); color: var(--accent); }
    .active-badge { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
    .profile-card-bio { color: var(--text-dim); font-size: 0.85rem; margin: 0 0 0.75rem 0; }
    .profile-card-actions { display: flex; gap: 0.75rem; }
    .profile-card-actions button {
        background: none; border: 1px solid var(--border); border-radius: 6px;
        padding: 0.35rem 0.8rem; color: var(--text-dim); font-size: 0.8rem; cursor: pointer;
        font-family: var(--font-body); transition: all 0.15s;
    }
    .profile-card-actions button:hover { border-color: var(--accent); color: var(--accent); }
    .profile-card-actions .btn-delete:hover { border-color: #f87171; color: #f87171; }
    .profile-edit-form { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
    .profile-edit-form input, .profile-edit-form textarea, .create-form input, .create-form textarea, .create-form select {
        width: 100%; padding: 0.6rem 0.75rem; background: var(--bg);
        border: 2px solid var(--border); border-radius: 8px; color: var(--text-body, #e4e4e7);
        font-family: var(--font-body); font-size: 0.9rem; outline: none; box-sizing: border-box;
    }
    .profile-edit-form input:focus, .profile-edit-form textarea:focus, .create-form input:focus, .create-form textarea:focus, .create-form select:focus {
        border-color: var(--accent);
    }
    .profile-edit-form select, .create-form select { color: var(--text); }
    .edit-actions { display: flex; gap: 0.5rem; }
    .edit-actions button, .btn-create {
        padding: 0.5rem 1.25rem; border: none; border-radius: 8px; cursor: pointer;
        font-family: var(--font-body); font-size: 0.85rem; font-weight: 600; transition: opacity 0.15s;
    }
    .btn-save { background: var(--accent); color: var(--bg); }
    .btn-cancel { background: rgba(255,255,255,0.05); color: var(--text-dim); border: 1px solid var(--border) !important; }
    .btn-create { background: var(--accent); color: var(--bg); }
    .btn-create:disabled { opacity: 0.4; cursor: not-allowed; }
    .create-card {
        background: var(--surface); border: 1px dashed var(--border); border-radius: 12px;
        padding: 1.5rem;
    }
    .create-card h2 { font-size: 1rem; color: var(--text); margin: 0 0 1rem 0; font-weight: 400; }
    .create-form { display: flex; flex-direction: column; gap: 0.75rem; }
</style>
