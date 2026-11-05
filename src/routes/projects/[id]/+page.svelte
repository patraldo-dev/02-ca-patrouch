<!-- src/routes/projects/[id]/+page.svelte — serial/collection cover page:
     ordered parts, follow button, author credit. -->
<script>
    import { t } from '#lib/i18n/index.js';

    let { data } = $props();

    let following = $state(data.following);
    let busy = $state(false);

    async function toggleFollow() {
        if (busy) return;
        busy = true;
        try {
            const res = await fetch(`/api/projects/${data.project.id}/follow`, { method: 'POST' });
            if (res.ok) {
                const d = await res.json();
                following = d.following;
            }
        } catch {}
        busy = false;
    }

    function fmtDate(s) {
        if (!s) return '';
        try {
            return new Date(String(s).replace(' ', 'T') + 'Z').toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch { return s; }
    }
</script>

<svelte:head><title>{data.project.title} · Patrouch</title></svelte:head>

<div class="project-page">
    <a href="/agora" class="back">← {$t('common.nav.agora')}</a>

    <header>
        <span class="kind">📚 {$t('projects.kind')}</span>
        <h1>{data.project.title}</h1>
        {#if data.project.description}
            <p class="desc">{data.project.description}</p>
        {/if}
        <p class="meta">
            {#if data.project.author_name}<span class="author">✍️ {data.project.author_name}</span>{/if}
            <span>· {data.parts.length} {$t('projects.parts_count')}</span>
        </p>
        {#if data.user && !data.isOwner}
            <button class="follow" class:on={following} onclick={toggleFollow} disabled={busy}>
                {following ? $t('projects.following') : $t('projects.follow')}
            </button>
        {/if}
    </header>

    {#if data.parts.length === 0}
        <p class="empty">{$t('projects.empty')}</p>
    {:else}
        <ol class="parts">
            {#each data.parts as part, i}
                <li>
                    <a href="/writings/{part.id}" class="part-link">
                        {#if data.project.kind !== 'collection'}
                        <span class="n">{$t('projects.part_short').replace('{n}', part.project_order ?? i + 1)}</span>
                    {/if}
                        <span class="t">{part.title}</span>
                        <span class="m">
                            {part.word_count} {$t('write.editor.words')}
                            · {fmtDate(part.created_at)}
                            {#if part.status === 'draft'}<span class="draft">{$t('write.view.status_draft')}</span>{/if}
                        </span>
                    </a>
                </li>
            {/each}
        </ol>
    {/if}
</div>

<style>
    .project-page { max-width: 44rem; margin: 0 auto; padding: 1.5rem 1rem 4rem; }
    .back { color: var(--muted, #999); font-size: 0.85rem; text-decoration: none; }
    header { margin: 1rem 0 1.5rem; }
    .kind { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent, #a8bdb3); }
    h1 { font-family: var(--font-heading, serif); font-size: 1.9rem; font-weight: 400; margin: 0.3rem 0 0.5rem; }
    .desc { color: var(--text-dim, #bbb); line-height: 1.6; margin: 0 0 0.6rem; }
    .meta { color: var(--muted, #999); font-size: 0.85rem; margin: 0 0 0.8rem; }
    .author { color: var(--text-dim, #aaa); }
    .follow {
        background: none; border: 1px solid var(--accent, #a8bdb3); border-radius: 999px;
        color: var(--accent, #a8bdb3); padding: 0.4rem 1.1rem; font-size: 0.85rem;
        font-family: inherit; cursor: pointer; transition: all 0.2s;
    }
    .follow.on { background: rgba(168,189,179,0.12); }
    .follow:hover:not(:disabled) { background: rgba(168,189,179,0.18); }
    .follow:disabled { opacity: 0.5; cursor: wait; }
    .empty { color: var(--muted, #999); text-align: center; padding: 2rem; }
    .parts { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
    .part-link {
        display: flex; align-items: baseline; gap: 0.8rem; text-decoration: none;
        background: var(--surface, #1b1e27); border: 1px solid var(--border, #2a2e39);
        border-radius: 10px; padding: 0.8rem 1rem; transition: border-color 0.2s;
    }
    .part-link:hover { border-color: var(--accent, #a8bdb3); }
    .n { color: var(--accent, #a8bdb3); font-size: 0.78rem; font-weight: 600; white-space: nowrap; }
    .t { color: var(--text, #eee); flex: 1; font-size: 0.95rem; }
    .m { color: var(--muted, #888); font-size: 0.75rem; white-space: nowrap; }
    .draft { color: #fde047; font-size: 0.65rem; text-transform: uppercase; background: rgba(250,204,21,0.12); padding: 0.1rem 0.4rem; border-radius: 999px; margin-left: 0.3rem; }
</style>
