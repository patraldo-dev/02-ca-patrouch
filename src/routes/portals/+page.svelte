<!--
	/portals — Write-first intro. Before dropping into a pre-built realm,
	visitors see a prompt to write something. Their words are distilled into a
	3D scene via Mistral and materialized around them. A "skip" link goes
	straight to the existing random-realm experience.
-->
<script>
	import PortalScene from '$lib/components/PortalScene.svelte';
	import { t, locale } from '$lib/i18n';

	let { data } = $props();

	// Phases: 'write' → 'loading' → 'summary' → 'scene'
	let phase = $state('write');
	// Restore text from sessionStorage (survives scene entry + rewrite)
	let text = $state(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('portal_write_text') || '' : '');
	let error = $state('');
	let materializedConfig = $state(null);
	let materializedId = $state(null);
	let saveState = $state('idle'); // 'idle' | 'saving' | 'saved' | 'error'
	let savedRealmUrl = $state(null);

	const ENV_LABELS = {
		ocean: { es: 'Un mundo submarino', en: 'An underwater world', fr: 'Un monde sous-marin' },
		forest: { es: 'Un bosque crepuscular', en: 'A twilight forest', fr: 'Une forêt crépusculaire' },
		celebration: { es: 'Una fiesta', en: 'A celebration', fr: 'Une célébration' },
		space: { es: 'El cosmos', en: 'The cosmos', fr: 'Le cosmos' },
		city: { es: 'Una ciudad nocturna', en: 'A nighttime city', fr: 'Une ville nocturne' },
		dream: { es: 'Un sueño', en: 'A dream', fr: 'Un rêve' },
		theater: { es: 'Un teatro', en: 'A theater', fr: 'Un théâtre' },
		memory: { es: 'Un recuerdo', en: 'A memory', fr: 'Un souvenir' },
	};

	function envLabel(type) {
		const lang = $locale || 'es';
		return ENV_LABELS[type]?.[lang] || ENV_LABELS[type]?.es || type;
	}

	async function materialize() {
		if (text.trim().length < 20) {
			error = $locale === 'en' ? 'Write at least 20 characters'
				: $locale === 'fr' ? 'Écrivez au moins 20 caractères'
				: 'Escribe al menos 20 caracteres';
			return;
		}
		error = '';
		// Persist the text so it survives scene entry and can be restored on rewrite
		try { sessionStorage.setItem('portal_write_text', text.trim()); } catch {}
		phase = 'loading';
		try {
			const res = await fetch('/api/materialize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: text.trim(), locale: $locale || 'es' }),
			});
			const result = await res.json();
			if (res.ok) {
				materializedConfig = result.sceneConfig;
				materializedId = result.portalId;
				phase = 'summary';  // show what the AI chose before entering
			} else {
				error = result.error || 'Failed to materialize';
				phase = 'write';
			}
		} catch (e) {
			error = 'Connection error. Try again.';
			phase = 'write';
		}
	}

	function enterRealm() {
		phase = 'scene';
	}

	// Save the materialized realm to the user's library (private by default).
	// Requires auth — redirects to login if not logged in.
	async function saveRealm() {
		if (!data.user) {
			// Stash the config so we can save after login
			try {
				sessionStorage.setItem('pending_realm_save', JSON.stringify({
					text: text.trim(),
					sceneConfig: materializedConfig
				}));
			} catch {}
			window.location.href = `/login?redirect=${encodeURIComponent('/portals')}`;
			return;
		}
		saveState = 'saving';
		try {
			const res = await fetch('/api/realms/save', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					text: text.trim(),
					sceneConfig: materializedConfig,
					visibility: 'private'
				})
			});
			const result = await res.json();
			if (res.ok) {
				saveState = 'saved';
				savedRealmUrl = result.url;
			} else {
				saveState = 'error';
			}
		} catch {
			saveState = 'error';
		}
	}

	function copyShareUrl() {
		if (savedRealmUrl) {
			navigator.clipboard?.writeText(window.location.origin + savedRealmUrl);
		}
	}

	// Called from PortalScene's ☰ drawer — exit the scene back to the write form
	// with the text restored, so the visitor can refine and re-materialize.
	function rewriteFromScene() {
		phase = 'write';
		materializedConfig = null;
		materializedId = null;
	}

	function skipToRealms() {
		phase = 'scene';
		materializedConfig = null;
		materializedId = null;
	}

	function rewrite() {
		phase = 'write';
	}

	// Build the data prop for PortalScene, injecting the materialized config
	let sceneData = $derived(
		materializedConfig
			? {
					...data,
					sceneConfigs: { ...data.sceneConfigs, [materializedId]: materializedConfig },
					portals: [...(data.portals || []), { id: materializedId, name_es: 'Tu reino', name_en: 'Your realm', icon: '✨', color_primary: '#c9a87c' }],
				}
			: data
	);
