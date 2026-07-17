<!--
	/portals/my-realms — A visitor's personal library of saved materialized
	realms. Each card shows the realm's title, source text excerpt, color
	palette, visibility toggle, and links to enter or delete. Mirrors the
	Agora's card grid but scoped to the user's own saved worlds.
-->
<script>
	import { t } from '$lib/i18n';

	let { data } = $props();

	let realms = $state(data.realms || []);
	let copying = $state(null);

	function excerpt(text) {
		const t = (text || '').replace(/\s+/g, ' ').trim();
		return t.length > 100 ? t.slice(0, 100) + '…' : t;
	}

	async function toggleVisibility(realm) {
		const newVis = realm.visibility === 'public' ? 'private' : 'public';
		try {
			const res = await fetch(`/api/realms/${realm.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ visibility: newVis })
			});
			if (res.ok) {
				realm.visibility = newVis;
			}
		} catch (e) {
			console.error('Toggle failed:', e);
		}
	}

	async function deleteRealm(realm) {
		if (!confirm($t('portals.confirm_delete') || '¿Eliminar este reino?')) return;
		try {
			const res = await fetch(`/api/realms/${realm.id}`, { method: 'DELETE' });
			if (res.ok) {
				realms = realms.filter((r) => r.id !== realm.id);
			}
		} catch (e) {
			console.error('Delete failed:', e);
		}
	}

	async function copyUrl(realm) {
		const url = window.location.origin + '/portals/enter/' + realm.id;
		await navigator.clipboard?.writeText(url);
		copying = realm.id;
		setTimeout(() => (copying = null), 2000);
	}
</script>

<svelte:head>
	<title>{$t('portals.my_realms') || 'Mis reinos'} — patrouch.ca</title>
</svelte:head>

<div class="my-realms-page">
	<div class="header">
		<h1>🔖 {$t('portals.my_realms') || 'Mis reinos'}</h1>
		<p class="subtitle">{$t('portals.my_realms_subtitle') || 'Los mundos que has materializado a partir de tus palabras'}</p>
		<a href="/portals" class="create-link">✨ {$t('portals.create_new') || 'Crear un nuevo reino'}</a>
	</div>

	{#if realms.length === 0}
		<div class="empty">
			<p>{$t('portals.no_realms') || 'Aún no has guardado ningún reino.'}</p>
			<a href="/portals" class="create-btn">{$t('portals.write_to_create') || 'Escribe para crear uno'}</a>
		</div>
	{:else}
		<div class="realms-grid">
			{#each realms as realm (realm.id)}
				<div class="realm-card" style="--realm-color: {realm.color_primary || '#c9a87c'}">
					<div class="card-header">
						<span class="realm-icon">✨</span>
						<h3>{realm.name_es || 'Untitled'}</h3>
					</div>
					<p class="realm-excerpt">{excerpt(realm.source_text)}</p>
					<div class="card-footer">
						<a href="/portals/enter/{realm.id}" class="enter-link">
							{$t('portals.enter') || 'Entrar'} →
						</a>
						<div class="actions">
							<button
								class="vis-btn {realm.visibility}"
								onclick={() => toggleVisibility(realm)}
								title={realm.visibility === 'public' ? 'Public' : 'Private'}
							>
								{realm.visibility === 'public' ? '🌐' : '🔒'}
							</button>
							{#if realm.visibility === 'public'}
								<button class="copy-btn" onclick={() => copyUrl(realm)}>
									{copying === realm.id ? '✓' : '🔗'}
								</button>
							{/if}
							<button class="delete-btn" onclick={() => deleteRealm(realm)}>🗑</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.my-realms-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 3rem 1.5rem;
	}

	.header { text-align: center; margin-bottom: 3rem; }
	.header h1 { font-size: 2rem; color: var(--text, #f0f0f5); margin-bottom: 0.5rem; }
	.subtitle { color: var(--text-dim, #b8b8c5); font-size: 0.95rem; margin-bottom: 1rem; }
	.create-link { color: var(--accent, #d4b98f); font-size: 0.9rem; text-decoration: underline; }

	.empty {
		text-align: center;
		padding: 4rem 2rem;
		color: var(--text-muted, #8e8e9a);
	}
	.create-btn {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		background: var(--accent, #d4b98f);
		color: var(--bg, #0a0a0f);
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
	}

	.realms-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.realm-card {
		background: var(--surface, #1a1a22);
		border: 1px solid var(--border, #3a3a45);
		border-radius: 12px;
		padding: 1.25rem;
		border-left: 3px solid var(--realm-color);
		transition: transform 0.2s, border-color 0.2s;
	}
	.realm-card:hover { transform: translateY(-2px); border-color: var(--realm-color); }

	.card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
	.realm-icon { font-size: 1.2rem; }
	.card-header h3 { font-size: 1.05rem; color: var(--text, #f0f0f5); margin: 0; flex: 1; }

	.realm-excerpt {
		font-size: 0.85rem;
		color: var(--text-dim, #b8b8c5);
		line-height: 1.5;
		margin-bottom: 1rem;
		min-height: 3em;
	}

	.card-footer { display: flex; justify-content: space-between; align-items: center; }
	.enter-link {
		color: var(--realm-color);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.enter-link:hover { text-decoration: underline; }

	.actions { display: flex; gap: 0.4rem; }
	.actions button {
		background: transparent;
		border: 1px solid var(--border, #3a3a45);
		border-radius: 6px;
		padding: 0.3rem 0.5rem;
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s;
	}
	.actions button:hover { border-color: var(--realm-color); }
	.delete-btn:hover { border-color: #c94c35; }

	@media (max-width: 600px) {
		.realms-grid { grid-template-columns: 1fr; }
	}
</style>
