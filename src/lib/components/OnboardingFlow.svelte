<script>
    import { goto } from '$app/navigation';
    import { t } from '$lib/i18n';

    let { user, prompt } = $props();

    let step = $state(0);
    let animating = $state(false);

    const steps = [
        {
            title: 'Welcome to Patrouch! ✍️',
            body: 'A creative writing space where daily prompts spark your imagination. Write in English, Spanish, or French.',
            icon: '🌟'
        },
        {
            title: 'Daily Sparks ✨',
            body: 'Every day you\'ll get a fresh writing prompt. Accept it and write, or pass up to 3 times for a new one. Each pass is a chance to find the perfect spark.',
            icon: '💡'
        },
        {
            title: 'The Agora 🏛️',
            body: 'Share your writings with the community. Discover what others have written. And play "Spot the AI" — can you tell which writings are AI-generated?',
            icon: '🔍'
        },
        {
            title: 'Track Your Growth 📊',
            body: 'Your writing streaks, word counts, and milestones are all tracked. Earn badges as you grow. Every word counts!',
            icon: '🏅'
        },
        {
            title: 'Ready to Write?',
            body: 'Your first prompt is waiting. Accept it and start writing — or explore the Agora to see what the community is creating.',
            icon: '🚀'
        }
    ];

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
        // Mark onboarding as complete
        try {
            localStorage.setItem('onboarding_complete', 'true');
        } catch {}
        goto('/write');
    }
</script>

<div class="onboarding-overlay">
    <div class="onboarding-card" class:animate={animating}>
        <button class="skip-btn" onclick={dismiss}>Skip tour</button>

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
                <button class="btn-secondary" onclick={prevStep}>← Back</button>
            {/if}
            <button class="btn-primary" onclick={nextStep}>
                {step === steps.length - 1 ? 'Start Writing →' : 'Next →'}
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
        background: rgba(255, 255, 255, 0.05);
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
