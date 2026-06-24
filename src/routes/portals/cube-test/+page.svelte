<script>
	import { onMount, onDestroy } from 'svelte';
	import { locale } from '$lib/i18n';

	let { data } = $props();

	let containerEl = $state(null);
	let status = $state('Booting...');
	let logs = $state([]);
	let worldRef = null;
	let focusedPortalId = $state(null);

	function log(msg) {
		const ts = new Date().toLocaleTimeString();
		logs = [...logs, `[${ts}] ${msg}`];
		console.log('[portal-tabs]', msg);
	}

	function nameOf(portal) {
		const lang = $locale || 'es';
		if (lang === 'en') return portal.name_en || portal.name_es;
		if (lang === 'fr') return portal.name_fr || portal.name_es;
		return portal.name_es;
	}

	function hexToRgb(hex) {
		const r = parseInt(hex.slice(1, 3), 16) / 255;
		const g = parseInt(hex.slice(3, 5), 16) / 255;
		const b = parseInt(hex.slice(5, 7), 16) / 255;
		return [r, g, b];
	}

	// Track entity refs for interaction
	let tabEntities = [];
	let tabMeshes = [];

	onMount(() => {
		let cancelled = false;

		async function boot() {
			try {
				log('Import @iwsdk/core...');
				const {
					World, Transform,
					AmbientLight, DirectionalLight,
					Mesh, BoxGeometry, MeshStandardMaterial,
					Group, Raycaster, Vector2,
				} = await import('@iwsdk/core');

				if (cancelled || !containerEl) return;

				const world = await World.create(containerEl, {
					render: { defaultLighting: false },
				});
				log('World.create OK');
				worldRef = world;

				// Camera
				world.camera.position.set(0, 0, 3);
				world.camera.lookAt(0, 0, 0);
				log(`Camera fov: ${world.camera.fov}, aspect: ${world.camera.aspect}`);

				// Lights
				world.scene.add(new AmbientLight(0xffffff, 0.9));
				const dir = new DirectionalLight(0xffffff, 0.8);
				dir.position.set(1, 1, 2);
				world.scene.add(dir);

				// ── Calculate visible width at z=0 from camera at z=3 ──
				const distance = 3;
				const vFov = world.camera.fov * Math.PI / 180;
				const aspect = world.camera.aspect;
				const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
				const visibleWidth = visibleHeight * aspect;
				log(`Visible area at z=0: ${visibleWidth.toFixed(2)}w × ${visibleHeight.toFixed(2)}h`);

				// ── Portal Tabs ──
				// Arrange as vertical stack, centered, within portrait FOV
				const portals = data.portals || [];
				log(`Creating ${portals.length} portal tabs...`);

				const TAB_WIDTH = Math.min(0.8, visibleWidth * 0.7);
				const TAB_HEIGHT = 0.15;
				const TAB_GAP = 0.04;
				const totalHeight = portals.length * (TAB_HEIGHT + TAB_GAP) - TAB_GAP;
				const startY = totalHeight / 2 - TAB_HEIGHT / 2;

				tabEntities = [];
				tabMeshes = [];

				portals.forEach((portal, i) => {
					const [r, g, b] = hexToRgb(portal.color_primary || '#c9a87c');

					// Tab mesh — a colored box
					const geo = new BoxGeometry(TAB_WIDTH, TAB_HEIGHT, 0.02);
					const mat = new MeshStandardMaterial({
						color: { r, g, b },
						emissive: { r: r * 0.3, g: g * 0.3, b: b * 0.3 },
						emissiveIntensity: 0.4,
						roughness: 0.5,
						metalness: 0.2,
					});
					const mesh = new Mesh(geo, mat);

					const entity = world.createTransformEntity(mesh);
					const pos = entity.getVectorView(Transform, 'position');
					pos[0] = 0;
					pos[1] = startY - i * (TAB_HEIGHT + TAB_GAP);
					pos[2] = 0;

					// Store portal data on mesh for raycasting
					mesh.userData.portalId = portal.id;
					mesh.userData.portalName = nameOf(portal);
					mesh.userData.restY = pos[1];
					mesh.userData.restX = 0;
					mesh.userData.color = [r, g, b];

					tabEntities.push(entity);
					tabMeshes.push(mesh);

					log(`Tab[${i}] "${nameOf(portal)}" at y=${pos[1].toFixed(2)}`);
				});

				// ── Tap interaction ──
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
						const portalName = hit.userData.portalName;

						// Toggle focus
						if (focusedPortalId === portalId) {
							focusedPortalId = null;
							log(`Unfocused ${portalName}`);
						} else {
							focusedPortalId = portalId;
							log(`Focused ${portalName}`);
						}

						// Update tab positions — focused slides forward, others dim
						tabMeshes.forEach((mesh) => {
							const isFocused = mesh.userData.portalId === focusedPortalId;
							const pos = tabEntities.find(e => e.object3D === mesh).getVectorView(Transform, 'position');
							pos[2] = isFocused ? 0.5 : 0;

							// Scale focused up slightly
							const scale = tabEntities.find(e => e.object3D === mesh).getVectorView(Transform, 'scale');
							const targetScale = isFocused ? 1.1 : 1.0;
							scale[0] = targetScale;
							scale[1] = targetScale;
							scale[2] = targetScale;

							// Dim non-focused
							if (focusedPortalId) {
								mesh.material.opacity = isFocused ? 1.0 : 0.4;
								mesh.material.transparent = true;
								mesh.material.emissiveIntensity = isFocused ? 0.6 : 0.1;
							} else {
								mesh.material.opacity = 1.0;
								mesh.material.transparent = false;
								mesh.material.emissiveIntensity = 0.4;
							}
						});

						// Notify Svelte layer
						window.dispatchEvent(new CustomEvent('portal-focus', {
							detail: { portalId: focusedPortalId }
						}));
					}
				}

				containerEl.addEventListener('click', (e) => handleTap(e.clientX, e.clientY));
				containerEl.addEventListener('touchend', (e) => {
					if (e.changedTouches.length > 0) {
						handleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
					}
				});

				status = `${portals.length} portal tabs ready — tap to focus`;
				log(status);

			} catch (err) {
				log(`ERROR: ${err.message}`);
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

	// Find focused portal for info overlay
	let focusedPortal = $derived(data.portals?.find(p => p.id === focusedPortalId) || null);
</script>

<svelte:head>
	<title>Portals — patrouch.ca</title>
</svelte:head>

<div class="portal-canvas" bind:this={containerEl}></div>

<!-- Info overlay -->
<div class="overlay">
	{#if focusedPortal}
		<div class="portal-info" style="--portal-color: {focusedPortal.color_primary};">
			<span class="portal-icon">{focusedPortal.icon}</span>
			<h2 class="portal-name">{nameOf(focusedPortal)}</h2>
			<a class="portal-enter" href="/portals/enter/{focusedPortal.id}">Entrar →</a>
		</div>
	{:else}
		<p class="hint">Toca un portal para enfocarlo</p>
	{/if}
</div>

<div class="status-panel">
	<p class="status">{status}</p>
	<details>
		<summary>Logs ({logs.length})</summary>
		<pre class="logs">{logs.join('\n')}</pre>
	</details>
</div>

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
		border: 1px solid color-mix(in srgb, var(--portal-color, #c9a87c) 40%, transparent);
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
		color: var(--portal-color, #c9a87c);
		font-size: 1.2rem;
		margin: 0.5rem 0;
	}
	.portal-enter {
		display: inline-block;
		padding: 0.4rem 1.2rem;
		border: 1px solid var(--portal-color, #c9a87c);
		color: var(--portal-color, #c9a87c);
		border-radius: 20px;
		text-decoration: none;
		font-size: 0.85rem;
		font-family: var(--font-heading);
	}
	.hint {
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.8rem;
		margin-top: 0.5rem;
	}

	.status-panel {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 10;
		background: rgba(0, 0, 0, 0.85);
		color: #fff;
		font-family: monospace;
		font-size: 0.75rem;
		padding: 0.5rem;
		max-height: 25vh;
		overflow-y: auto;
	}
	.status {
		font-weight: bold;
		color: #c9a87c;
		margin: 0 0 0.25rem;
	}
	.logs {
		font-size: 0.65rem;
		color: #aaa;
		white-space: pre-wrap;
		word-break: break-all;
		margin: 0;
	}
	details summary {
		cursor: pointer;
		color: #888;
	}
</style>
