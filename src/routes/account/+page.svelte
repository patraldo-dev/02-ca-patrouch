<!-- src/routes/account/+page.svelte -->
<script>
    import { t } from '$lib/i18n';
    import { goto } from '$app/navigation';
    import { tick } from 'svelte';
    import EmojiPicker from '$lib/components/EmojiPicker.svelte';
import { avatarVariant } from '$lib/utils.js';
    import { authClient } from '$lib/auth-client.js';

    let { data } = $props();

    // --- Tab state ---
    let activeTab = $state('profile');

    // --- Toast ---
    let toastMessage = $state('');
    let toastTimeout = $state(null);
    function showToast(msg) {
        toastMessage = msg;
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => { toastMessage = ''; }, 3000);
    }

    // --- Profile tab state ---
    let userDisplayName = $state(data.profile?.display_name || '');
    let userBio = $state(data.profile?.bio || '');
    let avatarUrl = $state(data.profile?.avatar_url || null);
    let avatarDisplayUrl = $derived(avatarVariant(avatarUrl, 'avatar200'));
    let uploadingAvatar = $state(false);
    let generatingAvatar = $state(false);
    let aiPrompt = $state('');
    let avatarInput;
    let savingProfile = $state(false);
    let showCropModal = $state(false);
    let cropImageSrc = $state('');
    let cropImgEl;
    let cropDrag = $state({ active: false, startX: 0, startY: 0, imgX: 0, imgY: 0 });
    let cropPreviewUrl = $state('');
    let pendingBlob = $state(null);
    let showAIPrompt = $state(false);

    // --- Notifications tab state ---
    let notifGame = $state(data.notificationPrefs?.game === 1);
    let notifWriting = $state(data.notificationPrefs?.writing === 1);
    let notifCommunity = $state(data.notificationPrefs?.community === 1);

    // --- Privacy tab state ---
    let privacyPublic = $state(data.profile?.show_profile === 1);
    let privacyScoreboard = $state(data.profile?.show_in_scoreboard === 1);
    let privacyEmail = $state(data.profile?.show_email === 1);
    let optOutEcosystem = $state(data.profile?.opt_out_ecosystem === 1);

    // --- Security tab state ---
    let currentPassword = $state('');
    let newPassword = $state('');
    let confirmPassword = $state('');
    let changingPassword = $state(false);
    let passwordMessage = $state('');
    let passwordError = $state(false);
    let showCurrentPw = $state(false);
    let showNewPw = $state(false);
    let showConfirmPw = $state(false);

    // --- Emoji picker ---

        // --- Member since (formatted on server) ---
    let memberSince = $derived(data.profile?.member_since || '');

    // --- Masked email ---
    let maskedEmail = $derived.by(() => {
        const email = data.user?.email || '';
        if (!email) return '';
        const [local, domain] = email.split('@');
        if (!domain) return email;
        if (local.length <= 2) return local[0] + '***@' + domain;
        return local[0] + '***' + local[local.length - 1] + '@' + domain;
    });

    // --- Emoji ---
    let emojiTarget = $state(null);
    let showEmojiPicker = $state(false);

    function toggleEmoji(target) {
        emojiTarget = target;
        showEmojiPicker = !showEmojiPicker;
    }

    function handleEmojiSelect(emoji) {
        const target = emojiTarget;
        const start = target === 'name'
            ? document.getElementById('displayNameInput').selectionStart
            : document.getElementById('bioInput').selectionStart;
        const value = target === 'name' ? userDisplayName : userBio;
        const newValue = value.substring(0, start) + emoji + value.substring(start);
        if (target === 'name') userDisplayName = newValue;
        else userBio = newValue;
        showEmojiPicker = false;
    }

    // --- Avatar functions ---
    function getUploadError(res, errBody) {
        const msg = errBody?.error || '';
        if (res.status === 400) {
            if (msg.includes('No file')) return $t('profile.user.avatar_err_no_file');
            if (msg.includes('format') || msg.includes('jpg') || msg.includes('png') || msg.includes('webp')) return $t('profile.user.avatar_err_format');
            if (msg.includes('2MB') || msg.includes('size') || msg.includes('large')) return $t('profile.user.avatar_err_size');
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
        const scaleX = img.naturalWidth / img.clientWidth;
        const scaleY = img.naturalHeight / img.clientHeight;
        const offsetX = -cropDrag.imgX;
        const offsetY = -cropDrag.imgY;
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

    async function generateAIAvatar() {
        if (!aiPrompt.trim()) { showAIPrompt = true; return; }
        generatingAvatar = true;
        try {
            const res = await fetch('/api/user/avatar/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt.trim() })
            });
            if (res.ok) {
                const d = await res.json();
                avatarUrl = d.url;
                showAIPrompt = false;
                showToast('✨ Avatar generated');
            } else {
                const err = await res.json();
                showToast(err.error || 'Error generating avatar');
            }
        } catch { showToast('Connection error'); }
        finally { generatingAvatar = false; }
    }

    async function uploadBlob(blob) {
        uploadingAvatar = true;
        try {
            const fd = new FormData();
            fd.append('avatar', blob, 'avatar.webp');
            const res = await fetch('/api/user/avatar', { method: 'POST', body: fd });
            if (res.ok) {
                const d = await res.json();
                avatarUrl = d.url;
            } else {
                let errBody;
                try { errBody = await res.json(); } catch {}
                showToast(getUploadError(res, errBody));
            }
        } catch { showToast($t('profile.user.avatar_err_network')); }
        finally { uploadingAvatar = false; avatarInput.value = ''; }
    }

    async function handleAvatarSelect(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        openCropModal(file);
    }

    // --- Emoji ---


    // --- Crop dragging ---
    function onCropPointerDown(e) {
        cropDrag = { ...cropDrag, active: true, startX: e.clientX - cropDrag.imgX, startY: e.clientY - cropDrag.imgY };
    }
    function onCropPointerMove(e) {
        if (!cropDrag.active) return;
        cropDrag = { ...cropDrag, imgX: e.clientX - cropDrag.startX, imgY: e.clientY - cropDrag.startY };
    }
    function onCropPointerUp() { cropDrag = { ...cropDrag, active: false }; }

    // --- Save profile ---
    async function saveUserProfile() {
        savingProfile = true;
        try {
            const payload = { display_name: userDisplayName, bio: userBio };
            if (avatarUrl !== (data.profile?.avatar_url || null)) payload.avatar_url = avatarUrl;
            const res = await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) showToast($t('profile.user.saved'));
            else { const err = await res.json(); showToast(err.error || 'Error'); }
        } catch { showToast('Network error'); }
        finally { savingProfile = false; }
    }

    // --- Save notifications ---
    async function saveNotifications() {
        try {
            const res = await fetch('/api/account/notification-preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game: notifGame ? 1 : 0, writing: notifWriting ? 1 : 0, community: notifCommunity ? 1 : 0 })
            });
            if (res.ok) showToast($t('account.saved'));
            else { const err = await res.json(); showToast(err.error || 'Error'); }
        } catch { showToast('Network error'); }
    }

    // --- Save privacy ---
    async function savePrivacy() {
        try {
            const res = await fetch('/api/account/privacy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ show_profile: privacyPublic ? 1 : 0, show_in_scoreboard: privacyScoreboard ? 1 : 0, show_email: privacyEmail ? 1 : 0 })
            });
            if (res.ok) showToast($t('account.saved'));
            else { const err = await res.json(); showToast(err.error || 'Error'); }
        } catch { showToast('Network error'); }
    }

    // --- Change password ---
    async function changePassword() {
        if (newPassword !== confirmPassword) {
            passwordMessage = $t('account.security.password_mismatch') || 'Passwords do not match';
            passwordError = true;
            return;
        }
        if (newPassword.length < 8) {
            passwordMessage = $t('account.security.password_too_short') || 'Password must be at least 8 characters';
            passwordError = true;
            return;
        }
        changingPassword = true;
        passwordMessage = '';
        try {
            const res = await authClient.changePassword({
                currentPassword,
                newPassword
            });
            if (res.error) {
                passwordMessage = res.error.message || 'Error';
                passwordError = true;
            } else {
                passwordMessage = $t('account.security.password_changed');
                passwordError = false;
                currentPassword = '';
                newPassword = '';
                confirmPassword = '';
            }
        } catch (e) {
            passwordMessage = e.message || 'Error';
            passwordError = true;
        }
        finally { changingPassword = false; }
    }

    const tabs = [
        { id: 'profile', label: () => $t('account.tab_profile') },
        { id: 'notifications', label: () => $t('account.tab_notifications') },
        { id: 'privacy', label: () => $t('account.tab_privacy') },
        { id: 'security', label: () => $t('account.tab_security') },
    ];
