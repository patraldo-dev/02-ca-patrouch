<script>
    import { untrack } from 'svelte';

    let { onSelect, onClose } = $props();

    let currentCat = $state(0);

    const emojiData = {
        '😊': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
        '🐱': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫'],
        '🎉': ['🎉','🎊','🎈','🎁','🎀','🏆','🥇','🥈','🥉','⚽','🏀','🏈','⚾','🎾','🏐','🎮','🕹️','🎲','♟️','🎯','🎳','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎸','🎻','🎲','🧩','📚','✏️','📝','🖋️','🔬','🔭','💡','🔒','🔑','🗝️','🗡️','⚔️','🛡️','🔧','🔨','⚙️','🧲','💎','💰','💳'],
        '🌿': ['🌸','🌺','🌻','🌹','🌷','🌼','🍀','🌵','🌲','🌳','🌴','🌾','🌿','☘️','🍁','🍂','🍃','🌍','🌎','🌏','🌙','⭐','🌟','✨','⚡','🔥','💧','🌊','❄️','☀️','🌈','☁️','💨','🌀','🌪️','🌊','🌫️','🌙','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','💫']
    };

    function handleSelect(emoji) {
        onSelect(emoji);
        onClose();
    }
</script>

<div class="modal-overlay" onclick={onClose}></div>
<div class="emoji-picker">
    <div class="emoji-tabs">{#each Object.keys(emojiData) as cat, i}
        <button class="emoji-tab" class:active={currentCat === i} onclick={() => currentCat = i} type="button">{cat}</button>
    {/each}</div>
    <div class="emoji-grid">{#each Object.values(emojiData)[currentCat] as emoji}
        <button class="emoji-item" onclick={() => handleSelect(emoji)} type="button">{emoji}</button>
    {/each}</div>
</div>

<style>
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; }
    .emoji-picker { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--surface, #141417); border: 1px solid var(--border, #333); border-radius: 12px; padding: 1rem; z-index: 1001; max-width: 320px; width: 90%; max-height: 70vh; overflow-y: auto; }
    .emoji-tabs { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
    .emoji-tab { background: none; border: 1px solid transparent; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 1rem; }
    .emoji-tab.active { border-color: var(--accent, #c9a87c); background: var(--accent, #c9a87c)20; }
    .emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }
    .emoji-item { background: none; border: none; font-size: 1.25rem; padding: 6px; cursor: pointer; border-radius: 6px; text-align: center; }
    .emoji-item:hover { background: var(--accent, #c9a87c)20; }
</style>
