<!-- src/lib/components/LanguageSwitcherDesktop.svelte -->
<script>
  import { locale, getLocale } from '$lib/i18n';
  import { browser } from '$app/environment';

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
    { code: 'fr', label: 'FR' }
  ];

  function switchLanguage(lang) {
    if (!browser) return;
    // Use GET redirect — server sets cookie, then redirects back
    // This is the most reliable way to ensure cookie is set before page loads
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/api/locale?lang=${lang}&redirect=${encodeURIComponent(currentPath)}`;
  }

  let { serverLocale = 'es' } = $props();
  let activeLocale = $state(serverLocale || 'es');
  let current = $derived(languages.find(l => l.code === activeLocale));
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
  }

  .lang-pill:hover:not(.active) {
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.05);
  }

  .lang-pill.active {
    background: var(--accent-bg);
    color: var(--accent);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
</style>
