<!--
	/portals/grab-demo — A collectible demo scene. 30 GLBs scattered
	around a space (10 each of spirit, hombre-amarillo, mujer-musa).
	Walk with WASD, look with mouse, click to grab/collect. Counter
	tracks how many you've collected. Proves the grab system end-to-end.
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let container;
	let counter = $state(0);
	let total = 30;
	let booted = $state(false);

	const MODELS = [
		{ url: '/api/assets/models/spirit.glb', count: 10, label: 'Spirit' },
		{ url: '/api/assets/models/hombre-amarillo.glb', count: 10, label: 'Hombre Amarillo' },
		{ url: '/api/assets/models/antoine/mujer-musa.glb', count: 10, label: 'Mujer Musa' },
	];

	let cleanup = null;

	onMount(async () => {
		if (!browser || !container) return;

		const THREE = await import('three');
		const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

		// ── Scene setup ──
		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0a0a12);
		scene.fog = new THREE.Fog(0x0a0a12, 8, 30);

		const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 100);
		camera.position.set(0, 1.6, 5);

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		container.appendChild(renderer.domElement);

		// Lighting
		scene.add(new THREE.AmbientLight(0x8888aa, 0.5));
		const key = new THREE.DirectionalLight(0xc9a87c, 0.8);
		key.position.set(5, 10, 5);
		scene.add(key);
		const rim = new THREE.DirectionalLight(0x4fc3f7, 0.3);
		rim.position.set(-5, 3, -5);
		scene.add(rim);

		// Ground
		const ground = new THREE.Mesh(
			new THREE.PlaneGeometry(50, 50),
			new THREE.MeshStandardMaterial({ color: 0x1a1a28, roughness: 0.9 })
		);
		ground.rotation.x = -Math.PI / 2;
		scene.add(ground);

		// Grid for spatial reference
		const grid = new THREE.GridHelper(50, 25, 0x333355, 0x222233);
		scene.add(grid);

		// ── Load all 3 models, then scatter 10 copies of each ──
		const loader = new GLTFLoader();
		const collectibles = [];
		const templates = await Promise.all(
			MODELS.map(
				(m) =>
					new Promise((resolve) => {
						loader.load(m.url, (gltf) => {
							// Configure materials
							gltf.scene.traverse((child) => {
								if (child.isMesh && child.material) {
									child.material.transparent = true;
									child.material.opacity = 0.9;
									child.material.depthWrite = true;
									child.material.side = THREE.DoubleSide;
								}
							});
							resolve(gltf.scene);
						});
					})
			)
		);

		// Scatter 10 of each
		for (let mi = 0; mi < templates.length; mi++) {
			const template = templates[mi];
			for (let i = 0; i < MODELS[mi].count; i++) {
				const clone = template.clone(true);

				// Normalize scale to ~1.2 height
				const box = new THREE.Box3().setFromObject(clone);
				const size = new THREE.Vector3();
				box.getSize(size);
				if (size.y > 0) clone.scale.setScalar(1.2 / size.y);

				// Recenter
				const box2 = new THREE.Box3().setFromObject(clone);
				const center = new THREE.Vector3();
				box2.getCenter(center);
				clone.position.sub(center);

				// Random position in a ring around the player
				const angle = Math.random() * Math.PI * 2;
				const radius = 3 + Math.random() * 10;
				const group = new THREE.Group();
				group.add(clone);
				group.position.set(
					Math.cos(angle) * radius,
					0.6,
					Math.sin(angle) * radius
				);
				group.rotation.y = Math.random() * Math.PI * 2;
				group.userData.collected = false;
				group.userData.spin = Math.random() * 0.5 + 0.3;
				group.userData.bobPhase = Math.random() * Math.PI * 2;

				scene.add(group);
				collectibles.push(group);
			}
		}

		// ── Interaction: raycast on click to collect ──
		const raycaster = new THREE.Raycaster();
		const pointer = new THREE.Vector2();
		const mouse = { x: 0, y: 0 };
		let yaw = 0;
		let pitch = 0;
		const keys = {};

		const onKeyDown = (e) => {
			keys[e.code] = true;
			if (e.code === 'Escape') {
				camera.position.set(0, 1.6, 5);
				yaw = 0;
				pitch = 0;
			}
		};
		const onKeyUp = (e) => { keys[e.code] = false; };

		let lookActive = false;
		const onMouseDown = (e) => {
			lookActive = true;
			mouse.startX = e.clientX;
			mouse.startY = e.clientY;
			mouse.moved = false;
		};
		const onMouseUp = (e) => {
			if (lookActive && !mouse.moved) {
				// It was a click — try to collect
				collectAt(e.clientX, e.clientY);
			}
			lookActive = false;
		};
		const onMouseMove = (e) => {
			if (lookActive && e.buttons > 0) {
				if (Math.abs(e.clientX - mouse.startX) > 5 || Math.abs(e.clientY - mouse.startY) > 5) {
					mouse.moved = true;
				}
				if (mouse.moved) {
					yaw -= e.movementX * 0.003;
					pitch -= e.movementY * 0.003;
					pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
				}
			}
			pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
			pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
		};

		function collectAt(clientX, clientY) {
			pointer.x = (clientX / window.innerWidth) * 2 - 1;
			pointer.y = -(clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(pointer, camera);
			const hits = raycaster.intersectObjects(collectibles, true);
			if (hits.length > 0) {
				let target = hits[0].object;
				while (target && !target.userData.collected && !collectibles.includes(target)) {
					target = target.parent;
				}
				if (target && !target.userData.collected && collectibles.includes(target)) {
					// Collect: mark + animate away
					target.userData.collected = true;
					target.userData.collectTime = performance.now();
					counter++;
				}
			}
		}

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		renderer.domElement.addEventListener('mousedown', onMouseDown);
		window.addEventListener('mouseup', onMouseUp);
		window.addEventListener('mousemove', onMouseMove);

		// ── Touch support ──
		let touchStart = null;
		const onTouchStart = (e) => {
			const t = e.touches[0];
			touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
		};
		const onTouchEnd = (e) => {
			if (touchStart && Date.now() - touchStart.time < 300) {
				collectAt(touchStart.x, touchStart.y);
			}
			touchStart = null;
		};
		renderer.domElement.addEventListener('touchstart', onTouchStart);
		renderer.domElement.addEventListener('touchend', onTouchEnd);

		// ── Resize ──
		const onResize = () => {
			camera.aspect = container.clientWidth / container.clientHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(container.clientWidth, container.clientHeight);
		};
		window.addEventListener('resize', onResize);

		// ── Animation loop ──
		let animationId;
		let collectedToRemove = [];
		const moveDir = new THREE.Vector3();

		function animate() {
			animationId = requestAnimationFrame(animate);
			const t = performance.now() / 1000;

			// Apply look
			camera.rotation.order = 'YXZ';
			camera.rotation.y = yaw;
			camera.rotation.x = pitch;

			// WASD movement
			moveDir.set(0, 0, 0);
			if (keys['KeyW'] || keys['ArrowUp']) moveDir.z -= 1;
			if (keys['KeyS'] || keys['ArrowDown']) moveDir.z += 1;
			if (keys['KeyA'] || keys['ArrowLeft']) moveDir.x -= 1;
			if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;
			if (moveDir.lengthSq() > 0) {
				moveDir.normalize().applyEuler(new THREE.Euler(0, yaw, 0));
				camera.position.x += moveDir.x * 3 * 0.016;
				camera.position.z += moveDir.z * 3 * 0.016;
				camera.position.y = 1.6;
			}

			// Animate collectibles: spin + bob
			for (const c of collectibles) {
				if (c.userData.collected) {
					// Shrink + fade away
					const elapsed = (performance.now() - c.userData.collectTime) / 300;
					if (elapsed >= 1) {
						scene.remove(c);
						collectedToRemove.push(c);
					} else {
						c.scale.setScalar(Math.max(0, 1 - elapsed));
						c.position.y += 0.05;
						c.rotation.y += 0.2;
					}
				} else {
					// Gentle spin + bob
					c.rotation.y += c.userData.spin * 0.016;
					c.children[0].position.y = Math.sin(t * 2 + c.userData.bobPhase) * 0.1;
				}
			}
			// Clean up fully collected
			while (collectedToRemove.length) {
				const c = collectedToRemove.pop();
				const idx = collectibles.indexOf(c);
				if (idx >= 0) collectibles.splice(idx, 1);
			}

			renderer.render(scene, camera);
		}
		animate();
		booted = true;

		// Cleanup
		cleanup = () => {
			cancelAnimationFrame(animationId);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('mouseup', onMouseUp);
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('resize', onResize);
			renderer.domElement.removeEventListener('mousedown', onMouseDown);
			renderer.domElement.removeEventListener('touchstart', onTouchStart);
			renderer.domElement.removeEventListener('touchend', onTouchEnd);
			renderer.dispose();
			if (container.contains(renderer.domElement)) {
				container.removeChild(renderer.domElement);
			}
		};
	});

	onDestroy(() => {
		if (cleanup) cleanup();
	});
