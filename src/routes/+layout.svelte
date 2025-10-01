<!-- src/routes/+layout.svelte -->
<script>
  import { browser } from '$app/environment';
  import { beforeNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { t, locale } from '$lib/translations';
  import NewsletterForm from '$lib/components/NewsletterForm.svelte';
  import LanguageSwitcherDesktop from '$lib/components/LanguageSwitcherDesktop.svelte';
  import LanguageSwitcherMobile from '$lib/components/LanguageSwitcherMobile.svelte';
  
  // Close mobile menu on route change
  beforeNavigate(() => {
    mobileMenuOpen = false;
  });
  
  /** @type {import('./$types').LayoutData} */
  export let data = {};
  
  // Mobile menu state
  let mobileMenuOpen = false;
  
  // Helper function
  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
</script>

<div class="app-container">
  <header class="app-header">
    <nav class="main-nav">
      <a href="/" class="nav-link">{$t('nav.home')}</a>
      <a href="/books" class="nav-link">{$t('nav.books')}</a>
      <a href="/reviews" class="nav-link">{$t('nav.reviews')}</a>
      <a href="/blog" class="nav-link">{$t('nav.blog')}</a>
      
      <!-- Desktop Language Switcher -->
      <div class="desktop-language-switcher">
        <LanguageSwitcherDesktop />
      </div>
    </nav>
    
    <!-- Mobile menu button and language switcher -->
    <div class="mobile-nav-controls">
      <!-- Mobile Language Switcher -->
      <LanguageSwitcherMobile />
      
      <button 
        class="mobile-menu-button" 
        on:click={toggleMobileMenu}
        aria-label="Toggle mobile menu"
      >
        {#if mobileMenuOpen}
          ✕
        {:else}
          ☰
        {/if}
      </button>
    </div>
  </header>
  
  <!-- Mobile menu -->
  {#if mobileMenuOpen}
    <div class="mobile-menu">
      <a href="/" class="mobile-nav-link" on:click={toggleMobileMenu}>
        {$t('nav.home')}
      </a>
      <a href="/books" class="mobile-nav-link" on:click={toggleMobileMenu}>
        {$t('nav.books')}
      </a>
      <a href="/reviews" class="mobile-nav-link" on:click={toggleMobileMenu}>
        {$t('nav.reviews')}
      </a>
      <a href="/blog" class="mobile-nav-link" on:click={toggleMobileMenu}>
        {$t('nav.blog')}
      </a>
    </div>
  {/if}
  
  <main class="app-main">
    <slot />
  </main>
  
  <footer class="app-footer">
    <p>{$t('footer.tagline')}</p>
    <div class="footer-links">
      <a href="/privacy">{$t('footer.privacy')}</a>
      <a href="/terms">{$t('footer.terms')}</a>
    </div>
  </footer>
  
  <NewsletterForm />
</div>

<style>
  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .app-header {
    background-color: #333;
    color: white;
    padding: 1rem 2rem;
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .main-nav {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  
  .nav-link {
    color: white;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }
  
  .nav-link:hover {
    color: #4ecdc4;
  }
  
  .desktop-language-switcher {
    margin-left: auto;
    display: flex;
    align-items: center;
  }
  
  .mobile-nav-controls {
    display: none;
    align-items: center;
    gap: 12px;
  }
  
  .mobile-menu-button {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
  }
  
  .mobile-menu {
    display: none;
    flex-direction: column;
    background-color: #333;
    padding: 1rem 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .mobile-nav-link {
    color: white;
    text-decoration: none;
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .app-main {
    flex: 1;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }
  
  .app-footer {
    background-color: #333;
    color: white;
    text-align: center;
    padding: 1.5rem;
    margin-top: auto;
  }
  
  .footer-links {
    margin-top: 1rem;
    display: flex;
    justify-content: center;
    gap: 1.5rem;
  }
  
  .footer-links a {
    color: white;
    text-decoration: none;
    transition: color 0.2s;
  }
  
  .footer-links a:hover {
    color: #4ecdc4;
  }
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .main-nav {
      display: none;
    }
    
    .mobile-nav-controls {
      display: flex;
    }
    
    .mobile-menu {
      display: flex;
    }
    
    .app-main {
      padding: 1rem;
    }
  }
</style>
