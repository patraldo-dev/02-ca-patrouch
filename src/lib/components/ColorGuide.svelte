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


