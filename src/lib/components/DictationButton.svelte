<script>
    // DictationButton — mic toggle for hands-free writing.
    // Owns the dictation engine lifecycle (auto-cleans up on destroy) and
    // emits prose finals / live interims / wake-word commands to the parent.
    // Hidden entirely on browsers without the Web Speech API; the editor
    // remains fully usable by keyboard.
    import { onDestroy } from 'svelte';
    import { t } from '#lib/i18n/index.js';
    import { createDictation } from '#lib/dictation.js';

    let {
        lang = 'es',
        commands = false,
        onFinal,
        onInterim,
        onInterimEnd,
        onCommand,
        onError
    } = $props();

    const supported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    let listening = $state(false);
    let engine = null;

    function toggle() {
        if (listening) {
            engine?.stop();
            return;
        }
        engine = createDictation({
            lang,
            onFinal,
            onInterim,
            onCommand: commands ? onCommand : undefined,
            onError,
            onStateChange: (on) => {
                listening = on;
                if (!on) onInterimEnd?.();
            }
        });
        engine.start();
    }

    onDestroy(() => engine?.stop());
</script>

{#if supported}
    <button
        class="dictation-btn"
        class:listening
        onclick={toggle}
        aria-pressed={listening}
        aria-label={listening ? $t('write.dictation.stop') : $t('write.dictation.start')}
        title={commands ? $t('write.dictation.hint') : $t('write.dictation.start')}
    >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"></path>
            <path d="M19 10v2a7 7 0 01-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        <span>{listening ? $t('write.dictation.stop') : $t('write.dictation.start')}</span>
    </button>
{/if}

<style>
    .dictation-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: none;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text-dim);
        padding: 0.45rem 0.7rem;
        font-size: 0.8rem;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s;
    }
    .dictation-btn:hover { border-color: var(--accent); color: var(--accent); }
    .dictation-btn.listening {
        border-color: var(--accent);
        color: var(--accent);
        animation: dictation-pulse 1.6s ease-in-out infinite;
    }
    @keyframes dictation-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(242, 169, 59, 0.35); }
        50% { box-shadow: 0 0 0 6px rgba(242, 169, 59, 0); }
    }
</style>
