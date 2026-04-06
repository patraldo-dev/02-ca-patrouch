<script>
    let { writer = null } = $props();

    let dateStr = $derived.by(() => {
        if (!writer?.week_start) return '';
        return new Date(writer.week_start.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    });

    let endDateStr = $derived.by(() => {
        if (!writer?.week_end) return '';
        return new Date(writer.week_end.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    });
</script>

{#if writer}
<div class="writer-of-week">
    <div class="wotw-badge">⭐ Writer of the Week</div>
    <div class="wotw-content">
        <div class="wotw-avatar">
            <span class="avatar-letter">{writer.username?.[0]?.toUpperCase() || '?'}</span>
        </div>
        <div class="wotw-info">
            <h3>{writer.username}</h3>
            <p class="wotw-reason">{writer.reason}</p>
            <div class="wotw-stats">
                <span class="stat">{writer.words_written?.toLocaleString()} words</span>
                <span class="stat">{writer.writings_count} writings</span>
            </div>
            <span class="wotw-dates">{dateStr} — {endDateStr}</span>
        </div>
    </div>
    {#if writer.featured_writing_id}
    <a href="/writings/{writer.featured_writing_id}" class="wotw-cta">Read featured writing →</a>
    {/if}
</div>
{/if}

<style>
    .writer-of-week {
        background: linear-gradient(135deg, rgba(201, 168, 124, 0.08) 0%, rgba(201, 168, 124, 0.02) 100%);
        border: 1px solid rgba(201, 168, 124, 0.25);
        border-radius: 12px;
        padding: 1.5rem;
        position: relative;
        overflow: hidden;
        margin-bottom: 1rem;
    }

    .writer-of-week::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, #c9a87c, transparent);
    }

    .wotw-badge {
        display: inline-block;
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: #c9a87c;
        background: rgba(201, 168, 124, 0.15);
        padding: 0.3rem 0.75rem;
        border-radius: 999px;
        margin-bottom: 1rem;
    }

    .wotw-content {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
    }

    .wotw-avatar {
        flex-shrink: 0;
    }

    .avatar-letter {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--accent);
        color: var(--bg);
        font-size: 1.25rem;
        font-weight: 600;
        font-family: var(--font-heading);
    }

    .wotw-info h3 {
        font-family: var(--font-heading);
        color: var(--text);
        font-size: 1.1rem;
        margin: 0 0 0.25rem;
        font-weight: 400;
    }

    .wotw-reason {
        color: var(--text-dim);
        font-size: 0.8rem;
        margin: 0 0 0.5rem;
        font-style: italic;
    }

    .wotw-stats {
        display: flex;
        gap: 0.75rem;
    }

    .stat {
        font-size: 0.75rem;
        color: var(--accent);
        font-weight: 500;
    }

    .wotw-dates {
        font-size: 0.7rem;
        color: var(--text-muted);
    }

    .wotw-cta {
        display: inline-block;
        color: var(--accent);
        text-decoration: none;
        font-size: 0.85rem;
        font-weight: 500;
        padding: 0.5rem 0;
        transition: opacity 0.2s;
    }

    .wotw-cta:hover {
        opacity: 0.8;
        text-decoration: underline;
    }
</style>
