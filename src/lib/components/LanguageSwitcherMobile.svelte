<!-- src/lib/components/LanguageSwitcherMobile.svelte -->
<script>
  import { browser } from '$app/environment';

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
    { code: 'fr', label: 'FR' }
  ];

  function getCookieLocale() {
    if (!browser) return 'es';
    const match = document.cookie.match(/preferredLanguage=(en|es|fr)/);
    return match ? match[1] : 'es';
  }

  let activeLocale = $state(getCookieLocale());

  function switchLanguage(lang) {
    if (!browser) return;
    window.location.href = `/api/locale?lang=${lang}&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
</script>

<div class="lang-switcher">
  {#each languages as lang}
    <button
      class="lang-pill"
      class:active={activeLocale === lang.code}
      onclick={() => switchLanguage(lang.code)}
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