</script>

{#if phase === 'scene'}
	<PortalScene data={sceneData} initialPortalId={materializedId} onRewrite={rewriteFromScene} />
{:else}
	<div class="write-intro">
		<div class="write-card">
			{#if phase === 'loading'}
				<div class="loading-state">
					<div class="orbit-loader"></div>
					<p class="loading-text">{$t('portals.materializing') || 'Materializando tu reino…'}</p>
					<p class="loading-sub">{$t('portals.distilling') || 'Distilling your words into a world'}</p>
				</div>
			{:else if phase === 'summary' && materializedConfig}
				{@const cfg = materializedConfig}
				{@const env = cfg.environment?.type || 'space'}
				{@const pal = cfg.palette}
				{@const deco = cfg.decorations || {}}
				{@const crystals = cfg.crystals || []}
				<div class="summary-header">
					<span class="summary-icon">✨</span>
					<h1>{$t('portals.your_realm') || 'Tu reino'}</h1>
					<p class="summary-subtitle">{$t('portals.summary_subtitle') || 'Así es como tus palabras tomaron forma'}</p>
				</div>

				<div class="summary-grid">
					<div class="summary-item">
						<div class="summary-label">{$t('portals.world') || 'Mundo'}</div>
						<div class="summary-value">{envLabel(env)}</div>
					</div>
					<div class="summary-item">
						<div class="summary-label">{$t('portals.mood') || 'Ambiente'}</div>
						<div class="summary-value">{cfg.atmosphere?.mood || '—'}</div>
					</div>
					<div class="summary-item">
						<div class="summary-label">{$t('portals.color') || 'Color'}</div>
						<div class="summary-value">
							<span class="color-swatch" style="background: {pal?.primary || '#c9a87c'}"></span>
							<span class="color-swatch" style="background: {pal?.secondary || '#4fc3f7'}"></span>
							<span class="color-swatch" style="background: {pal?.accent || '#ce93d8'}"></span>
						</div>
					</div>
					<div class="summary-item">
						<div class="summary-label">{$t('portals.particles') || 'Partículas'}</div>
						<div class="summary-value">{deco.particle_style || 'dust'}</div>
					</div>
				</div>

				{#if crystals.length}
					<div class="crystal-preview">
						<div class="summary-label">{$t('portals.crystals_found') || 'Fragmentos encontrados'}</div>
						<div class="crystal-list">
							{#each crystals.slice(0, 4) as crystal, i}
								<div class="crystal-chip" style="border-color: {pal?.crystal_colors?.[crystal.color_index] || pal?.primary}">
									<span class="crystal-dot" style="background: {pal?.crystal_colors?.[crystal.color_index] || pal?.primary}"></span>
									{crystal.text}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<div class="summary-actions">
					<button class="enter-btn" onclick={enterRealm}>
						{$t('portals.enter_realm') || 'Entrar al reino'} →
					</button>
					<button class="rewrite-btn" onclick={rewrite}>
						{$t('portals.rewrite') || 'Escribir de nuevo'}
					</button>
				</div>

				<!-- Save to library -->
				<div class="save-section">
					{#if saveState === 'saved'}
						<p class="save-success">
							✓ {$t('portals.realm_saved') || 'Reino guardado'}
							{#if savedRealmUrl}
								<button class="copy-url-btn" onclick={copyShareUrl}>
									{$t('portals.copy_url') || 'Copiar enlace'}
								</button>
								<a href="/portals/my-realms" class="my-realms-link">
									{$t('portals.my_realms') || 'Mis reinos'}
								</a>
							{/if}
						</p>
					{:else}
						<button class="save-btn" onclick={saveRealm} disabled={saveState === 'saving'}>
							{#if saveState === 'saving'}
								{$t('portals.saving') || 'Guardando…'}
							{:else}
								🔖 {$t('portals.save_realm') || 'Guardar reino'}
							{/if}
						</button>
						{#if !data.user}
							<p class="save-hint">{$t('portals.save_login_hint') || 'Inicia sesión para guardar'}</p>
						{/if}
					{/if}
				</div>
			{:else}
				<div class="write-header">
					<span class="write-icon">✨</span>
					<h1>{$t('portals.write_title') || 'Escribe algo'}</h1>
					<p class="write-subtitle">{$t('portals.write_subtitle') || 'Tus palabras se convertirán en un mundo'}</p>
				</div>

				<textarea
					bind:value={text}
					class="write-textarea"
					placeholder="{$t('portals.write_placeholder') || 'Escribe algunas frases sobre lo que sea… una memoria, un sueño, un lugar, un sentimiento…'}"
					rows="6"
					maxlength="5000"
				></textarea>

				{#if error}
					<p class="write-error">{error}</p>
				{/if}

				<div class="write-actions">
					<button class="materialize-btn" onclick={materialize}>
						✨ {$t('portals.materialize') || 'Materializar'}
					</button>
					<button class="skip-btn" onclick={skipToRealms}>
						{$t('portals.skip') || 'Explorar reinos existentes →'}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.write-intro {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #05030a;
		padding: 1.5rem;
		overflow-y: auto;
	}
	.write-card {
		max-width: 580px;
		width: 100%;
		background: rgba(12, 8, 20, 0.85);
		border: 1px solid rgba(201, 168, 124, 0.2);
		border-radius: 16px;
		padding: 2.5rem;
		backdrop-filter: blur(12px);
		margin: auto;
	}

	/* Write phase */
	.write-header { text-align: center; margin-bottom: 1.5rem; }
	.write-icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
	.write-header h1 {
		font-family: Georgia, serif; font-size: 1.8rem; font-weight: 300;
		color: #d4b98f; margin: 0 0 0.5rem;
	}
	.write-subtitle {
		font-family: Georgia, serif; font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.5); font-style: italic; margin: 0;
	}
	.write-textarea {
		width: 100%; min-height: 160px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 10px; padding: 1rem;
		font-family: Georgia, serif; font-size: 1.05rem; line-height: 1.7;
		color: #e5e5e5; resize: vertical; transition: border-color 0.2s;
	}
	.write-textarea:focus { outline: none; border-color: rgba(201, 168, 124, 0.5); }
	.write-error { color: #ef4444; font-size: 0.85rem; margin: 0.75rem 0; font-family: Georgia, serif; }
	.write-actions { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; }
	.materialize-btn {
		padding: 0.9rem 2rem;
		background: linear-gradient(135deg, #c9a87c, #d4b98f);
		color: #05030a; border: none; border-radius: 999px;
		font-family: Georgia, serif; font-size: 1.1rem; font-weight: 600;
		cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
	}
	.materialize-btn:hover { transform: scale(1.02); box-shadow: 0 4px 20px rgba(201, 168, 124, 0.3); }
	.skip-btn {
		background: none; border: none; color: rgba(255, 255, 255, 0.4);
		font-family: Georgia, serif; font-size: 0.9rem; cursor: pointer;
		padding: 0.5rem; text-decoration: underline; text-underline-offset: 3px;
	}
	.skip-btn:hover { color: rgba(255, 255, 255, 0.7); }

	/* Loading phase */
	.loading-state { text-align: center; padding: 2rem 0; }
	.orbit-loader {
		width: 48px; height: 48px; margin: 0 auto 1.5rem;
		border: 2px solid rgba(201, 168, 124, 0.2);
		border-top-color: #d4b98f; border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.loading-text {
		font-family: Georgia, serif; font-size: 1.1rem; color: #d4b98f; margin: 0 0 0.25rem;
	}
	.loading-sub {
		font-family: Georgia, serif; font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.4); font-style: italic;
	}

	/* Summary phase */
	.summary-header { text-align: center; margin-bottom: 1.5rem; }
	.summary-icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
	.summary-header h1 {
		font-family: Georgia, serif; font-size: 1.6rem; font-weight: 300;
		color: #d4b98f; margin: 0 0 0.25rem;
	}
	.summary-subtitle {
		font-family: Georgia, serif; font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.45); font-style: italic; margin: 0;
	}
	.summary-grid {
		display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
		margin-bottom: 1.5rem;
	}
	.summary-item {
		background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px; padding: 0.75rem 1rem;
	}
	.summary-label {
		font-family: Georgia, serif; font-size: 0.7rem;
		text-transform: uppercase; letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.35); margin-bottom: 0.3rem;
	}
	.summary-value {
		font-family: Georgia, serif; font-size: 1rem;
		color: rgba(255, 255, 255, 0.85);
		display: flex; align-items: center; gap: 6px;
	}
	.color-swatch {
		width: 20px; height: 20px; border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.15); display: inline-block;
	}
	.crystal-preview { margin-bottom: 1.5rem; }
	.crystal-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
	.crystal-chip {
		display: flex; align-items: center; gap: 8px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px; padding: 0.6rem 0.8rem;
		font-family: Georgia, serif; font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7); font-style: italic;
	}
	.crystal-dot {
		width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
		box-shadow: 0 0 6px currentColor;
	}
	.summary-actions { display: flex; flex-direction: column; gap: 0.75rem; }
	.enter-btn {
		padding: 0.9rem 2rem;
		background: linear-gradient(135deg, #c9a87c, #d4b98f);
		color: #05030a; border: none; border-radius: 999px;
		font-family: Georgia, serif; font-size: 1.05rem; font-weight: 600;
		cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
	}
	.enter-btn:hover { transform: scale(1.02); box-shadow: 0 4px 20px rgba(201, 168, 124, 0.3); }
	.rewrite-btn {
		background: none; border: none; color: rgba(255, 255, 255, 0.4);
		font-family: Georgia, serif; font-size: 0.9rem; cursor: pointer;
		padding: 0.5rem; text-decoration: underline; text-underline-offset: 3px;
	}
	.rewrite-btn:hover { color: rgba(255, 255, 255, 0.7); }

	/* Save section */
	.save-section { margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid rgba(255,255,255,0.1); }
	.save-btn {
		background: transparent; color: rgba(255,255,255,0.8);
		border: 1px solid rgba(255,255,255,0.25); border-radius: 12px;
		font-family: Georgia, serif; font-size: 0.9rem; cursor: pointer;
		padding: 0.6rem 1.2rem; transition: all 0.2s; width: 100%;
	}
	.save-btn:hover:not(:disabled) { border-color: rgba(201,168,124,0.6); color: #c9a87c; }
	.save-btn:disabled { opacity: 0.6; cursor: default; }
	.save-hint { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-top: 0.5rem; text-align: center; }
	.save-success {
		color: #8fbc8f; font-size: 0.9rem; font-family: Georgia, serif;
		display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;
		justify-content: center;
	}
	.copy-url-btn {
		background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
		color: rgba(255,255,255,0.7); border-radius: 8px; padding: 0.3rem 0.7rem;
		font-size: 0.8rem; cursor: pointer;
	}
	.copy-url-btn:hover { background: rgba(255,255,255,0.15); }
	.my-realms-link { color: #c9a87c; font-size: 0.85rem; text-decoration: underline; }

	@media (max-width: 600px) {
		.write-card { padding: 1.5rem; }
		.write-header h1, .summary-header h1 { font-size: 1.3rem; }
		.summary-grid { grid-template-columns: 1fr; }
	}
</style>
