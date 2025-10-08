<script>
    import { t } from '$lib/translations';
</script>

<div class="color-guide">
    <h2>{$t('pages.home.colorGuide.title')}</h2>
    
    <div class="color-swatch">
        <div class="color-box primary"></div>
        <div>
            <strong>{$t('pages.home.colorGuide.colors.primary.name')}</strong><br>
            #D2B48C ({$t('pages.home.colorGuide.colors.primary.shade')})<br>
            {$t('pages.home.colorGuide.colors.primary.usage')}
        </div>
    </div>
    
    <div class="color-swatch">
        <div class="color-box primary-dark"></div>
        <div>
            <strong>{$t('pages.home.colorGuide.colors.primaryDark.name')}</strong><br>
            #A0826D ({$t('pages.home.colorGuide.colors.primaryDark.shade')})<br>
            {$t('pages.home.colorGuide.colors.primaryDark.usage')}
        </div>
    </div>
    
    <div class="color-swatch">
        <div class="color-box primary-light"></div>
        <div>
            <strong>{$t('pages.home.colorGuide.colors.primaryLight.name')}</strong><br>
            #F5F5DC ({$t('pages.home.colorGuide.colors.primaryLight.shade')})<br>
            {$t('pages.home.colorGuide.colors.primaryLight.usage')}
        </div>
    </div>
</div>

<style>
    .color-guide {
        background: var(--bg-card);
        padding: 1.5rem;
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgba(139, 69, 19, 0.1);
        border: 1px solid var(--primary-light);
        max-width: 500px; /* More compact width */
        margin: 0 auto;
    }

    .color-guide h2 {
        color: var(--text-primary);
        text-align: center;
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
    }

    .color-swatch {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;
        padding: 0.75rem;
        background: var(--bg-secondary);
        border-radius: 12px;
    }

    .color-box {
        width: 40px; /* Smaller square */
        height: 40px; /* Matches height of 3 lines of text */
        border-radius: 6px;
        margin-right: 1rem;
        border: 1px solid rgba(0, 0, 0, 0.1);
        flex-shrink: 0;
    }

    .primary { background-color: var(--primary-color); }
    .primary-dark { background-color: var(--primary-dark); }
    .primary-light { background-color: var(--primary-light); }

    .color-swatch div {
        flex: 1;
        font-size: 0.9rem; /* Slightly smaller text */
        line-height: 1.4;
    }

    .color-swatch strong {
        display: block;
        color: var(--text-primary);
        font-size: 1rem;
        margin-bottom: 0.2rem;
    }

    .color-swatch br {
        display: block;
        margin: 0.2rem 0;
    }

    .color-swatch div > :last-child {
        color: var(--text-secondary);
        font-size: 0.85rem;
    }
</style>
