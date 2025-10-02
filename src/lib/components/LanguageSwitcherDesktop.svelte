<!-- src/lib/components/LanguageSwitcherDesktop.svelte -->
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
    return lang ? `${lang.name} (${lang.region})` : code;
  }
</script>

<div class="language-switcher-desktop">
  <button 
    class="language-button" 
    on:click={() => isOpen = !isOpen}
    aria-label="Change language"
    aria-expanded={isOpen}
  >
    <span class="globe-icon">🌎</span>
    <span class="current-language">{getLanguageName($locale)}</span>
    <span class="dropdown-icon" class:rotated={isOpen}>▼</span>
  </button>
  
  {#if isOpen}
    <div 
      class="language-dropdown" 
      transition:fly={{ y: -10, duration: 200 }}
      on:click_outside={() => isOpen = false}
    >
      {#each languages as lang}
        {#if lang.code !== $locale}
          <button 
            class="language-option"
            on:click={() => switchLanguage(lang.code)}
          >
            <span class="language-name">{lang.name}</span>
            <span class="language-region">{lang.region}</span>
          </button>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .language-switcher-desktop {
    position: relative;
    z-index: 1000;
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
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .globe-icon {
    font-size: 18px;
  }
  
  .current-language {
    max-width: 120px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .dropdown-icon {
    font-size: 12px;
    transition: transform 0.3s ease;
  }
  
  .dropdown-icon.rotated {
    transform: rotate(180deg);
  }
  
  .language-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    min-width: 180px;
  }
  
  .language-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 12px 16px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
    color: #333;
  }
  
  .language-option:hover {
    background-color: #f5f5f5;
  }
  
  .language-option:first-child {
    border-radius: 12px 12px 0 0;
  }
  
  .language-option:last-child {
    border-radius: 0 0 12px 12px;
  }
  
  .language-name {
    font-weight: 500;
  }
  
  .language-region {
    font-size: 12px;
    color: #666;
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 10px;
  }
</style>
