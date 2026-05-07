<!-- src/lib/components/NewsletterForm.svelte -->
<script>
    import { t, getLocale } from '$lib/i18n';
    import { page } from '$app/stores';

    let email = $state('');
    let friendEmails = $state('');
    let isSubmitting = $state(false);
    let message = $state('');
    let isSuccess = $state(false);
    let needsConfirmation = $state(false);
    let showFriendInput = $state(false);
    let subscribedEmails = $state([]);

    let isLoggedIn = $derived(!!$page.data?.user);
    let userEmail = $derived($page.data?.user?.email || '');
    let isSubscribed = $state($page.data?.newsletterSubscribed || false);

    async function subscribeEmail(addr) {
        const response = await fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: addr, type: 'daily-prompt', locale: getLocale() || 'en' })
        });
        return { ok: response.ok, result: await response.json() };
    }

    async function handleSubscribeUser() {
        if (!userEmail) return;
        isSubmitting = true;
        message = '';
        const { ok, result } = await subscribeEmail(userEmail);
        if (ok) {
            subscribedEmails = [...subscribedEmails, userEmail];
            isSubscribed = true;
            needsConfirmation = true;
            message = result.message || $t('common.newsletter.success_message');
            isSuccess = true;
        } else {
            // Already subscribed from server — update local state
            if (result.error === 'Already subscribed') {
                isSubscribed = true;
            }
            message = result.error || $t('common.newsletter.error_message');
            isSuccess = false;
        }
        isSubmitting = false;
    }

    async function handleSubscribeFriend(e) {
        e.preventDefault();
        const raw = friendEmails.trim();
        if (!raw) return;

        const addrs = raw.split(/[\s,;]+/).filter(a => a.includes('@'));
        if (addrs.length === 0) {
            message = $t('common.newsletter.error_email_empty');
            isSuccess = false;
            return;
        }

        isSubmitting = true;
        message = '';
        let successes = 0;
        const errors = [];

        for (const addr of addrs) {
            const { ok, result } = await subscribeEmail(addr);
            if (ok) {
                successes++;
                subscribedEmails = [...subscribedEmails, addr];
            } else {
                errors.push(result.error);
            }
        }

        if (successes > 0) {
            needsConfirmation = true;
            isSuccess = true;
            message = `${successes} invitation(s) sent.`;
        }
        if (errors.length > 0) {
            message += (message ? ' ' : '') + errors.join('. ');
        }

        friendEmails = '';
        isSubmitting = false;
    }

    async function handleSubmitGuest(e) {
        e.preventDefault();
        if (!email) {
            message = $t('common.newsletter.error_email_empty');
            return;
        }
        isSubmitting = true;
        message = '';
        const { ok, result } = await subscribeEmail(email);
        if (ok) {
            isSuccess = true;
            needsConfirmation = true;
            message = result.message || $t('common.newsletter.success_message');
            email = '';
        } else {
            isSuccess = false;
            message = result.error || $t('common.newsletter.error_message');
        }
        isSubmitting = false;
    }
</script>