</script>

<svelte:head>
	<title>Grab Demo — Collect 30</title>
</svelte:head>

<div class="demo-page" class:booted>
	<div class="canvas-container" bind:this={container}></div>

	{#if booted}
		<div class="hud">
			<div class="counter" class:complete={counter === total}>
				<span class="count">{counter}</span>
				<span class="total">/ {total}</span>
			</div>
			{#if counter === total}
				<div class="complete-msg">🎉 All collected!</div>
			{/if}
		</div>

		<div class="instructions">
			<p><strong>WASD</strong> to move · <strong>Mouse drag</strong> to look · <strong>Click</strong> an object to collect</p>
			<p class="models-loaded">3 models × 10 = 30 collectibles scattered around you</p>
		</div>
	{/if}
</div>

<style>
	.demo-page {
		position: fixed;
		inset: 0;
		background: #0a0a12;
		overflow: hidden;
	}
	.canvas-container {
		width: 100%;
		height: 100%;
		cursor: crosshair;
	}
	.canvas-container :global(canvas) {
		display: block;
	}

	.hud {
		position: fixed;
		top: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		text-align: center;
		pointer-events: none;
	}
	.counter {
		background: rgba(10, 10, 20, 0.8);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(201, 168, 124, 0.3);
		border-radius: 16px;
		padding: 0.6rem 1.5rem;
		display: inline-flex;
		align-items: baseline;
		gap: 0.3rem;
	}
	.counter.complete {
		border-color: #8fbc8f;
	}
	.count {
		font-size: 1.8rem;
		font-weight: 800;
		color: #c9a87c;
	}
	.counter.complete .count {
		color: #8fbc8f;
	}
	.total {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.5);
	}
	.complete-msg {
		margin-top: 0.5rem;
		font-size: 1.2rem;
		animation: pulse 1s ease-in-out infinite alternate;
	}
	@keyframes pulse {
		from { opacity: 0.7; }
		to { opacity: 1; }
	}

	.instructions {
		position: fixed;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		text-align: center;
		pointer-events: none;
		background: rgba(10, 10, 20, 0.7);
		backdrop-filter: blur(8px);
		padding: 0.5rem 1.2rem;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}
	.instructions p {
		margin: 0;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
	}
	.models-loaded {
		font-size: 0.7rem !important;
		opacity: 0.6;
	}
</style>
