<!-- src/lib/components/LanguageSwitcherDesktop.svelte -->
<script>
  import { locale, locales } from '$lib/translations';
  import { fade, fly } from 'svelte/transition';
  
  const languages = [
    { 
      code: 'en-US', 
      name: 'English', 
      region: 'US', 
      flag: '🇺🇸',
      title: 'English (United States)'
    },
    { 
      code: 'es-MX', 
      name: 'Español', 
      region: 'MX', 
      flag: '🇲🇽',
      title: 'Español (México)'
    },
    { 
      code: 'fr-CA', 
      name: 'Français', 
      region: 'QC', 
      flag: 'quebec',
      title: 'Français (Québec)'
    }
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
  
  function getFlag(code) {
    const lang = languages.find(l => l.code === code);
    if (!lang) return '';
    
    if (lang.flag === 'quebec') {
      // Return SVG for Quebec flag
      return `<svg class="quebec-flag" viewBox="0 0 9600 6400" xmlns="http://www.w3.org/2000/svg">
        <rect fill="#003da5" width="9600" height="6400"/>
        <path fill="#fff" d="M0 2400h9600v1600H0z"/>
        <path fill="#fff" d="M3200 0h3200v6400H3200z"/>
        <g fill="#fff">
          <path d="M1600 1600c-267 0-533 0-800 0 0-267 0-533 0-800 267 0 533 0 800 0 0 267 0 533 0 800z"/>
          <path d="M1600 800c-133 0-267 0-400 0 0-133 0-267 0-400 133 0 267 0 400 0 0 133 0 267 0 400z"/>
          <path d="M8000 1600c-267 0-533 0-800 0 0-267 0-533 0-800 267 0 533 0 800 0 0 267 0 533 0 800z"/>
          <path d="M8000 800c-133 0-267 0-400 0 0-133 0-267 0-400 133 0 267 0 400 0 0 133 0 267 0 400z"/>
          <path d="M1600 5600c-267 0-533 0-800 0 0-267 0-533 0-800 267 0 533 0 800 0 0 267 0 533 0 800z"/>
          <path d="M1600 4800c-133 0-267 0-400 0 0-133 0-267 0-400 133 0 267 0 400 0 0 133 0 267 0 400z"/>
          <path d="M8000 5600c-267 0-533 0-800 0 0-267 0-533 0-800 267 0 533 0 800 0 0 267 0 533 0 800z"/>
          <path d="M8000 4800c-133 0-267 0-400 0 0-133 0-267 0-400 133 0 267 0 400 0 0 133 0 267 0 400z"/>
        </g>
      </svg>`;
    }
    
    return lang.flag;
  }
</script>

<div class="language-switcher-desktop">
  <button 
    class="language-button" 
    on:click={() => isOpen = !isOpen}
    aria-label="Change language"
    aria-expanded={isOpen}
  >
    {@html getFlag($locale)}
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
            title={lang.title}
          >
            {@html getFlag(lang.code)}
            <span class="language-name">{lang.name}</span>
            <span class="language-region">{lang.region}</span>
          </button>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  /* Existing styles... */
  
  .quebec-flag {
    width: 24px;
    height: 16px;
    vertical-align: middle;
    margin-right: 4px;
  }
</style>
