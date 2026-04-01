// src/lib/analytics.js
// Self-hosted, privacy-friendly analytics — no cookies, no third parties

const QUEUE_KEY = 'analytics_queue';
const FLUSH_INTERVAL = 10000; // 10 seconds
const MAX_QUEUE_SIZE = 20;
let flushTimer = null;

function getQueue() {
    try {
        const data = localStorage.getItem(QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

function saveQueue(queue) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
}

function flush() {
    if (flushTimer) return;
    flushTimer = setTimeout(async () => {
        flushTimer = null;
        const queue = getQueue();
        if (queue.length === 0) return;
        saveQueue([]);
        for (const event of queue) {
            try {
                await fetch('/api/analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(event),
                    keepalive: true
                });
            } catch {}
        }
    }, FLUSH_INTERVAL);
}

/**
 * Track an analytics event
 * @param {string} eventType - e.g. 'page_view', 'view_writing', 'accept_prompt', 'publish'
 * @param {string} [entityId] - related entity (writing id, prompt id, etc.)
 * @param {object} [metadata] - extra data
 */
export function track(eventType, entityId, metadata = {}) {
    if (typeof window === 'undefined') return;

    const queue = getQueue();
    queue.push({ eventType, entityId, metadata });

    // Trim if too long
    if (queue.length > MAX_QUEUE_SIZE) queue.splice(0, queue.length - MAX_QUEUE_SIZE);

    saveQueue(queue);
    flush();
}

// Track page views on navigation
export function initPageViewTracking() {
    if (typeof window === 'undefined') return;

    track('page_view', window.location.pathname);

    // Track SPA navigations
    const originalPushState = history.pushState;
    history.pushState = function () {
        originalPushState.apply(this, arguments);
        track('page_view', window.location.pathname);
    };

    window.addEventListener('popstate', () => {
        track('page_view', window.location.pathname);
    });
}
