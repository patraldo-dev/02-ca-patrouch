<script>
	import { onMount, onDestroy } from 'svelte';

	let containerEl = $state(null);
	let status = $state('Booting...');
	let logs = $state([]);
	let worldRef = null;

	function log(msg) {
		const ts = new Date().toLocaleTimeString();
		logs = [...logs, `[${ts}] ${msg}`];
		console.log('[cube-test]', msg);
	}

	onMount(() => {
		let cancelled = false;

		async function boot() {
			try {
				log('Dynamic import @iwsdk/core...');
				const { World, SessionMode, Transform } = await import('@iwsdk/core');
				log('Import OK. Creating World...');

				if (cancelled || !containerEl) return;

				// ── Minimal World.create ──
				const world = await World.create(containerEl, {
					render: { defaultLighting: false },
				});
				log('World.create OK');
				worldRef = world;

				if (cancelled) return;

				// ── Camera: look at origin from front ──
				world.camera.position.set(0, 0, 3);
				world.camera.lookAt(0, 0, 0);
				log(`Camera pos: ${world.camera.position.x}, ${world.camera.position.y}, ${world.camera.position.z}`);
				log(`Camera fov: ${world.camera.fov}, aspect: ${world.camera.aspect}`);

				// ── Lights (required for MeshStandardMaterial) ──
				world.scene.add(new THREE.AmbientLight(0xffffff, 1.0));
				const dir = new THREE.DirectionalLight(0xffffff, 1.0);
				dir.position.set(1, 1, 2);
				world.scene.add(dir);
				log('Lights added');

				// ── Test 1: Red cube via createTransformEntity ──
				const { Mesh, BoxGeometry, MeshStandardMaterial } = await import('three');
				const cubeGeo = new BoxGeometry(1, 1, 1);
				const cubeMat = new MeshStandardMaterial({ color: 0xff0000, roughness: 0.4 });
				const cubeMesh = new Mesh(cubeGeo, cubeMat);

				const cubeEntity = world.createTransformEntity(cubeMesh);
				const cubePos = cubeEntity.getVectorView(Transform, 'position');
				cubePos[0] = 0;
				cubePos[1] = 0;
				cubePos[2] = 0;
				log('Red cube entity created at (0,0,0)');

				// Verify it's in the scene graph
				log(`cubeEntity.object3D: ${cubeEntity.object3D ? 'exists' : 'NULL'}`);
				log(`cubeMesh.parent: ${cubeMesh.parent ? cubeMesh.parent.type : 'NULL'}`);
				log(`Scene children: ${world.scene.children.length}`);

				// List all scene children
				world.scene.children.forEach((child, i) => {
					log(`  scene.child[${i}]: ${child.type} "${child.name || ''}" visible=${child.visible}`);
				});

				// ── Test 2: Also add directly to scene (bypass ECS) ──
				const greenCube = new Mesh(
					new BoxGeometry(0.5, 0.5, 0.5),
					new MeshStandardMaterial({ color: 0x00ff00, roughness: 0.4 })
				);
				greenCube.position.set(-2, 0, 0);
				world.scene.add(greenCube);
				log('Green cube added directly to scene at (-2,0,0)');

				// ── Test 3: Blue cube via sceneEntity child ──
				const blueCube = new Mesh(
					new BoxGeometry(0.5, 0.5, 0.5),
					new MeshStandardMaterial({ color: 0x0088ff, roughness: 0.4 })
				);
				blueCube.position.set(2, 0, 0);
				world.sceneEntity.object3D.add(blueCube);
				log('Blue cube added to sceneEntity at (2,0,0)');

				status = 'Ready — should see 3 cubes: red (center), green (left), blue (right)';
				log(status);

			} catch (err) {
				log(`ERROR: ${err.message}`);
				log(`Stack: ${err.stack?.split('\n').slice(0,3).join(' | ')}`);
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
</script>

<svelte:head>
	<title>Cube Test — IWSDK</title>
</svelte:head>

<div class="test-container" bind:this={containerEl}></div>

<div class="status-panel">
	<p class="status">{status}</p>
	<details>
		<summary>Logs ({logs.length})</summary>
		<pre class="logs">{logs.join('\n')}</pre>
	</details>
</div>

<style>
	.test-container {
		position: fixed;
		inset: 0;
		z-index: 0;
	}
	.test-container :global(canvas) {
		width: 100% !important;
		height: 100% !important;
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
		padding: 0.75rem;
		max-height: 40vh;
		overflow-y: auto;
	}
	.status {
		font-weight: bold;
		color: #c9a87c;
		margin: 0 0 0.5rem;
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
