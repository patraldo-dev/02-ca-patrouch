<!-- src/lib/components/LanguageSwitcherMobile.svelte -->
<script>
  import { browser } from '$app/environment';

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
    { code: 'fr', label: 'FR' }
  ];

  let { serverLocale = 'es' } = $props();
  let activeLocale = $state(serverLocale || 'es');

  function switchLanguage(lang) {
    document.documentElement.classList.add('lang-switching');
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
    background: var(--glass-bg);
    border-radius: 24px;
    padding: 3px;
    border: 1px solid var(--border);
  }

  .lang-pill {
    padding: 6px 14px;
    border-radius: 20px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.25s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .lang-pill:active:not(.active) {
    background: var(--glass-bg);
  }

  .lang-pill.active {
    background: var(--accent-bg);
    color: var(--accent);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
</style>
