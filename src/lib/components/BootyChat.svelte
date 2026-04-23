<script>
    // BootyChat — WebSocket chat component for Durable Object
    import { onMount } from 'svelte';

    let { username = 'anonymous', displayName, wsUrl, onAction } = $props();

    let messages = $state([]);
    let input = $state('');
    let ws = $state(null);
    let connected = $state(false);
    let messagesEl = $state(null);
    let minimized = $state(false);

    function connect() {
        if (ws) return;
        try {
            const url = wsUrl || `wss://booty-chat-worker.chef-tech.workers.dev/chat/ws?username=${encodeURIComponent(username)}&display_name=${encodeURIComponent(displayName || username)}`;
            ws = new WebSocket(url);

            ws.onopen = () => { connected = true; };
            ws.onclose = () => {
                connected = false;
                ws = null;
                // Reconnect after 5s
                setTimeout(connect, 5000);
            };
            ws.onerror = () => { ws = null; };
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'history') {
                        messages = data.messages || [];
                    } else if (data.type === 'chat' || data.type === 'system' || data.type === 'narrator') {
                        messages = [...messages, data];
                    }
                    scrollToBottom();
                } catch {}
            };
        } catch (e) {
            setTimeout(connect, 5000);
        }
    }

    function send() {
        const msg = input.trim();
        if (!msg || !ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: 'chat', message: msg }));
        input = '';
    }

    function scrollToBottom() {
        if (messagesEl) {
            requestAnimationFrame(() => {
                messagesEl.scrollTop = messagesEl.scrollHeight;
            });
        }
    }

    function formatTime(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    onMount(() => {
        connect();
        return () => { if (ws) ws.close(); };
    });
</script>

<div class="booty-chat" class:minimized>
    <button class="chat-toggle" onclick={() => minimized = !minimized} aria-label="Toggle chat">
        <span class="toggle-icon">{minimized ? '💬' : '✕'}</span>
        {#if !minimized}
            <span class="toggle-title">Chat</span>
        {/if}
        <span class="toggle-status" class:online={connected}>●</span>
    </button>

    {#if !minimized}
        <div class="chat-body">
            <div class="chat-header">
                <span>🏴‍☠️ Booty Chat</span>
                <span class="conn-badge" class:online={connected}>{connected ? '● Live' : '○ Reconnecting'}</span>
            </div>
            <div class="chat-messages" bind:this={messagesEl}>
                {#each messages as msg (msg.id)}
                    <div class="chat-msg {msg.type}">
                        {#if msg.type === 'system'}
                            <span class="system-text">{msg.message}</span>
                        {:else}
                            <div class="msg-header">
                                <span class="msg-author {msg.type}">{msg.type === 'narrator' ? '🎭' : ''} {msg.display_name || msg.username}</span>
                                <span class="msg-time">{formatTime(msg.created_at)}</span>
                            </div>
                            <div class="msg-body">{msg.message}</div>
                        {/if}
                    </div>
                {/each}
                {#if !messages.length}
                    <div class="chat-empty">Conectando al chat...</div>
                {/if}
            </div>
            <form class="chat-input-row" onsubmit={(e) => { e.preventDefault(); send(); }}>
                <input
                    type="text"
                    bind:value={input}
                    placeholder="Escribe un mensaje..."
                    disabled={!connected}
                    maxlength="500"
                />
                <button type="submit" disabled={!connected || !input.trim()} aria-label="Send">➤</button>
            </form>
        </div>
    {/if}
</div>

<style>
    .booty-chat {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        width: 340px;
        max-height: 480px;
        font-family: var(--font-body, 'Inter', sans-serif);
    }

    .booty-chat.minimized {
        max-height: none;
    }

    .chat-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1rem;
        background: #1a1a2e;
        border: 1px solid #ef4444;
        border-radius: 12px 12px 0 0;
        color: #e5e5e5;
        cursor: pointer;
        font-size: 0.9rem;
        width: 100%;
    }

    .toggle-icon { font-size: 1.1rem; }
    .toggle-title { font-weight: 600; flex: 1; }
    .toggle-status { font-size: 0.7rem; }
    .toggle-status.online { color: #52B788; }
    .toggle-status:not(.online) { color: #666; }

    .chat-body {
        display: flex;
        flex-direction: column;
        background: #0d0d15;
        border: 1px solid #333;
        border-top: none;
        border-radius: 0 0 12px 12px;
        overflow: hidden;
        max-height: 420px;
    }

    .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0.75rem;
        background: #1a1a2e;
        border-bottom: 1px solid #222;
        font-size: 0.8rem;
        color: #aaa;
    }

    .conn-badge { font-size: 0.7rem; }
    .conn-badge.online { color: #52B788; }
    .conn-badge:not(.online) { color: #666; }

    .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;
        min-height: 200px;
        max-height: 340px;
    }

    .chat-msg { padding: 0.3rem 0; }

    .chat-msg.system .system-text {
        color: #666;
        font-size: 0.75rem;
        font-style: italic;
        text-align: center;
        display: block;
    }

    .msg-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.15rem;
    }

    .msg-author {
        font-size: 0.75rem;
        font-weight: 600;
        color: #c9a87c;
    }
    .msg-author.narrator { color: #ef4444; }
    .msg-author.system { color: #666; }

    .msg-time {
        font-size: 0.65rem;
        color: #555;
    }

    .msg-body {
        font-size: 0.85rem;
        color: #ddd;
        line-height: 1.4;
        word-wrap: break-word;
    }

    .chat-msg.narrator .msg-body {
        color: #f0c0c0;
        font-style: italic;
    }

    .chat-empty {
        text-align: center;
        color: #555;
        font-size: 0.8rem;
        padding: 2rem 0;
    }

    .chat-input-row {
        display: flex;
        border-top: 1px solid #222;
    }

    .chat-input-row input {
        flex: 1;
        background: #111;
        border: none;
        color: #eee;
        padding: 0.6rem 0.75rem;
        font-size: 0.85rem;
        outline: none;
    }

    .chat-input-row input::placeholder { color: #555; }

    .chat-input-row button {
        background: #ef4444;
        border: none;
        color: white;
        padding: 0 1rem;
        font-size: 1rem;
        cursor: pointer;
    }

    .chat-input-row button:disabled {
        background: #333;
        cursor: not-allowed;
    }

    @media (max-width: 480px) {
        .booty-chat {
            width: calc(100% - 1rem);
            left: 0.5rem;
            right: 0.5rem;
            bottom: 0.5rem;
        }
    }
</style>
