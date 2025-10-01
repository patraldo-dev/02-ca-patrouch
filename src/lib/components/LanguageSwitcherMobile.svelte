<!-- src/lib/components/LanguageSwitcherMobile.svelte -->
<script>
  import { locale, locales } from '$lib/i18n';
  import { fade, fly } from 'svelte/transition';
  
  const languages = [
    { code: 'en-US', name: 'English', region: 'US' },
    { code: 'es-MX', name: 'Español', region: 'MX' },
    { code: 'fr-CA', name: 'Français', region: 'CA' }
  ];
  
  let isOpen = false;
  
  function switchLanguage(lang) {
    locale.set(lang);
    isOpen = false;
  }
  
  function getLanguageName(code) {
    const lang = languages.find(l => l.code === code);
    return lang ? `${lang.region}` : code;
  }
</script>

<div class="language-switcher-mobile">
  <button 
    class="language-button" 
    on:click={() => isOpen = true}
    aria-label="Change language"
  >
    <span class="globe-icon">🌎</span>
    <span class="current-language">{getLanguageName($locale)}</span>
  </button>
  
  {#if isOpen}
    <div class="modal-backdrop" transition:fade on:click={() => isOpen = false}>
      <div 
        class="language-modal" 
        transition:fly={{ y: 100, duration: 300 }}
        on:click|stopPropagation
      >
        <div class="modal-header">
          <h3>Select Language</h3>
          <button class="close-button" on:click={() => isOpen = false}>✕</button>
        </div>
        
        <div class="language-options">
          {#each languages as lang}
            <button 
              class="language-option" 
              class:selected={$locale === lang.code}
              on:click={() => switchLanguage(lang.code)}
            >
              <span class="language-name">{lang.name}</span>
              <span class="language-region">{lang.region}</span>
              {#if $locale === lang.code}
                <span class="selected-icon">✓</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .language-switcher-mobile {
    position: relative;
  }
  
  .language-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 30px;
    padding: 8px 16px;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
    font-weight: 500;
  }
  
  .language-button:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  .globe-icon {
    font-size: 18px;
  }
  
  .current-language {
    font-weight: 600;
  }
  
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }
  
  .language-modal {
    background: white;
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 500px;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #666;
    padding: 5px;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-button:hover {
    background: #f0f0f0;
  }
  
  .language-options {
    padding: 10px;
    overflow-y: auto;
  }
  
  .language-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 16px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    color: #333;
    border-radius: 12px;
    margin-bottom: 5px;
  }
  
  .language-option:hover {
    background: #f5f5f5;
  }
  
  .language-option.selected {
    background: #f0f7ff;
    border: 1px solid #d0e3ff;
  }
  
  .language-name {
    font-weight: 500;
    font-size: 16px;
  }
  
  .language-region {
    font-size: 14px;
    color: #666;
    background: #f0f0f0;
    padding: 4px 8px;
    border-radius: 10px;
  }
  
  .selected-icon {
    color: #4285f4;
    font-size: 18px;
    font-weight: bold;
  }
</style>
