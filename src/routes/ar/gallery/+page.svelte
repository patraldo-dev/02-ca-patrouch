<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  const CF_HASH = '4bRSwPonOXfEIBVZiDXg0w';

  const ARTWORKS = [
    { id: 'f8a136eb-363e-4a24-0f54-70bb4f4bf800', title: 'Mujer' },
    { id: '26fe40df-7745-41dc-7491-97cb36a32f00', title: 'Blue Alien King' },
    { id: '75b29e1a-2d22-4ef7-af19-2f7e3828bd00', title: 'Green Alien King' },
    { id: '65dfe0b8-5b3f-4501-a3ee-c99d301a1800', title: 'Yellow Alien King' },
    { id: 'd4969f09-777d-46a4-f167-db56837e5300', title: 'Brown Alien King' },
  ];

  function segmentUrl(imageId, width = 512) {
    return `https://imagedelivery.net/${CF_HASH}/${imageId}/segment=foreground,width=${width}`;
  }

  let container;
  let THREE;
  let scene, camera, renderer;
  let meshes = [];
  let animationId;
  let mouseX = 0, mouseY = 0;

  // Orbit angles for each artwork — spread them in a spiral
  const placements = ARTWORKS.map((_, i) => ({
    angle: (i / ARTWORKS.length) * Math.PI * 2,
    radius: 3 + i * 0.6,
    y: -0.5 + i * 0.5,
    rotSpeed: 0.001 + Math.random() * 0.002,
    bobSpeed: 0.5 + Math.random() * 0.5,
    bobAmp: 0.1 + Math.random() * 0.15,
    baseY: -0.5 + i * 0.5,
  }));

  onMount(async () => {
    if (!browser) return;

    THREE = await import('three');

    scene = new THREE.Scene();

    // Dark space background
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.Fog(0x09090b, 8, 20);

    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1, 6);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Subtle ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // Point lights for depth
    const pointLight1 = new THREE.PointLight(0xc9a87c, 1.5, 15);
    pointLight1.position.set(3, 3, 3);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x6b8aff, 0.8, 15);
    pointLight2.position.set(-3, 2, -2);
    scene.add(pointLight2);

    // Subtle floor grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x222222, 0x111111);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // Load textures
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    for (let i = 0; i < ARTWORKS.length; i++) {
      const artwork = ARTWORKS[i];
      const url = segmentUrl(artwork.id, 512);
      const placement = placements[i];

      loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          const aspect = texture.image.height / texture.image.width;
          const planeH = 2 * aspect;
          const geometry = new THREE.PlaneGeometry(2, planeH);
          const material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            roughness: 0.8,
            metalness: 0.1,
            alphaTest: 0.01,
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(
            Math.cos(placement.angle) * placement.radius,
            placement.y,
            Math.sin(placement.angle) * placement.radius
          );
          // Face toward center
          mesh.lookAt(0, mesh.position.y, 0);
          mesh.userData = { index: i, title: artwork.title, ...placement };

          scene.add(mesh);
          meshes.push(mesh);
        },
        undefined,
        (err) => console.error(`Failed to load ${artwork.title}:`, err)
      );
    }

    // Mouse parallax
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    animate();
  });

  function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function onResize() {
    if (!camera || !renderer || !container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function animate() {
    if (!browser) return;
    animationId = requestAnimationFrame(animate);

    const time = performance.now() * 0.001;

    // Gentle camera sway following mouse
    if (camera) {
      camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.02;
      camera.position.y += (1 - mouseY * 0.5 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);
    }

    // Animate each mesh
    for (const mesh of meshes) {
      const d = mesh.userData;
      // Gentle bob up/down
      mesh.position.y = d.baseY + Math.sin(time * d.bobSpeed) * d.bobAmp;
      // Slow rotation
      mesh.rotation.y += d.rotSpeed;
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    if (browser) {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
    }
    if (renderer) renderer.dispose();
    for (const m of meshes) {
      m.geometry?.dispose();
      m.material?.dispose();
    }
  });
</script>

<svelte:head>
  <title>Galería Flotante — Antoine</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
</svelte:head>

<div class="gallery-page">
  <div class="overlay">
    <h1>Galería Flotante</h1>
    <p>Obras de Antoine Patraldo — fondo removido con CF Workers AI</p>
    <p class="hint">Mueve el ratón para explorar</p>
  </div>
  <div class="canvas-wrap" bind:this={container}></div>
</div>

<style>
  .gallery-page {
    width: 100vw;
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    overflow: hidden;
    background: #09090b;
  }

  .canvas-wrap {
    width: 100%;
    height: 100%;
  }

  .overlay {
    position: absolute;
    top: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    z-index: 10;
    pointer-events: none;
    color: #e0d5c5;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .overlay h1 {
    font-family: 'Playfair Display', serif;
    font-size: 1.6rem;
    font-weight: 600;
    margin: 0 0 0.25rem;
    letter-spacing: 0.02em;
  }

  .overlay p {
    margin: 0;
    font-size: 0.85rem;
    opacity: 0.7;
  }

  .hint {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    opacity: 0.4;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.7; }
  }

  :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
</style>
