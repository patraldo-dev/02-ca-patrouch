<!--
	/portals — Write-first intro. Before dropping into a pre-built realm,
	visitors see a prompt to write something. Their words are distilled into a
	3D scene via Mistral and materialized around them. A "skip" link goes
	straight to the existing random-realm experience.
-->
<script>
	import PortalScene from '$lib/components/PortalScene.svelte';
	import { t } from '$lib/i18n';

	let { data } = $props();

	// Two-phase: null = show write form; 'loading' = generating; 'scene' = booted
	let phase = $state('write');
	let text = $state('');
	let error = $state('');
	let materializedConfig = $state(null);
	let materializedId = $state(null);

	async function materialize() {
		if (text.trim().length < 20) {
			error = 'Escribe al menos 20 caracteres / Write at least 20 characters';
			return;
		}
		error = '';
		phase = 'loading';
		try {
			const res = await fetch('/api/materialize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: text.trim() }),
			});
			const result = await res.json();
			if (res.ok) {
				materializedConfig = result.sceneConfig;
				materializedId = result.portalId;
				phase = 'scene';
			} else {
				error = result.error || 'Failed to materialize';
				phase = 'write';
			}
		} catch (e) {
			error = 'Connection error. Try again.';
			phase = 'write';
		}
	}

	function skipToRealms() {
		phase = 'scene';
		materializedConfig = null;
		materializedId = null;
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
	<PortalScene data={sceneData} initialPortalId={materializedId} />
{:else}
	<div class="write-intro">
		<div class="write-card">
			{#if phase === 'loading'}
				<div class="loading-state">
					<div class="orbit-loader"></div>
					<p class="loading-text">Materializando tu reino…</p>
					<p class="loading-sub">Distilling your words into a world</p>
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
		max-width: 560px;
		width: 100%;
		background: rgba(12, 8, 20, 0.8);
		border: 1px solid rgba(201, 168, 124, 0.2);
		border-radius: 16px;
		padding: 2.5rem;
		backdrop-filter: blur(12px);
	}
	.write-header {
		text-align: center;
		margin-bottom: 1.5rem;
	}
	.write-icon {
		font-size: 2.5rem;
		display: block;
		margin-bottom: 0.5rem;
	}
	.write-header h1 {
		font-family: Georgia, serif;
		font-size: 1.8rem;
		font-weight: 300;
		color: #d4b98f;
		margin: 0 0 0.5rem;
	}
	.write-subtitle {
		font-family: Georgia, serif;
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.5);
		font-style: italic;
		margin: 0;
	}
	.write-textarea {
		width: 100%;
		min-height: 140px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 10px;
		padding: 1rem;
		font-family: Georgia, serif;
		font-size: 1rem;
		color: #e5e5e5;
		line-height: 1.6;
		resize: vertical;
		transition: border-color 0.2s;
	}
	.write-textarea:focus {
		outline: none;
		border-color: rgba(201, 168, 124, 0.5);
	}
	.write-error {
		color: #ef4444;
		font-size: 0.85rem;
		margin: 0.75rem 0;
		font-family: Georgia, serif;
	}
	.write-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}
	.materialize-btn {
		padding: 0.9rem 2rem;
		background: linear-gradient(135deg, #c9a87c, #d4b98f);
		color: #05030a;
		border: none;
		border-radius: 999px;
		font-family: Georgia, serif;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.15s, box-shadow 0.15s;
	}
	.materialize-btn:hover {
		transform: scale(1.02);
		box-shadow: 0 4px 20px rgba(201, 168, 124, 0.3);
	}
	.skip-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		font-family: Georgia, serif;
		font-size: 0.9rem;
		cursor: pointer;
		padding: 0.5rem;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.skip-btn:hover {
		color: rgba(255, 255, 255, 0.7);
	}

	/* Loading state */
	.loading-state {
		text-align: center;
		padding: 2rem 0;
	}
	.orbit-loader {
		width: 48px;
		height: 48px;
		margin: 0 auto 1.5rem;
		border: 2px solid rgba(201, 168, 124, 0.2);
		border-top-color: #d4b98f;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	.loading-text {
		font-family: Georgia, serif;
		font-size: 1.1rem;
		color: #d4b98f;
		margin: 0 0 0.25rem;
	}
	.loading-sub {
		font-family: Georgia, serif;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
	}

	@media (max-width: 600px) {
		.write-card { padding: 1.5rem; }
		.write-header h1 { font-size: 1.4rem; }
	}
</style>
