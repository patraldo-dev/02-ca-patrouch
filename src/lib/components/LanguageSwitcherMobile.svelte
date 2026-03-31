<!-- src/lib/components/LanguageSwitcherMobile.svelte -->
<script>
  import { locale } from '$lib/i18n';
  import { fade, fly } from 'svelte/transition';

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
    { code: 'fr', label: 'FR' }
  ];

  let isOpen = false;

  function switchLanguage(lang) {
    locale.set(lang);
    if (browser) {
      localStorage.setItem('preferredLanguage', lang);
      document.cookie = `preferredLanguage=${lang};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
      window.location.reload();
    }
  }

  $: current = languages.find(l => l.code === $locale);
</script>

<div class="lang-switcher">
  {#each languages as lang}
    <button
      class="lang-pill"
      class:active={$locale === lang.code}
      on:click={() => switchLanguage(lang.code)}
      aria-label="Switch to {lang.label}"
    >
      {lang.label}
    </button>
  {/each}
</div>

<style>
  .lang-switcher {
    display: flex;
    gap: 4px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 24px;
    padding: 3px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .lang-pill {
    padding: 6px 14px;
    border-radius: 20px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.25s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .lang-pill:active:not(.active) {
    background: rgba(255, 255, 255, 0.05);
  }

  .lang-pill.active {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
</style>
