<!-- src/lib/components/InkReveal.svelte
     Entrance ink reveal, adapted from the antoine project's component:
     the element fades up and its text "bleeds" into focus (blur +
     letter-spacing easing to normal). Works on any wrapped element —
     headings, buttons, labels. IntersectionObserver-triggered, so above
     the fold it fires on mount. Respects prefers-reduced-motion. -->
<script>
    import { onMount } from 'svelte';

    let { delay = 0, duration = 0.8, threshold = 0.1 } = $props();

    let element = $state(null);
    let isVisible = $state(false);

    onMount(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isVisible) {
                        // Wait for TWO frames: hydration can flip this class
                        // before the browser ever paints the hidden (blurred)
                        // state, in which case the transition never renders
                        // and the element just pops in. Two rAFs guarantee at
                        // least one painted frame of the initial state.
                        requestAnimationFrame(() =>
                            requestAnimationFrame(() => {
                                setTimeout(() => (isVisible = true), delay);
                            })
                        );
                    }
                });
            },
            { threshold, rootMargin: '0px 0px -50px 0px' }
        );
        if (element) observer.observe(element);
        return () => {
            if (element) observer.unobserve(element);
        };
    });
</script>

<div bind:this={element} class="ink-reveal" class:visible={isVisible} style="--dur: {duration}s">
    <slot />
</div>

<style>
    .ink-reveal {
        opacity: 0;
        transform: translateY(18px);
        transition:
            opacity var(--dur, 0.8s) cubic-bezier(0.4, 0, 0.2, 1),
            transform var(--dur, 0.8s) cubic-bezier(0.4, 0, 0.2, 1),
            filter var(--dur, 0.8s) ease;
        /* ink bleed: arrive blurred and loosely spaced, settle into focus */
        filter: blur(3px);
    }
    .ink-reveal.visible {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
        letter-spacing: normal;
    }
    @media (prefers-reduced-motion: reduce) {
        .ink-reveal {
            transition: opacity 0.3s ease;
            transform: none;
            filter: none;
            letter-spacing: normal;
        }
    }
</style>
