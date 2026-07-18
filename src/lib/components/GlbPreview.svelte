<script>
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';

    let { url, height = 200 } = $props();

    let canvas;
    let renderer;
    let scene;
    let camera;
    let controls;
    let animationId;
    let status = $state('loading'); // 'loading' | 'ready' | 'error'
    let errorMessage = $state('');

    onMount(async () => {
        // Dynamic imports — Three.js + OrbitControls reference `document`
        // at module-eval time, which crashes SSR. Only import in the browser.
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        // Store on module-level refs for use in initScene/loadModel
        _THREE = THREE;
        _GLTFLoader = GLTFLoader;
        _OrbitControls = OrbitControls;
        initScene();
        loadModel();
    });

    let _THREE, _GLTFLoader, _OrbitControls;

    onDestroy(() => {
        if (animationId) cancelAnimationFrame(animationId);
        if (controls) controls.dispose();
        if (renderer) renderer.dispose();
    });

    function initScene() {
        const THREE = _THREE;
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a22);

        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(2, 1.5, 3);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(height * 1.5, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);
        const key = new THREE.DirectionalLight(0xffffff, 1.0);
        key.position.set(3, 5, 2);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xc9a87c, 0.4);
        rim.position.set(-3, 2, -2);
        scene.add(rim);

        const grid = new THREE.GridHelper(4, 8, 0x333344, 0x222233);
        grid.position.y = -0.8;
        scene.add(grid);

        controls = new _OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.5;
        controls.minDistance = 1;
        controls.maxDistance = 8;

        animate();
    }

    function animate() {
        animationId = requestAnimationFrame(animate);
        controls?.update();
        renderer.render(scene, camera);
    }

    function loadModel() {
        const THREE = _THREE;
        if (!url) {
            status = 'error';
            errorMessage = 'No file path';
            return;
        }

        const loader = new _GLTFLoader();
        loader.load(
            url,
            (gltf) => {
                const model = gltf.scene;
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);

                const maxDim = Math.max(size.x, size.y, size.z);
                const fitScale = maxDim > 0 ? 1.5 / maxDim : 1;
                model.scale.setScalar(fitScale);

                const box2 = new THREE.Box3().setFromObject(model);
                const center2 = new THREE.Vector3();
                box2.getCenter(center2);
                model.position.sub(center2);

                scene.add(model);
                status = 'ready';
            },
            undefined,
            (err) => {
                console.error('[glb-preview] load error:', err);
                status = 'error';
                errorMessage = err?.message || 'Failed to load GLB';
            }
        );
    }
</script>

{#if browser}
    <div class="glb-preview" style="--preview-height: {height}px;">
        <canvas bind:this={canvas}></canvas>
        {#if status === 'loading'}
            <div class="preview-overlay">
                <div class="spinner"></div>
                <p>Loading 3D model...</p>
            </div>
        {:else if status === 'error'}
            <div class="preview-overlay error">
                <p>⚠️ {errorMessage}</p>
            </div>
        {/if}
        {#if status === 'ready'}
            <div class="preview-hint">🖱️ drag to rotate</div>
        {/if}
    </div>
{:else}
    <div class="glb-preview" style="height: {height}px;">
        <div class="preview-overlay">
            <p>Loading viewer...</p>
        </div>
    </div>
{/if}

<style>
    .glb-preview {
        position: relative;
        border: 1px solid var(--border, #3a3a45);
        border-radius: 8px;
        overflow: hidden;
        background: #1a1a22;
    }
    .glb-preview canvas {
        display: block;
        width: 100%;
        cursor: grab;
    }
    .glb-preview canvas:active {
        cursor: grabbing;
    }
    .preview-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(10, 10, 15, 0.85);
        color: #b8b8c5;
        font-size: 0.85rem;
        gap: 0.5rem;
    }
    .preview-overlay.error {
        color: #ef4444;
    }
    .spinner {
        width: 28px;
        height: 28px;
        border: 3px solid rgba(201, 168, 124, 0.2);
        border-top-color: var(--accent, #d4b98f);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .preview-hint {
        position: absolute;
        bottom: 0.4rem;
        right: 0.6rem;
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.4);
        pointer-events: none;
    }
</style>
