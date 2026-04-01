<svelte:head>
    <title>{$t('pages.terms.title')} — patrouch.ca</title>
</svelte:head>

<div class="container">
    <h1>{$t('pages.terms.heading')}</h1>
    <p class="last-updated">{$t('pages.terms.last_updated')}</p>

    <section>
        <h2>{$t('pages.terms.s1_heading')}</h2>
        <p>{@html $t('pages.terms.s1_body')}</p>
    </section>

    <section>
        <h2>{$t('pages.terms.s2_heading')}</h2>
        <p>{$t('pages.terms.s2_intro')}</p>
        <ul>
            <li>{$t('pages.terms.s2_li1')}</li>
            <li>{$t('pages.terms.s2_li2')}</li>
            <li>{$t('pages.terms.s2_li3')}</li>
            <li>{@html $t('pages.terms.s2_li4')}</li>
            <li>{$t('pages.terms.s2_li5')}</li>
        </ul>
    </section>

    <section>
        <h2>{$t('pages.terms.s3_heading')}</h2>
        <p>{@html $t('pages.terms.s3_body')}</p>
        <ul>
            <li>{$t('pages.terms.s3_li1')}</li>
            <li>{$t('pages.terms.s3_li2')}</li>
            <li>{$t('pages.terms.s3_li3')}</li>
        </ul>
    </section>

    <section>
        <h2>{$t('pages.terms.s4_heading')}</h2>
        <p>{@html $t('pages.terms.s4_body')}</p>
    </section>

    <section>
        <h2>{$t('pages.terms.s5_heading')}</h2>
        <ul>
            <li>{@html $t('pages.terms.s5_li1')}</li>
            <li>{@html $t('pages.terms.s5_li2')}</li>
            <li>{@html $t('pages.terms.s5_li3')}</li>
            <li>{@html $t('pages.terms.s5_li4')}</li>
        </ul>
        <p>{@html $t('pages.terms.s5_footer')}</p>
    </section>

    <section>
        <h2>{$t('pages.terms.s6_heading')}</h2>
        <p>{@html $t('pages.terms.s6_body')}</p>
    </section>

    <section>
        <h2>{$t('pages.terms.s7_heading')}</h2>
        <p>{@html $t('pages.terms.s7_body')}</p>
    </section>

    <section>
        <h2>{$t('pages.terms.s8_heading')}</h2>
        <p>{@html $t('pages.terms.s8_body')}</p>
    </section>

    <section>
        <h2>{$t('pages.terms.s9_heading')}</h2>
        <p>{@html $t('pages.terms.s9_body')}</p>
    </section>

    <section>
        <h2>{$t('pages.terms.s10_heading')}</h2>
        <p>{@html $t('pages.terms.s10_body')}</p>
    </section>
</div>

<style>
    .container { max-width: 720px; margin: 4rem auto; padding: 0 1.5rem; }
    h1 { font-family: var(--font-heading); font-size: 2rem; margin-bottom: 0.5rem; color: var(--text); }
    .last-updated { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 3rem; }
    section { margin-bottom: 2.5rem; }
    h2 { font-family: var(--font-heading); font-size: 1.25rem; color: var(--accent); margin-bottom: 1rem; }
    p { color: var(--text-dim); line-height: 1.7; margin-bottom: 0.75rem; }
    a { color: var(--accent); }
    ul { color: var(--text-dim); padding-left: 1.5rem; line-height: 1.8; }
    li { margin-bottom: 0.5rem; }
</style>