<div class="newsletter-form">
    <h3>{$t('common.newsletter.title')}</h3>
    <p>{isLoggedIn ? $t('common.newsletter.logged_in_description') : $t('common.newsletter.guest_description')}</p>

    {#if message}
        <div class="message" class:success={isSuccess} class:error={!isSuccess}>
            {message}
            {#if needsConfirmation}
                <p class="confirmation-note">{$t('common.newsletter.confirmation_note')}</p>
            {/if}
        </div>
    {/if}

    {#if isLoggedIn}
        <div class="logged-in-flow">
            {#if !isSubscribed}
                <button class="subscribe-btn" onclick={handleSubscribeUser} disabled={isSubmitting}>
                    {#if isSubmitting}
                        {$t('common.newsletter.subscribing_button')}
                    {:else}
                        {$t('common.newsletter.subscribe_with')} {userEmail}
                    {/if}
                </button>
            {:else}
                <div class="subscribed-badge">{$t('common.newsletter.subscribed_as')} {userEmail}</div>
            {/if}

            {#if !showFriendInput}
                <button class="invite-btn" onclick={() => showFriendInput = true}>
                    {$t('common.newsletter.invite_friend')}
                </button>
            {:else}
                <form onsubmit={handleSubscribeFriend} class="friend-form">
                    <input
                        type="text"
                        bind:value={friendEmails}
                        placeholder={$t('common.newsletter.friend_placeholder')}
                        disabled={isSubmitting}
                    />
                    <button type="submit" disabled={isSubmitting || !friendEmails.trim()}>
                        {isSubmitting ? '…' : $t('common.newsletter.send_invitations')}
                    </button>
                </form>
            {/if}
        </div>
    {:else}
        <form onsubmit={handleSubmitGuest}>
            <div class="input-group">
                <input
                    type="email"
                    bind:value={email}
                    placeholder={$t('common.newsletter.email_placeholder')}
                    required
                    disabled={isSubmitting}
                />
                <button type="submit" disabled={isSubmitting}>
                    {#if isSubmitting}
                        {$t('common.newsletter.subscribing_button')}
                    {:else}
                        {$t('common.newsletter.subscribe_button')}
                    {/if}
                </button>
            </div>
        </form>
    {/if}
</div>

<style>
    .newsletter-form {
        max-width: 500px;
        margin: 0 auto;
        text-align: center;
    }

    .newsletter-form h3 {
        font-family: var(--font-heading);
        font-weight: 300;
        font-size: 1.35rem;
        margin-bottom: 0.5rem;
        color: var(--text);
    }

    .newsletter-form p {
        margin-bottom: 1.5rem;
        color: var(--text-muted);
        font-size: 0.95rem;
    }

    .logged-in-flow {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
    }

    .subscribe-btn {
        padding: 0.75rem 1.5rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: var(--radius);
        font-family: var(--font-body);
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }

    .subscribe-btn:hover { background: var(--accent-hover); }
    .subscribe-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .subscribed-badge {
        padding: 0.6rem 1.2rem;
        background: rgba(34, 197, 94, 0.1);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.2);
        border-radius: var(--radius);
        font-size: 0.9rem;
    }

    .invite-btn {
        background: none;
        border: 1px solid var(--border);
        color: var(--text-dim);
        padding: 0.5rem 1rem;
        border-radius: var(--radius);
        cursor: pointer;
        font-family: var(--font-body);
        font-size: 0.85rem;
        transition: all 0.2s;
    }

    .invite-btn:hover {
        border-color: var(--accent);
        color: var(--accent);
    }

    .friend-form {
        display: flex;
        gap: 0.5rem;
        width: 100%;
    }

    .friend-form input {
        flex: 1;
        padding: 0.6rem 0.8rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.9rem;
    }

    .friend-form input:focus { outline: none; border-color: var(--accent); }

    .friend-form button {
        padding: 0.6rem 1rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: var(--radius);
        font-family: var(--font-body);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
    }

    .friend-form button:disabled { opacity: 0.5; cursor: not-allowed; }

    .input-group {
        display: flex;
        gap: 0.5rem;
    }

    .input-group input {
        flex: 1;
        padding: 0.75rem 1rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.95rem;
        transition: border-color 0.2s;
    }

    .input-group input:focus { outline: none; border-color: var(--accent); }
    .input-group input::placeholder { color: var(--text-muted); }

    .input-group button {
        padding: 0.75rem 1.5rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: var(--radius);
        font-family: var(--font-body);
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
        white-space: nowrap;
    }

    .input-group button:hover { background: var(--accent-hover); }
    .input-group button:disabled { opacity: 0.5; cursor: not-allowed; }

    .message {
        padding: 0.75rem 1rem;
        margin-bottom: 1rem;
        border-radius: var(--radius);
        text-align: center;
        font-size: 0.9rem;
    }

    .message.success {
        background: rgba(34, 197, 94, 0.1);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.2);
    }

    .message.error {
        background: rgba(239, 68, 68, 0.1);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .confirmation-note {
        margin-top: 0.5rem;
        font-style: italic;
        font-size: 0.85rem;
        opacity: 0.8;
    }

    @media (max-width: 480px) {
        .input-group, .friend-form { flex-direction: column; }
    }
</style>
