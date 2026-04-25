<script>
    import data from '@emoji-mart/data';
    import { Picker } from 'emoji-mart';
    import { onMount } from 'svelte';

    let { onSelect, onClose } = $props();
    let container = $state();

    onMount(() => {
        if (!container) return;
        new Picker({
            data,
            rootElement: container,
            onEmojiSelect: (emoji) => {
                onSelect?.(emoji.native);
            }
        });
    });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={onClose} role="presentation"></div>
<div bind:this={container} class="emoji-mart-container"></div>

<style>
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; }
    .emoji-mart-container { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1001; }
    :global(.emoji-mart) { --color-background: var(--surface, #141417) !important; --color-border: var(--border, #333) !important; }
</style>
