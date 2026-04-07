<script>
    import { t } from '$lib/i18n';

    let { user, prompt, onclose } = $props();

    let step = $state(0);
    let animating = $state(false);

    const steps = $derived([
        {
            title: $t('onboarding.step0_title'),
            body: $t('onboarding.step0_body'),
            icon: '🌟'
        },
        {
            title: $t('onboarding.step1_title'),
            body: $t('onboarding.step1_body'),
            icon: '💡'
        },
        {
            title: $t('onboarding.step2_title'),
            body: $t('onboarding.step2_body'),
            icon: '🔍'
        },
        {
            title: $t('onboarding.step3_title'),
            body: $t('onboarding.step3_body'),
            icon: '🏅'
        },
        {
            title: $t('onboarding.step4_title'),
            body: $t('onboarding.step4_body'),
            icon: '🚀'
        }
    ]);

    function nextStep() {
        if (step < steps.length - 1) {
            animating = true;
            setTimeout(() => {
                step++;
                animating = false;
            }, 200);
        } else {
            dismiss();
        }
    }

    function prevStep() {
        if (step > 0) {
            animating = true;
            setTimeout(() => {
                step--;
                animating = false;
            }, 200);
        }
    }

    function dismiss() {
        onclose?.();
    }
</script>

<div class="onboarding-overlay">
    <div class="onboarding-card" class:animate={animating}>
        <button class="skip-btn" onclick={dismiss}>{$t('onboarding.skip')}</button>

        <div class="step-content">
            <span class="step-icon">{steps[step].icon}</span>
            <h2>{steps[step].title}</h2>
            <p>{steps[step].body}</p>
        </div>

        <div class="step-indicators">
            {#each steps as _, i}
                <span class="dot" class:active={i === step} onclick={() => { if (!animating) step = i; }}></span>
            {/each}
        </div>

        <div class="step-actions">
            {#if step > 0}
                <button class="btn-secondary" onclick={prevStep}>{$t('onboarding.back')}</button>
            {/if}
            <button class="btn-primary" onclick={nextStep}>
                {step === steps.length - 1 ? $t('onboarding.start_writing') : $t('onboarding.next')}
            </button>
        </div>
    </div>
</div>

<style>
    .onboarding-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .onboarding-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 2.5rem;
        max-width: 480px;
        width: 90%;
        position: relative;
        text-align: center;
    }

    .onboarding-card.animate {
        animation: fadeSlide 0.2s ease;
    }

    @keyframes fadeSlide {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .skip-btn {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 0.8rem;
        cursor: pointer;
        padding: 0.3rem 0.6rem;
        border-radius: 4px;
    }

    .skip-btn:hover {
        color: var(--text);
        background: var(--glass-bg);
    }

    .step-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: 1rem;
    }

    .step-content h2 {
        font-family: var(--font-heading);
        color: var(--accent);
        font-size: 1.25rem;
        margin: 0 0 0.75rem;
        font-weight: 400;
    }

    .step-content p {
        color: var(--text-dim);
        font-size: 0.95rem;
        line-height: 1.6;
        margin: 0;
    }

    .step-indicators {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin: 1.5rem 0;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--border);
        cursor: pointer;
        transition: all 0.2s;
    }

    .dot.active {
        background: var(--accent);
        transform: scale(1.3);
    }

    .step-actions {
        display: flex;
        justify-content: center;
        gap: 0.75rem;
    }

    .btn-primary {
        padding: 0.6rem 1.5rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        transition: background 0.2s;
    }

    .btn-primary:hover {
        background: var(--accent-hover, #b8956a);
    }

    .btn-secondary {
        padding: 0.6rem 1.5rem;
        background: transparent;
        color: var(--text-dim);
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-secondary:hover {
        border-color: var(--accent);
        color: var(--accent);
    }
</style>
