<!-- src/routes/profile/+page.svelte -->
<script>
    import { t } from '$lib/i18n';
    import { get } from 'svelte/store';
    import { goto } from '$app/navigation';
    import { avatarVariant } from '$lib/utils.js';
    import WritingHeatmap from '$lib/components/WritingHeatmap.svelte';
    import WordMilestones from '$lib/components/WordMilestones.svelte';
    import BadgeTrophyCase from '$lib/components/BadgeTrophyCase.svelte';
    import WriterOfTheWeek from '$lib/components/WriterOfTheWeek.svelte';

    let { data } = $props();

    let isAdmin = $derived(data.user?.role === 'admin');
    let activeTab = $state('user-profile');
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
    let showProfile = $state(data.showProfile ?? 1);
    let bootyOptIn = $state(data.bootyOptIn ?? 0);

    // User profile form state
    let userDisplayName = $state(data.profile?.display_name || '');
    let userBio = $state(data.profile?.bio || '');
    let avatarUrl = $state(data.profile?.avatar_url || null);
    let avatarDisplayUrl = $derived(avatarVariant(avatarUrl, 'avatar200'));
    let uploadingAvatar = $state(false);
    let avatarInput;
    let savingProfile = $state(false);
    let showCropModal = $state(false);
    let cropImageSrc = $state('');
    let cropImgEl;
    let cropDrag = $state({ active: false, startX: 0, startY: 0, imgX: 0, imgY: 0 });
    let cropPreviewUrl = $state('');
    let pendingBlob = $state(null);
    let toastMessage = $state('');
    let toastTimeout = $state(null);

    function showToast(msg) {
        toastMessage = msg;
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => { toastMessage = ''; }, 3000);
    }

    function getUploadError(res, errBody) {
        const msg = errBody?.error || '';
        if (res.status === 400) {
            if (msg.includes('No file')) return $t('profile.user.avatar_err_no_file');
            if (msg.includes('Only') || msg.includes('jpg') || msg.includes('png') || msg.includes('webp') || msg.includes('format')) return $t('profile.user.avatar_err_format');
            if (msg.includes('2MB') || msg.includes('under 2') || msg.includes('too large') || msg.includes('size')) return $t('profile.user.avatar_err_size');
            if (msg.includes('moderation') || msg.includes('content') || msg.includes('rejected')) return $t('profile.user.avatar_err_moderation');
        }
        if (res.status === 503) return $t('profile.user.avatar_err_unavailable');
        return $t('profile.user.avatar_err_generic');
    }

    function openCropModal(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            cropImageSrc = e.target.result;
            cropDrag = { active: false, startX: 0, startY: 0, imgX: 0, imgY: 0 };
            cropPreviewUrl = '';
            pendingBlob = null;
            showCropModal = true;
        };
        reader.readAsDataURL(file);
    }

    async function applyCrop() {
        const img = cropImgEl;
        if (!img) return;
        const size = 400;
        const containerSize = 280;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // The crop area is 280x280. The image is translated by (imgX, imgY).
        // We need to find what part of the original image falls inside the crop circle.
        const scaleX = img.naturalWidth / img.clientWidth;
        const scaleY = img.naturalHeight / img.clientHeight;

        // Offset of the image relative to the crop viewport center
        const offsetX = -cropDrag.imgX;
        const offsetY = -cropDrag.imgY;

        // Source coordinates in the original image
        const sx = (img.clientWidth / 2 + offsetX - containerSize / 2) * scaleX;
        const sy = (img.clientHeight / 2 + offsetY - containerSize / 2) * scaleY;
        const sSize = containerSize * scaleX;

        ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, size, size);
        const blob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.85));
        pendingBlob = blob;
        cropPreviewUrl = URL.createObjectURL(blob);
    }

    async function confirmCrop() {
        if (!pendingBlob) return;
        showCropModal = false;
        await uploadBlob(pendingBlob);
        if (cropPreviewUrl) URL.revokeObjectURL(cropPreviewUrl);
        cropPreviewUrl = '';
        pendingBlob = null;
    }

    function cancelCrop() {
        showCropModal = false;
        if (cropPreviewUrl) URL.revokeObjectURL(cropPreviewUrl);
        cropImageSrc = '';
        cropPreviewUrl = '';
        pendingBlob = null;
    }

    async function uploadBlob(blob) {
        uploadingAvatar = true;
        try {
            const fd = new FormData();
            fd.append('avatar', blob, 'avatar.webp');
            const res = await fetch('/api/user/avatar', { method: 'POST', body: fd });
            if (res.ok) {
                const data = await res.json();
                avatarUrl = data.url;
            } else {
                let errBody;
                try { errBody = await res.json(); } catch {}
                flash(getUploadError(res, errBody), true);
            }
        } catch { flash($t('profile.user.avatar_err_network'), true); }
        finally { uploadingAvatar = false; avatarInput.value = ''; }
    }

    async function handleAvatarSelect(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        openCropModal(file);
    }

    function onCropPointerDown(e) {
        cropDrag = { ...cropDrag, active: true, startX: e.clientX - cropDrag.imgX, startY: e.clientY - cropDrag.imgY };
    }
    function onCropPointerMove(e) {
        if (!cropDrag.active) return;
        cropDrag = { ...cropDrag, imgX: e.clientX - cropDrag.startX, imgY: e.clientY - cropDrag.startY };
    }
    function onCropPointerUp() {
        cropDrag = { ...cropDrag, active: false };
    }

    async function saveUserProfile() {
        savingProfile = true;
        try {
            const payload = { display_name: userDisplayName, bio: userBio };
            if (avatarUrl !== (data.profile?.avatar_url || null)) payload.avatar_url = avatarUrl;
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast($t('profile.user.saved'));
            } else {
                const err = await res.json();
                flash(err.error || 'Error', true);
            }
        } catch { flash('Network error', true); }
        finally { savingProfile = false; }
    }

    let memberSince = $derived.by(() => {
        const d = data.profile?.created_at;
        if (!d) return '';
        return new Date(d.replace ? d.replace(' ', 'T') : d).toLocaleDateString($t('profile.date_locale', 'en-US'), { year: 'numeric', month: 'long', day: 'numeric' });
    });

    async function toggleProfileVisibility() {
        const newVal = showProfile ? 0 : 1;
        const res = await fetch('/api/profile/visibility', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ show_profile: newVal })
        });
        if (res.ok) showProfile = newVal;
    }

    async function toggleBootyKeywords() {
        const newVal = bootyOptIn ? 0 : 1;
        const res = await fetch('/api/booty-keywords', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ opt_in: !!newVal })
        });
        if (res.ok) bootyOptIn = newVal;
    }

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
        if (!confirm(translate('profile.delete_profile_confirm').replace('{name}', name))) return;
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

    <div class="tab-bar">
        <button class="tab-btn" class:active={activeTab === 'user-profile'} onclick={() => activeTab = 'user-profile'}>{$t('profile.user.tab')}</button>
        {#if isAdmin}
        <button class="tab-btn" class:active={activeTab === 'profile'} onclick={() => activeTab = 'profile'}>{$t('profile.tab_profile')}</button>
        <button class="tab-btn" class:active={activeTab === 'stats'} onclick={() => activeTab = 'stats'}>{$t('profile.tab_stats')}</button>
        {/if}
    </div>

    {#if toastMessage}
        <div class="toast">{toastMessage}</div>
    {/if}

    {#if activeTab === 'user-profile'}
    <section class="user-profile-section">
        <div class="user-profile-avatar-large">
            {#if avatarUrl}
                <img src={avatarDisplayUrl} alt="Avatar" class="avatar-img" />
            {:else}
                {(userDisplayName || data.user?.username || '?')[0].toUpperCase()}
            {/if}
        </div>
        <div class="avatar-row">
            <p class="user-profile-avatar-label">{$t('profile.user.avatar_label')}</p>
        </div>
        <div class="avatar-row">
            <button class="btn-upload-avatar" onclick={() => avatarInput.click()} disabled={uploadingAvatar}>
                {uploadingAvatar ? '⏳' : '📷'} {uploadingAvatar ? 'Uploading...' : 'Upload'}
            </button>
            <input bind:this={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" onchange={handleAvatarSelect} class="hidden-input" />
        </div>
        <div class="user-profile-form">
            <div class="form-group">
                <label>{$t('profile.user.display_name')}</label>
                <input bind:value={userDisplayName} placeholder={$t('profile.user.display_name_placeholder')} maxlength="50" />
            </div>
            <div class="form-group">
                <label>{$t('profile.user.bio')}</label>
                <textarea bind:value={userBio} placeholder={$t('profile.user.bio_placeholder')} maxlength="500" rows="4"></textarea>
                <span class="bio-counter">{userBio.length}/500</span>
            </div>
            <div class="member-since">{$t('profile.user.member_since')} {memberSince}</div>
            <button class="btn-save-user" onclick={saveUserProfile} disabled={savingProfile}>{savingProfile ? '...' : $t('profile.user.save')}</button>
        </div>
    </section>
    {/if}

    {#if activeTab === 'profile'}
    <section class="privacy-section">
        <h2>{$t('profile.privacy_title', 'Privacy')}</h2>
        <label class="toggle-row">
            <span>{$t("profile.public_label")}</span>
            <button class="toggle-btn" class:active={showProfile} onclick={toggleProfileVisibility}>
                <span class="toggle-knob"></span>
            </button>
        </label>
        <p class="privacy-hint">{$t('profile.privacy_hint')}</p>

        <label class="toggle-row" style="margin-top: 1rem;">
            <span>🏴‍☠️ Bottle Booty Keywords</span>
            <button class="toggle-btn" class:active={bootyOptIn} onclick={toggleBootyKeywords}>
                <span class="toggle-knob"></span>
            </button>
        </label>
        <p class="privacy-hint">{$t('profile.booty_hint')}</p>
    </section>

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
                        <input bind:value={editName} placeholder={$t("profile.display_name_placeholder")} />
                        <select bind:value={editLocale}>
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                        </select>
                        <textarea bind:value={editBio} placeholder={$t("profile.bio_placeholder")} rows="2"></textarea>
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

    <!-- Top 10 Writings -->
    {#if data.writings?.length > 0}
        <div class="writings-section">
            <h2>{$t('profile.recent_writings')}</h2>
            <div class="writings-list">
                {#each data.writings as w}
                    <a href="/writings/{w.id}" class="writing-item">
                        <div class="writing-item-info">
                            <span class="writing-item-title">{w.title}</span>
                            <span class="writing-item-meta">
                                {w.locale?.toUpperCase()} · {w.word_count} $t('write.dashboard.words_word', 'words') · {new Date(w.created_at.replace(' ', 'T')).toLocaleDateString($t('profile.date_locale', 'en-US'), { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                    </a>
                {/each}
            </div>
        </div>
    {/if}
    {/if}

    {#if isAdmin && activeTab === 'stats'}
    <div class="stats-tab">
        {#if data.stats}
            <WritingHeatmap heatmapData={data.heatmapData || {}} />
            <BadgeTrophyCase badges={data.userBadges || []} />
            {#if data.writerOfTheWeek}
                <WriterOfTheWeek writer={data.writerOfTheWeek} />
            {/if}
            <WordMilestones stats={data.stats} />
        {:else}
            <p class="stats-empty">{$t('profile.stats_empty')}</p>
        {/if}
    </div>
    {/if}
</div>

{#if showCropModal}
<div class="crop-overlay" onpointerup={onCropPointerUp} onpointerleave={onCropPointerUp}>
    <div class="crop-modal">
        <h2 class="crop-title">{$t('crop.title')}</h2>
        <p class="crop-hint">{$t('crop.drag_hint')}</p>
        <div class="crop-area" onpointerdown={onCropPointerDown} onpointermove={onCropPointerMove}>
            <div class="crop-viewport">
                {#if cropImageSrc}
                    <!-- svelte-ignore a11y_img_alt_missing -->
                    <img bind:this={cropImgEl} src={cropImageSrc} draggable="false" style="transform: translate({cropDrag.imgX}px, {cropDrag.imgY}px);" />
                {/if}
            </div>
            <div class="crop-ring"></div>
        </div>
        {#if cropPreviewUrl}
            <div class="crop-preview-row">
                <img src={cropPreviewUrl} alt="Preview" class="crop-preview-circle" />
                <button class="crop-confirm" onclick={confirmCrop}>{$t('crop.apply')}</button>
            </div>
        {:else}
            <button class="crop-apply-btn" onclick={applyCrop}>{$t('crop.apply')}</button>
        {/if}
        <button class="crop-cancel-btn" onclick={cancelCrop}>{$t('crop.cancel')}</button>
    </div>
</div>
{/if}

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
        border: 2px solid var(--border); border-radius: 8px; color: var(--text);
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
    .btn-cancel { background: var(--glass-bg); color: var(--text-dim); border: 1px solid var(--border) !important; }
    .btn-create { background: var(--accent); color: var(--bg); }
    .btn-create:disabled { opacity: 0.4; cursor: not-allowed; }
    .create-card {
        background: var(--surface); border: 1px dashed var(--border); border-radius: 12px;
        padding: 1.5rem;
    }
    .create-card h2 { font-size: 1rem; color: var(--text); margin: 0 0 1rem 0; font-weight: 400; }
    .create-form { display: flex; flex-direction: column; gap: 0.75rem; }
    .writings-section { margin-top: 2rem; }
    .writings-section h2 { font-size: 1.1rem; color: var(--text); font-weight: 400; margin-bottom: 1rem; }
    .writings-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .writing-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 0.75rem 1rem; background: var(--surface); border: 1px solid var(--border);
        border-radius: 8px; text-decoration: none; color: inherit; transition: border-color 0.15s;
    }
    .writing-item:hover { border-color: var(--accent); }
    .writing-item-info { display: flex; flex-direction: column; gap: 0.2rem; }
    .writing-item-title { font-size: 0.9rem; color: var(--text); }
    .writing-item-meta { font-size: 0.75rem; color: var(--text-muted); }
    .privacy-section {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.25rem;
        margin-bottom: 2rem;
    }
    .privacy-section h2 {
        font-family: var(--font-heading);
        font-size: 1.1rem;
        font-weight: 400;
        color: var(--text);
        margin-bottom: 0.75rem;
    }
    .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--text);
        font-size: 0.9rem;
    }
    .toggle-btn {
        width: 44px; height: 24px;
        background: var(--glass-hover);
        border: 1px solid var(--border);
        border-radius: 12px;
        position: relative;
        cursor: pointer;
        transition: all 0.2s;
    }
    .toggle-btn.active {
        background: var(--accent);
        border-color: var(--accent);
    }
    .toggle-knob {
        position: absolute;
        top: 2px; left: 2px;
        width: 18px; height: 18px;
        background: white;
        border-radius: 50%;
        transition: transform 0.2s;
    }
    .toggle-btn.active .toggle-knob {
        transform: translateX(20px);
    }
    .privacy-hint {
        color: var(--text-muted);
        font-size: 0.8rem;
        margin-top: 0.5rem;
    }
    .tab-bar {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }
    .tab-btn {
        padding: 0.5rem 1.25rem;
        background: var(--glass-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .tab-btn:hover { border-color: var(--accent); color: var(--text); }
    .tab-btn.active { background: rgba(201, 168, 124, 0.1); border-color: var(--accent); color: var(--accent); }
    .toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: var(--accent);
        color: var(--bg);
        padding: 0.75rem 1.5rem;
        border-radius: 999px;
        font-size: 0.9rem;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    .user-profile-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 2rem 1.5rem;
        margin-bottom: 2rem;
    }
    .user-profile-avatar-large {
        width: 80px; height: 80px; border-radius: 50%; background: var(--accent);
        color: var(--bg); display: flex; align-items: center; justify-content: center;
        font-size: 2rem; font-weight: 700;
    }
    .user-profile-avatar-label {
        font-size: 0.75rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    .user-profile-form {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
    }
    .user-profile-form .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }
    .user-profile-form label {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
    }
    .user-profile-form input, .user-profile-form textarea {
        width: 100%; padding: 0.6rem 0.75rem; background: var(--bg);
        border: 2px solid var(--border); border-radius: 8px; color: var(--text);
        font-family: var(--font-body); font-size: 0.9rem; outline: none; box-sizing: border-box;
    }
    .user-profile-form input:focus, .user-profile-form textarea:focus {
        border-color: var(--accent);
    }
    .bio-counter {
        font-size: 0.75rem;
        color: var(--text-muted);
        text-align: right;
    }
    .member-since {
        font-size: 0.8rem;
        color: var(--text-dim);
        text-align: center;
    }
    .btn-save-user {
        padding: 0.6rem 2rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: 8px;
        font-family: var(--font-body);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s;
    }
    .btn-save-user:hover { opacity: 0.9; }
    .btn-save-user:disabled { opacity: 0.4; cursor: not-allowed; }
    .hidden-input { display: none; }
    .avatar-row { display: flex; align-items: center; gap: 0.5rem; }
    .btn-upload-avatar {
        background: none; border: 1px solid var(--border); border-radius: 6px;
        padding: 0.25rem 0.6rem; color: var(--text-dim); font-size: 0.75rem;
        cursor: pointer; font-family: var(--font-body); transition: all 0.15s;
    }
    .btn-upload-avatar:hover { border-color: var(--accent); color: var(--accent); }
    .btn-upload-avatar:disabled { opacity: 0.4; cursor: not-allowed; }
    .avatar-img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; }
    .stats-tab { display: flex; flex-direction: column; gap: 1.5rem; }
    .stats-empty { color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 2rem; }
    .crop-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
    }
    .crop-modal {
        background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
        padding: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
        max-width: 360px; width: 90vw;
    }
    .crop-title { font-size: 1.1rem; color: var(--text); margin: 0; font-weight: 400; }
    .crop-hint { font-size: 0.8rem; color: var(--text-muted); margin: 0; }
    .crop-area {
        width: 280px; height: 280px; border-radius: 50%; overflow: hidden;
        position: relative; cursor: grab; touch-action: none; background: var(--bg);
    }
    .crop-area:active { cursor: grabbing; }
    .crop-viewport {
        position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
        will-change: transform;
    }
    .crop-viewport img {
        min-width: 100%; min-height: 100%; width: auto; height: auto; max-width: none; max-height: none; object-fit: cover; pointer-events: none; user-select: none;
    }
    .crop-ring {
        position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--accent); pointer-events: none;
    }
    .crop-apply-btn, .crop-confirm {
        padding: 0.5rem 2rem; background: var(--accent); color: var(--bg); border: none;
        border-radius: 8px; font-family: var(--font-body); font-size: 0.9rem; font-weight: 600;
        cursor: pointer; transition: opacity 0.15s;
    }
    .crop-apply-btn:hover, .crop-confirm:hover { opacity: 0.9; }
    .crop-cancel-btn {
        padding: 0.4rem 1.5rem; background: none; border: 1px solid var(--border); border-radius: 8px;
        color: var(--text-dim); font-family: var(--font-body); font-size: 0.85rem; cursor: pointer;
        transition: all 0.15s;
    }
    .crop-cancel-btn:hover { border-color: var(--text-muted); color: var(--text); }
    .crop-preview-row { display: flex; align-items: center; gap: 1rem; }
    .crop-preview-circle { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent); }
</style>