</script>

<svelte:head>
    <title>{$t('account.title')}</title>
</svelte:head>

<div class="account-page">
    <!-- User Header -->
    <div class="account-header">
        <div class="account-avatar">
            {#if avatarUrl}
                <img src={avatarDisplayUrl} alt="Avatar" />
            {:else}
                <span class="avatar-fallback">{(data.profile?.display_name || '?')[0].toUpperCase()}</span>
            {/if}
        </div>
        <div class="account-info">
            <h1 class="account-name">{data.profile?.display_name || 'User'}</h1>
            {#if data.profile?.username}
                <p class="account-username">@{data.profile.username}</p>
            {/if}
            <p class="account-since">{$t('profile.user.member_since')} {memberSince}</p>
            <a href="/stats" class="view-stats-link">{$t('nav.stats')} →</a>
        </div>
    </div>

    <!-- Tab navigation -->
    <nav class="tab-nav">
        {#each tabs as tab}
            <button class="tab-btn" class:active={activeTab === tab.id} onclick={() => activeTab = tab.id}>
                {tab.label()}
            </button>
        {/each}
    </nav>

    {#if toastMessage}
        <div class="toast">{toastMessage}</div>
    {/if}

    <!-- TAB: Profile -->
    {#if activeTab === 'profile'}
    <section class="section-card">
        <div class="form-area">
            <div class="avatar-actions" style="margin-bottom:1.25rem">
                <button class="btn-outline" onclick={() => avatarInput.click()} disabled={uploadingAvatar}>
                    {uploadingAvatar ? '⏳' : '📁'} {uploadingAvatar ? $t('crop.cancel') : $t('profile.user.avatar_label')}
                </button>
                <button class="btn-outline" onclick={generateAIAvatar} disabled={uploadingAvatar || generatingAvatar}>
                    {generatingAvatar ? '⏳' : '✨'} {generatingAvatar ? $t('crop.cancel') : $t('account.ai_avatar_title')}
                </button>
                <input bind:this={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" onchange={handleAvatarSelect} class="hidden-input" />
            </div>
            <div class="form-group">
                <label>{$t('profile.user.display_name')}</label>
                <div class="input-with-btn">
                    <input id="displayNameInput" bind:value={userDisplayName} placeholder={$t('profile.user.display_name_placeholder')} maxlength="50" />
                </div>
            </div>
            <div class="form-group">
                <label>{$t('profile.user.bio')}</label>
                <div class="input-with-btn">
                    <textarea id="bioInput" bind:value={userBio} placeholder={$t('profile.user.bio_placeholder')} maxlength="500" rows="4"></textarea>
                </div>
                <span class="bio-counter">{userBio.length}/500</span>
            </div>
            <button class="btn-primary" onclick={saveUserProfile} disabled={savingProfile}>
                {savingProfile ? '...' : $t('profile.user.save')}
            </button>
        </div>
    </section>
    {/if}

    <!-- TAB: Notifications -->
    {#if activeTab === 'notifications'}
    <section class="section-card">
        {#if data.isBQPlayer}
        <div class="toggle-section">
            <div class="toggle-info">
                <h3>{$t('account.notif_game')}</h3>
                <p>{$t('account.notif_game_desc')}</p>
            </div>
            <button class="toggle-btn" class:active={notifGame} onclick={() => notifGame = !notifGame}>
                <span class="toggle-knob"></span>
            </button>
        </div>
        {/if}
        <div class="toggle-section">
            <div class="toggle-info">
                <h3>{$t('account.notif_writing')}</h3>
                <p>{$t('account.notif_writing_desc')}</p>
            </div>
            <button class="toggle-btn" class:active={notifWriting} onclick={() => notifWriting = !notifWriting}>
                <span class="toggle-knob"></span>
            </button>
        </div>
        <div class="toggle-section">
            <div class="toggle-info">
                <h3>{$t('account.notif_community')}</h3>
                <p>{$t('account.notif_community_desc')}</p>
            </div>
            <button class="toggle-btn" class:active={notifCommunity} onclick={() => notifCommunity = !notifCommunity}>
                <span class="toggle-knob"></span>
            </button>
        </div>
        <button class="btn-primary" onclick={saveNotifications}>{$t('account.saved')}</button>
    </section>
    {/if}

    <!-- TAB: Privacy -->
    {#if activeTab === 'privacy'}
    <section class="section-card">
        <div class="toggle-section">
            <div class="toggle-info">
                <h3>{$t('account.privacy_public')}</h3>
                <p>{$t('account.privacy_public_desc')}</p>
            </div>
            <button class="toggle-btn" class:active={privacyPublic} onclick={() => privacyPublic = !privacyPublic}>
                <span class="toggle-knob"></span>
            </button>
        </div>
        <div class="toggle-section">
            <div class="toggle-info">
                <h3>{$t('account.privacy_scoreboard')}</h3>
                <p>{$t('account.privacy_scoreboard_desc')}</p>
            </div>
            <button class="toggle-btn" class:active={privacyScoreboard} onclick={() => privacyScoreboard = !privacyScoreboard}>
                <span class="toggle-knob"></span>
            </button>
        </div>
        <div class="toggle-section">
            <div class="toggle-info">
                <h3>{$t('account.privacy_email')}</h3>
                <p>{$t('account.privacy_email_desc')}</p>
            </div>
            <button class="toggle-btn" class:active={privacyEmail} onclick={() => privacyEmail = !privacyEmail}>
                <span class="toggle-knob"></span>
            </button>
        </div>
        <div class="toggle-section ecosystem-disclosure">
            <div class="toggle-info">
                <h3>{$t('disclosure.account_privacy')}</h3>
                <p>{$t('disclosure.opt_out')}</p>
            </div>
            <button class="toggle-btn" class:active={optOutEcosystem} onclick={() => optOutEcosystem = !optOutEcosystem}>
                <span class="toggle-knob"></span>
            </button>
        </div>
        <button class="btn-primary" onclick={savePrivacy}>{$t('account.saved')}</button>
    </section>
    {/if}

    <!-- TAB: Security -->
    {#if activeTab === 'security'}
    <section class="section-card">
        <h2 class="section-title">{$t('account.security.change_password')}</h2>
        {#if passwordMessage}
            <div class="message" class:error={passwordError}>{passwordMessage}</div>
        {/if}
        <div class="form-area">
            <div class="form-group">
                <label>{$t('account.security.current_password')}</label>
                <div class="pw-wrapper"><input type={showCurrentPw ? 'text' : 'password'} bind:value={currentPassword} /><button type="button" class="pw-toggle" onclick={() => showCurrentPw = !showCurrentPw} aria-label="Toggle">{#if showCurrentPw}👁️{:else}🔒{/if}</button></div>
            </div>
            <div class="form-group">
                <label>{$t('account.security.new_password')}</label>
                <div class="pw-wrapper"><input type={showNewPw ? 'text' : 'password'} bind:value={newPassword} /><button type="button" class="pw-toggle" onclick={() => showNewPw = !showNewPw} aria-label="Toggle">{#if showNewPw}👁️{:else}🔒{/if}</button><button type="button" class="pw-gen" onclick={() => newPassword = crypto.getRandomValues(new Uint32Array(3)).reduce((s,n) => s + n.toString(36), '').slice(0,16)} title="Generate password">🎲</button></div>
            </div>
            <div class="form-group">
                <label>{$t('account.security.confirm_password')}</label>
                <div class="pw-wrapper"><input type={showConfirmPw ? 'text' : 'password'} bind:value={confirmPassword} /><button type="button" class="pw-toggle" onclick={() => showConfirmPw = !showConfirmPw} aria-label="Toggle">{#if showConfirmPw}👁️{:else}🔒{/if}</button></div>
            </div>
            <button class="btn-primary" onclick={changePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}>
                {changingPassword ? '...' : $t('account.security.change_password')}
            </button>
        </div>
    </section>
    <section class="section-card info-card">
        <div class="info-row">
            <span class="info-label">{$t('account.security.created_at')}</span>
            <span class="info-value">{memberSince}</span>
        </div>
        <div class="info-row">
            <span class="info-label">{$t('account.security.email')}</span>
            <span class="info-value">{maskedEmail}</span>
        </div>
    </section>
    {/if}
</div>

<!-- AI Avatar Modal -->
{#if showAIPrompt}
    <div class="modal-overlay" onclick={() => showAIPrompt = false}></div>
    <div class="modal-content" style="width:360px">
        <h3 style="color:var(--text);margin:0 0 12px;font-size:1.1rem">✨ {$t('account.ai_avatar_title') || 'Generate AI Avatar'}</h3>
        <p style="color:var(--text-dim);font-size:0.85rem;margin:0 0 10px">{$t('account.ai_avatar_desc') || 'Describe your avatar (max 200 chars)'}</p>
        <input bind:value={aiPrompt} placeholder="bearded pirate captain, dark moody style" maxlength="200" class="modal-input" />
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
            <button onclick={() => showAIPrompt = false} class="btn-outline">{$t('profile.cancel')}</button>
            <button onclick={generateAIAvatar} disabled={!aiPrompt.trim() || generatingAvatar} class="btn-primary">
                {generatingAvatar ? '⏳...' : '✨ Generate'}
            </button>
        </div>
    </div>
{/if}

<!-- Emoji Picker -->


{#if showEmojiPicker}
    <EmojiPicker onSelect={handleEmojiSelect} onClose={() => showEmojiPicker = false} />
{/if}

<!-- Crop Modal -->
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
                <button class="btn-primary" onclick={confirmCrop}>{$t('crop.apply')}</button>
            </div>
        {:else}
            <button class="btn-primary" onclick={applyCrop}>{$t('crop.apply')}</button>
        {/if}
        <button class="btn-outline" onclick={cancelCrop}>{$t('crop.cancel')}</button>
    </div>
</div>
{/if}

<style>
    .account-page {
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
    }
    .account-header { display: flex; align-items: center; gap: 1.25rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
    .account-avatar { width: 72px; height: 72px; border-radius: 50%; overflow: hidden; border: 2px solid var(--accent); flex-shrink: 0; }
    .account-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .account-avatar .avatar-fallback { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: var(--surface); font-size: 1.5rem; font-weight: 700; color: var(--accent); }
    .account-info { flex: 1; min-width: 0; }
    .account-name { font-family: var(--font-heading); font-size: 1.5rem; margin: 0 0 0.15rem; color: var(--text); }
    .account-username { font-size: 0.85rem; color: var(--accent); margin: 0 0 0.25rem; }
    .account-since { font-size: 0.8rem; color: var(--muted, #a1a1aa); margin: 0; }
    .view-stats-link { font-size: 0.8rem; color: var(--accent); text-decoration: none; margin-top: 0.4rem; display: inline-block; }
    .view-stats-link:hover { color: var(--accent-hover); text-decoration: underline; }
    .account-page h1 {
        font-family: var(--font-heading);
        font-size: 2rem;
        font-weight: 300;
        color: var(--text);
        margin-bottom: 1.5rem;
    }

    /* Tab navigation */
    .tab-nav {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 2rem;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        padding-bottom: 2px;
    }
    .tab-nav::-webkit-scrollbar { display: none; }
    .tab-btn {
        padding: 0.5rem 1.25rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 999px;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
    }
    .tab-btn:hover { border-color: var(--accent); color: var(--text); }
    .tab-btn.active { background: rgba(201, 168, 124, 0.15); border-color: var(--accent); color: var(--accent); }

    /* Cards */
    .section-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
    }
    .section-title {
        font-family: var(--font-heading);
        font-size: 1.1rem;
        font-weight: 400;
        color: var(--text);
        margin: 0 0 1rem;
    }

    /* Avatar */
    .avatar-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border);
    }
    .avatar-large {
        width: 80px; height: 80px; border-radius: 50%; background: var(--accent);
        color: var(--bg); display: flex; align-items: center; justify-content: center;
        font-size: 2rem; font-weight: 700; overflow: hidden;
    }
    .avatar-img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; }
    .avatar-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
    .avatar-actions { display: flex; gap: 0.5rem; }

    /* Form */
    .form-area { display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label {
        font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.06em; color: var(--text-muted);
    }
    .form-group input, .form-group textarea {
        width: 100%; padding: 0.6rem 0.75rem; background: var(--bg);
        border: 2px solid var(--border); border-radius: 8px; color: var(--text);
        font-family: var(--font-body); font-size: 0.9rem; outline: none; box-sizing: border-box;
    }
    .pw-wrapper { position: relative; }
    .pw-wrapper input { padding-right: 80px; }
    .pw-toggle, .pw-gen {
        position: absolute; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 14px; padding: 4px 6px;
    }
    .pw-toggle { right: 36px; }
    .pw-gen { right: 6px; }
    .pw-toggle:hover, .pw-gen:hover { opacity: 0.7; }
    .form-group input:focus, .form-group textarea:focus { border-color: var(--accent); }
    .input-with-btn { display: flex; gap: 0; }
    .input-with-btn input, .input-with-btn textarea { flex: 1; }
    .bio-counter { font-size: 0.75rem; color: var(--text-muted); text-align: right; }
    .member-since { font-size: 0.8rem; color: var(--text-dim); text-align: center; }

    /* Buttons */
    .btn-primary {
        padding: 0.6rem 2rem; background: var(--accent); color: var(--bg); border: none;
        border-radius: 8px; font-family: var(--font-body); font-size: 0.9rem; font-weight: 600;
        cursor: pointer; transition: opacity 0.15s; align-self: flex-start;
    }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-outline {
        background: none; border: 1px solid var(--border); border-radius: 8px;
        padding: 0.5rem 1rem; color: var(--text-dim); font-size: 0.85rem;
        cursor: pointer; font-family: var(--font-body); transition: all 0.15s;
    }
    .btn-outline:hover { border-color: var(--accent); color: var(--accent); }

    /* Toggle sections */
    .toggle-section {
        display: flex; align-items: center; justify-content: space-between; gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border);
    }
    .toggle-section:last-of-type { border-bottom: none; margin-bottom: 1rem; }
    .toggle-info h3 { font-size: 0.95rem; color: var(--text); margin: 0 0 0.25rem; font-weight: 500; }
    .toggle-info p { font-size: 0.8rem; color: var(--text-muted); margin: 0; }
    .ecosystem-disclosure { border-bottom: none !important; padding-top: 1rem; margin-top: 0.5rem; }
    .ecosystem-disclosure .toggle-info h3 { font-size: 0.85rem; font-style: italic; line-height: 1.5; }

    /* Toggle switch */
    .toggle-btn {
        width: 44px; height: 24px; background: var(--glass-hover);
        border: 1px solid var(--border); border-radius: 12px;
        position: relative; cursor: pointer; transition: all 0.2s; flex-shrink: 0;
    }
    .toggle-btn.active { background: var(--accent); border-color: var(--accent); }
    .toggle-knob {
        position: absolute; top: 2px; left: 2px;
        width: 18px; height: 18px; background: white;
        border-radius: 50%; transition: transform 0.2s;
    }
    .toggle-btn.active .toggle-knob { transform: translateX(20px); }

    /* Info card */
    .info-card { padding: 1.25rem; }
    .info-row { display: flex; justify-content: space-between; padding: 0.5rem 0; }
    .info-row + .info-row { border-top: 1px solid var(--border); }
    .info-label { font-size: 0.85rem; color: var(--text-muted); }
    .info-value { font-size: 0.85rem; color: var(--text); }

    /* Message */
    .message {
        padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem;
        background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); color: #4ade80;
    }
    .message.error {
        background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.3); color: #f87171;
    }

    /* Toast */
    .toast {
        position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
        background: var(--accent); color: var(--bg); padding: 0.75rem 1.5rem;
        border-radius: 999px; font-size: 0.9rem; font-weight: 600;
        z-index: 9999; box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }

    /* Emoji */
    .emoji-btn {
        background: none; border: 1px solid var(--border); border-radius: 4px;
        cursor: pointer; font-size: 1rem; padding: 2px 6px; flex-shrink: 0;
    }
    .emoji-btn:hover { border-color: var(--accent); }
    .emoji-picker {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999;
        background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
        padding: 12px; width: 320px; max-height: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    }
    .emoji-tabs { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
    .emoji-tab { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 0.9rem; }
    .emoji-tab.active { border-color: var(--accent); }
    .emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; max-height: 300px; overflow-y: auto; }
    .emoji-item { background: none; border: none; font-size: 1.3rem; padding: 4px; cursor: pointer; border-radius: 4px; }
    .emoji-item:hover { background: var(--bg); }

    /* Modals */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9998; }
    .modal-content {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999;
        background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
        padding: 1.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    }
    .modal-input {
        width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
        background: var(--bg); color: var(--text); font-size: 0.95rem; box-sizing: border-box;
        font-family: var(--font-body);
    }
    .modal-input:focus { outline: none; border-color: var(--accent); }

    /* Crop */
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
        position: absolute; width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
    }
    .crop-viewport img {
        min-width: 100%; min-height: 100%; width: auto; height: auto;
        max-width: none; max-height: none; object-fit: cover; pointer-events: none; user-select: none;
    }
    .crop-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--accent); pointer-events: none; }
    .crop-preview-row { display: flex; align-items: center; gap: 1rem; }
    .crop-preview-circle { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent); }

    .hidden-input { display: none; }

    /* Responsive */
    @media (max-width: 480px) {
        .account-page { padding: 1.5rem 1rem 3rem; }
        .account-page h1 { font-size: 1.5rem; }
        .section-card { padding: 1rem; }
        .toggle-section { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
        .toggle-btn { align-self: flex-end; }
    }
</style>
