<script>
	import { onMount, onDestroy } from 'svelte';
	import { locale } from '$lib/i18n';

	let { data } = $props();

	let containerEl = $state(null);
	let status = $state('Booting...');
	let worldRef = null;
	let focusedPortalId = $state(null);
	let bootError = $state(null);

	function nameOf(portal) {
		const lang = $locale || 'es';
		if (lang === 'en') return portal.name_en || portal.name_es;
		if (lang === 'fr') return portal.name_fr || portal.name_es;
		return portal.name_es;
	}

	let tabEntities = [];
	let tabMeshes = [];

	onMount(() => {
		let cancelled = false;

		async function boot() {
			try {
				const {
					World, Transform,
					Mesh, BoxGeometry, MeshBasicMaterial, Color,
					Raycaster, Vector2,
				} = await import('@iwsdk/core');

				if (cancelled || !containerEl) return;

				const world = await World.create(containerEl, {
					render: { defaultLighting: false },
				});
				worldRef = world;

				world.camera.position.set(0, 0, 3);
				world.camera.lookAt(0, 0, 0);

				const distance = 3;
				const vFov = world.camera.fov * Math.PI / 180;
				const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
				const visibleWidth = visibleHeight * world.camera.aspect;

				const portals = data.portals || [];

				const TAB_WIDTH = Math.min(0.8, visibleWidth * 0.7);
				const TAB_HEIGHT = 0.15;
				const TAB_GAP = 0.04;
				const totalHeight = portals.length * (TAB_HEIGHT + TAB_GAP) - TAB_GAP;
				const startY = totalHeight / 2 - TAB_HEIGHT / 2;

				tabEntities = [];
				tabMeshes = [];

				portals.forEach((portal, i) => {
					const colorHex = portal.color_primary || '#c9a87c';
					const geo = new BoxGeometry(TAB_WIDTH, TAB_HEIGHT, 0.02);
					const mat = new MeshBasicMaterial({ color: new Color(colorHex) });
					const mesh = new Mesh(geo, mat);

					const entity = world.createTransformEntity(mesh);
					const pos = entity.getVectorView(Transform, 'position');
					pos[0] = 0;
					pos[1] = startY - i * (TAB_HEIGHT + TAB_GAP);
					pos[2] = 0;

					mesh.userData.portalId = portal.id;
					mesh.userData.portalName = nameOf(portal);

					tabEntities.push(entity);
					tabMeshes.push(mesh);
				});

				// Tap interaction
				const raycaster = new Raycaster();
				const pointer = new Vector2();

				function handleTap(clientX, clientY) {
					const rect = containerEl.getBoundingClientRect();
					pointer.x = (clientX - rect.left) / rect.width * 2 - 1;
					pointer.y = -((clientY - rect.top) / rect.height * 2 - 1);
					raycaster.setFromCamera(pointer, world.camera);

					const intersects = raycaster.intersectObjects(tabMeshes);
					if (intersects.length > 0) {
						const hit = intersects[0].object;
						const portalId = hit.userData.portalId;

						focusedPortalId = focusedPortalId === portalId ? null : portalId;

						tabMeshes.forEach((mesh) => {
							const isFocused = mesh.userData.portalId === focusedPortalId;
							const entity = tabEntities.find(e => e.object3D === mesh);
							const pos = entity.getVectorView(Transform, 'position');
							pos[2] = isFocused ? 0.5 : 0;

							const scale = entity.getVectorView(Transform, 'scale');
							const s = isFocused ? 1.15 : 1.0;
							scale[0] = s; scale[1] = s; scale[2] = s;

							if (focusedPortalId) {
								mesh.material.opacity = isFocused ? 1.0 : 0.3;
								mesh.material.transparent = true;
							} else {
								mesh.material.opacity = 1.0;
								mesh.material.transparent = false;
							}
						});
					}
				}

				containerEl.addEventListener('click', (e) => handleTap(e.clientX, e.clientY));
				containerEl.addEventListener('touchend', (e) => {
					if (e.changedTouches.length > 0) {
						handleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
					}
				});

				status = `${portals.length} portals — tap to focus`;
			} catch (err) {
				console.error('[portals] Boot failed:', err);
				bootError = err.message;
				status = `Failed: ${err.message}`;
			}
		}

		boot();
		return () => { cancelled = true; };
	});

	onDestroy(() => {
		if (worldRef?.renderer) {
			worldRef.renderer.dispose();
			worldRef.renderer.domElement?.remove();
		}
	});

	let focusedPortal = $derived(data.portals?.find(p => p.id === focusedPortalId) || null);
</script>

<svelte:head>
	<title>Portales — patrouch.ca</title>
</svelte:head>

<div class="portal-canvas" bind:this={containerEl}></div>

<!-- Fallback: if IWSDK fails, show DOM list -->
{#if bootError}
	<div class="fallback">
		{#each data.portals as portal}
			<a class="fallback-tab" href="/portals/enter/{portal.id}" style="--c: {portal.color_primary}">
				<span>{portal.icon}</span>
				<span>{nameOf(portal)}</span>
				<span>→</span>
			</a>
		{/each}
	</div>
{:else}
	<div class="overlay">
		{#if focusedPortal}
			<div class="portal-info" style="--pc: {focusedPortal.color_primary};">
				<span class="portal-icon">{focusedPortal.icon}</span>
				<h2 class="portal-name">{nameOf(focusedPortal)}</h2>
				<a class="portal-enter" href="/portals/enter/{focusedPortal.id}">Entrar →</a>
			</div>
		{:else}
			<p class="hint">Toca un portal</p>
		{/if}
	</div>
{/if}

<style>
	.portal-canvas {
		position: fixed;
		inset: 0;
		z-index: 0;
	}
	.portal-canvas :global(canvas) {
		width: 100% !important;
		height: 100% !important;
	}

	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 5;
		pointer-events: none;
		padding: 1rem;
	}
	.overlay > * { pointer-events: auto; }

	.portal-info {
		text-align: center;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(12px);
		border: 1px solid color-mix(in srgb, var(--pc, #c9a87c) 40%, transparent);
		border-radius: 16px;
		padding: 1rem 1.5rem;
		max-width: 400px;
		margin: 0 auto;
		animation: slide-down 0.3s ease;
	}
	@keyframes slide-down {
		from { opacity: 0; transform: translateY(-20px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.portal-icon { font-size: 2rem; }
	.portal-name {
		font-family: var(--font-heading);
		color: var(--pc, #c9a87c);
		font-size: 1.2rem;
		margin: 0.5rem 0;
	}
	.portal-enter {
		display: inline-block;
		padding: 0.4rem 1.2rem;
		border: 1px solid var(--pc, #c9a87c);
		color: var(--pc, #c9a87c);
		border-radius: 20px;
		text-decoration: none;
		font-size: 0.85rem;
		font-family: var(--font-heading);
	}
	.hint {
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.8rem;
	}

	.fallback {
		position: relative;
		z-index: 2;
		max-width: 600px;
		margin: 2rem auto;
		padding: 0 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.fallback-tab {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-left: 3px solid var(--c, #c9a87c);
		border-radius: 12px;
		text-decoration: none;
		color: var(--fg);
		font-family: var(--font-heading);
	}
	.fallback-tab:hover {
		background: color-mix(in srgb, var(--c, #c9a87c) 8%, var(--surface));
	}
</style>
