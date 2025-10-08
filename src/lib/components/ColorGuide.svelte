<!-- src/lib/components/ColorGuide.svelte -->
<div class="color-guide">
  <h2>Our Color Palette</h2>
  
  <div class="color-swatch">
    <div class="color-box primary"></div>
    <div>
      <strong>Primary</strong><br>
      #D2B48C (Tan)<br>
      Use for accents and buttons
    </div>
  </div>
  
  <div class="color-swatch">
    <div class="color-box primary-dark"></div>
    <div>
      <strong>Primary Dark</strong><br>
      #A0826D (Dusty Tan)<br>
      Use for headings and hover states
    </div>
  </div>
  
  <div class="color-swatch">
    <div class="color-box primary-light"></div>
    <div>
      <strong>Primary Light</strong><br>
      #F5F5DC (Beige)<br>
      Use for subtle backgrounds
    </div>
  </div>
</div>

<style>
  .color-guide {
    background: var(--background);
    padding: 1.5rem;
    border-radius: 8px;
    margin-top: 2rem;
  }
  
  .color-swatch {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .color-box {
    width: 50px;
    height: 50px;
    border-radius: 4px;
    margin-right: 1rem;
    border: 1px solid #ddd;
  }
  
  .primary { background-color: var(--primary-color); }
  .primary-dark { background-color: var(--primary-dark); }
  .primary-light { background-color: var(--primary-light); }
</style>
