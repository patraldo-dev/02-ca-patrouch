<script>
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';

    let open = $state(false);
    let notifications = $state([]);
    let unreadCount = $state(0);
    let loading = $state(false);
    let interval = null;

    // Simple i18n — no get() to avoid SSR crash
    const i18n = {
        en: {
            title: 'Notifications',
            mark_all_read: 'Mark all read',
            no_notifications: 'No new notifications',
            empty: 'All caught up!'
        },
        es: {
            title: 'Notificaciones',
            mark_all_read: 'Marcar todo leído',
            no_notifications: 'Sin notificaciones',
            empty: '¡Todo al día!'
        },
        fr: {
            title: 'Notifications',
            mark_all_read: 'Tout marquer comme lu',
            no_notifications: 'Pas de notifications',
            empty: 'Tout est lu !'
        }
    };

    function getLang() {
        if (!browser) return 'en';
        const html = document.documentElement.lang;
        return i18n[html] ? html : 'en';
    }

    function t(key) {
        return i18n[getLang()]?.[key] || i18n.en[key] || key;
    }

    function timeAgo(dateStr) {
        const now = Date.now();
        const then = new Date(dateStr + 'Z').getTime();
        const diff = Math.floor((now - then) / 1000);
        if (diff < 60) return t('no_notifications'); // just now
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    async function fetchNotifications() {
        if (!browser) return;
        try {
            const res = await fetch('/api/notifications?unread=true');
            if (res.ok) {
                const data = await res.json();
                notifications = data.notifications || [];
                unreadCount = data.unreadCount || 0;
            }
        } catch {}
    }

    async function markRead(id) {
        try {
            await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id] })
            });
            notifications = notifications.filter(n => n.id !== id);
            unreadCount = Math.max(0, unreadCount - 1);
        } catch {}
    }

    async function markAllRead() {
        try {
            await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ all: true })
            });
            notifications = [];
            unreadCount = 0;
        } catch {}
    }

    function toggle() {
        open = !open;
        if (open) fetchNotifications();
    }

    function handleClickOutside(e) {
        if (open && !e.target.closest('.notification-bell')) {
            open = false;
        }
    }

    onMount(() => {
        if (!browser) return;
        fetchNotifications();
        interval = setInterval(fetchNotifications, 60000);
        document.addEventListener('click', handleClickOutside);

        return () => {
            if (interval) clearInterval(interval);
            document.removeEventListener('click', handleClickOutside);
        };
    });
</script>

{#if browser}
<div class="notification-bell">
    <button class="bell-btn" onclick={toggle} aria-label={t('title')}>
        🔔
        {#if unreadCount > 0}
            <span class="badge">{unreadCount}</span>
        {/if}
    </button>

    {#if open}
        <div class="notification-dropdown">
            <div class="dropdown-header">
                <span class="dropdown-title">{t('title')}</span>
                {#if unreadCount > 0}
                    <button class="mark-all-btn" onclick={markAllRead}>{t('mark_all_read')}</button>
                {/if}
            </div>

            <div class="notification-list">
                {#if notifications.length === 0}
                    <div class="empty-state">{t('empty')}</div>
                {:else}
                    {#each notifications as n (n.id)}
                        <button class="notification-item" onclick={() => markRead(n.id)}>
                            <div class="notification-title">{n.title}</div>
                            <div class="notification-body">{(n.body || '').slice(0, 80)}{(n.body || '').length > 80 ? '…' : ''}</div>
                            <div class="notification-time">{timeAgo(n.created_at)}</div>
                        </button>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>
{/if}

<style>
    .notification-bell {
        position: relative;
    }

    .bell-btn {
        position: relative;
        background: none;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.45rem 0.6rem;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s;
        color: var(--text-dim);
    }

    .bell-btn:hover {
        border-color: var(--accent);
        color: var(--accent);
    }

    .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        font-size: 0.6rem;
        font-weight: 700;
        min-width: 16px;
        height: 16px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
    }

    .notification-dropdown {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        width: 320px;
        max-height: 400px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        z-index: 200;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .dropdown-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--border);
    }

    .dropdown-title {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--text);
    }

    .mark-all-btn {
        background: none;
        border: none;
        color: var(--accent);
        font-size: 0.75rem;
        cursor: pointer;
        font-family: var(--font-body);
        transition: opacity 0.2s;
    }

    .mark-all-btn:hover {
        opacity: 0.8;
    }

    .notification-list {
        overflow-y: auto;
        max-height: 340px;
    }

    .empty-state {
        padding: 2rem 1rem;
        text-align: center;
        color: var(--text-dim);
        font-size: 0.85rem;
    }

    .notification-item {
        display: block;
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        border-bottom: 1px solid var(--border);
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: background 0.15s;
        font-family: var(--font-body);
    }

    .notification-item:hover {
        background: var(--glass-hover);
    }

    .notification-item:last-child {
        border-bottom: none;
    }

    .notification-title {
        font-weight: 600;
        font-size: 0.85rem;
        color: var(--text);
        margin-bottom: 0.2rem;
    }

    .notification-body {
        font-size: 0.8rem;
        color: var(--text-dim);
        line-height: 1.4;
        margin-bottom: 0.2rem;
    }

    .notification-time {
        font-size: 0.7rem;
        color: var(--text-muted);
    }
</style>
