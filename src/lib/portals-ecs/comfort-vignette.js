// @ts-nocheck — IWSDK/Three.js dynamic scene code
// ═══════════════════════════════════════════════════════════
//  comfort-vignette.js
//  A tunnel-vision comfort effect for VR locomotion, inspired by
//  Project Flowerbed's LocomotionVignetteSystem.
//
//  How it works: a small open-ended cylinder (tube) is parented to
//  the camera, rendered with no depth test so it always draws on top.
//  Its inner surface has a gradient texture: opaque black at the near
//  edge, fading to transparent. When the player moves, the tube is
//  pulled closer to the camera (narrowing the FOV); when still, it's
//  pushed away (full FOV). The effect is continuous — more movement
//  speed = more vignette = less motion sickness.
//
//  This applies to both desktop and XR. On desktop it's subtle (screen
//  edge darkening); in VR it's the classic "blinders" comfort effect.
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';

// ── Constants (from Flowerbed, lightly tuned) ──
const TUBE_RADIUS = 0.2;        // cylinder radius (meters in VR, subtle on desktop)
const TUBE_LENGTH = 0.4;        // cylinder depth
const TUBE_SEGMENTS = 32;       // radial smoothness
const TEXTURE_SIZE = 64;        // canvas texture resolution (vertical gradient)
const GRADIENT_START = 0.3;     // where black starts fading (0=bottom, 1=top)
const MAX_DEPLOY_THRESHOLD = 0.9; // stick magnitude at full vignette
const SNAP_VIGNETTE_BOOST = 0.6;  // vignette intensity during snap turn / teleport

/**
 * ComfortVignette — creates and manages the tunnel-vision effect.
 *
 * Usage: construct with a camera, call update(speedFactor) each frame
 * where speedFactor is the normalized movement intensity (0 = still,
 * 1 = full speed). The vignette fades in/out continuously.
 */
export class ComfortVignette {
    constructor(camera) {
        this.camera = camera;
        this._deployment = 0;     // current 0..1 (smoothed)
        this._targetDeployment = 0;
        this._enabled = true;

        // ── Build the gradient texture on a canvas ──
        const canvas = document.createElement('canvas');
        canvas.width = TEXTURE_SIZE;
        canvas.height = TEXTURE_SIZE;
        const ctx = canvas.getContext('2d');

        // Vertical gradient: opaque black at bottom → transparent at top
        const gradient = ctx.createLinearGradient(0, TEXTURE_SIZE, 0, 0);
        gradient.addColorStop(0, '#000000ff');           // bottom: solid black
        gradient.addColorStop(GRADIENT_START, '#000000ff'); // still solid
        gradient.addColorStop(0.7, '#00000088');          // fading
        gradient.addColorStop(0.9, '#00000000');          // top: transparent

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

        this._texture = new THREE.CanvasTexture(canvas);
        this._texture.needsUpdate = true;

        // ── Build the tube mesh ──
        // Open-ended cylinder (openEnded=true), BackSide so we see the
        // interior surface from inside.
        const geo = new THREE.CylinderGeometry(
            TUBE_RADIUS, TUBE_RADIUS, TUBE_LENGTH, TUBE_SEGMENTS, 1, true
        );
        const mat = new THREE.MeshBasicMaterial({
            map: this._texture,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.85,
            depthTest: false,      // always render on top
            depthWrite: false,
            fog: false,
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.renderOrder = 1000; // draw last
        this.mesh.frustumCulled = false;
        this.mesh.visible = false;    // hidden until movement

        // Orient: cylinder axis is Y by default; rotate so axis points
        // along -Z (into the screen / forward from camera).
        this.mesh.rotation.x = Math.PI / 2;

        // Parent to camera so it tracks head movement
        if (camera) {
            camera.add(this.mesh);
        }
    }

    /**
     * Set whether the vignette is enabled at all (user comfort setting).
     */
    setEnabled(enabled) {
        this._enabled = enabled;
        if (!enabled) {
            this.mesh.visible = false;
            this._deployment = 0;
            this._targetDeployment = 0;
        }
    }

    /**
     * Update the vignette. Call every frame.
     *
     * @param {number} speedFactor — movement intensity 0..1
     *   (left stick magnitude, or 1.0 during snap turn/teleport)
     */
    update(speedFactor = 0) {
        if (!this._enabled) return;

        // Target deployment: proportional to speed, clamped
        this._targetDeployment = Math.min(1, speedFactor / MAX_DEPLOY_THRESHOLD);

        // Smooth the deployment (lerp toward target)
        const SMOOTH = 0.15; // higher = faster transition
        this._deployment += (this._targetDeployment - this._deployment) * SMOOTH;

        // Position the tube: at full deployment, pull it close (narrow FOV);
        // at zero deployment, push it away (no occlusion)
        const z = (1 - this._deployment) * TUBE_LENGTH - TUBE_LENGTH / 2;
        this.mesh.position.set(0, 0, z);

        // Fade opacity slightly with deployment so it's invisible when still
        const opacity = this._deployment > 0.01 ? 0.85 : 0;
        this.mesh.material.opacity = opacity;
        this.mesh.visible = this._deployment > 0.01;
    }

    /**
     * Quick boost for discrete events (snap turn, teleport engage).
     * Sets the deployment high for a brief moment, then it fades back.
     */
    pulse(intensity = SNAP_VIGNETTE_BOOST) {
        if (!this._enabled) return;
        this._deployment = Math.max(this._deployment, intensity);
    }

    dispose() {
        if (this.camera) {
            this.camera.remove(this.mesh);
        }
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this._texture.dispose();
    }
}
