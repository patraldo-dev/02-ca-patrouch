// @ts-nocheck — IWSDK/Three.js dynamic scene code
// ═══════════════════════════════════════════════════════════
//  grab-system.js
//  Reach toward an object, squeeze/click to grab, move it around,
//  release to drop. Works for scene elements (figures, quadrupeds,
//  structures) tagged with userData.grabbable.
//
//  Inspired by Flowerbed's mode-driven interaction, but simpler:
//  - No mode switching — grab is always available alongside navigation
//  - XR: right controller trigger (index) = grab/release toggle
//  - Desktop: left-click-hold on an object = grab, release = drop
//
//  While grabbed, the object follows the controller/cursor position.
//  Hover (pointing at without grabbing) highlights the object's outline.
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';

const RAY_LENGTH = 8;
const GRAB_DISTANCE = 3.5;     // max distance to grab (closer than nav)
const HIGHLIGHT_EMISSVE = 0.4; // glow intensity on hover

// Preallocated temporaries
const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _forward = new THREE.Vector3(0, 0, -1);
const _pointer = new THREE.Vector2();

/**
 * GrabSystem — manages hover detection, grab/hold/release for grabbable
 * objects. Created once per scene. Reads from world._grabbables (the
 * array exposed by buildSceneElements + any other tagged meshes).
 */
export class GrabSystem {
    constructor(scene) {
        this.scene = scene;
        this.grabbables = [];       // THREE.Object3D[] — objects that can be grabbed
        this.hovered = null;        // currently-pointed-at object
        this.grabbed = null;        // currently-held object
        this._raycaster = new THREE.Raycaster();
        this._raycaster.far = GRAB_DISTANCE;

        // The "hand" that holds a grabbed object — a Group we move to
        // follow the controller/cursor, parented to the scene.
        this._handGroup = new THREE.Group();
        scene.add(this._handGroup);

        // Desktop grab state
        this._mouseDown = false;
        this._desktop = typeof window !== 'undefined';

        // Store original materials for hover highlight restore
        this._originalMaterials = new WeakMap();
    }

    /**
     * Set the list of grabbable objects (called by world-builder after
     * scene build). Also picks up revelation gateways that are tagged.
     */
    setGrabbables(objects) {
        this.grabbables = objects || [];
    }

    /**
     * Add a single object to the grabbable set at runtime (e.g. when
     * a GLB async-swaps into a scene element).
     */
    addGrabbable(obj) {
        if (obj && !this.grabbables.includes(obj)) {
            this.grabbables.push(obj);
        }
    }

    // ── Hover highlight ──
    _setHovered(obj) {
        if (this.hovered === obj) return;
        // Un-highlight previous
        if (this.hovered) {
            this._restoreMaterial(this.hovered);
        }
        this.hovered = obj;
        if (obj) {
            this._highlight(obj);
        }
    }

    _highlight(obj) {
        obj.traverse((child) => {
            if (child.isMesh && child.material) {
                if (!this._originalMaterials.has(child)) {
                    this._originalMaterials.set(child, {
                        opacity: child.material.opacity,
                    });
                }
                // Boost opacity for a glow effect
                if (child.material.transparent) {
                    child.material.opacity = Math.min(1, (child.material.opacity || 0.7) + 0.3);
                }
            }
        });
    }

    _restoreMaterial(obj) {
        obj.traverse((child) => {
            if (child.isMesh && child.material && this._originalMaterials.has(child)) {
                const orig = this._originalMaterials.get(child);
                child.material.opacity = orig.opacity;
            }
        });
    }

    /**
     * Grab an object: detach from scene, attach to hand group so it
     * follows the controller/cursor.
     */
    _grab(obj, worldPos) {
        if (this.grabbed) this._release(); // drop current first
        this.grabbed = obj;

        // Store world position, reparent to hand
        const worldMatrix = obj.matrixWorld.clone();
        this._handGroup.attach(obj);
        // Position the hand at the grab point
        this._handGroup.position.copy(worldPos);

        // Scale down slightly for "held in hand" feel
        obj.scale.multiplyScalar(0.9);
    }

    /**
     * Release: reparent back to scene, restore scale.
     */
    _release() {
        if (!this.grabbed) return;
        const obj = this.grabbed;
        // Restore to scene at current world position
        this.scene.attach(obj);
        obj.scale.multiplyScalar(1 / 0.9); // restore scale
        this.grabbed = null;
    }

    /**
     * Cast a ray and return the first grabbable hit, or null.
     * @param {THREE.Vector3} origin
     * @param {THREE.Vector3} direction
     */
    _raycastGrab(origin, direction) {
        this._raycaster.set(origin, direction);
        const hits = this._raycaster.intersectObjects(this.grabbables, true);
        if (hits.length === 0) return null;
        // Walk up to find the grabbable root
        let target = hits[0].object;
        while (target && !target.userData?.grabbable) {
            target = target.parent;
        }
        return target || null;
    }

    /**
     * Update: detect hover + handle grab state.
     *
     * For XR: called with controller ray origin + direction + trigger state.
     * For desktop: called with camera + pointer NDC + mouse state.
     *
     * @param {object} opts
     *   XR:  { controllerOrigin: Vector3, controllerDir: Vector3, triggerHeld: bool }
     *   Desktop: { camera, pointerNDC: {x,y}, mouseHeld: bool }
     */
    update(opts = {}) {
        let hit = null;
        let grabPoint = null;

        if (opts.controllerOrigin && opts.controllerDir) {
            // XR path
            hit = this._raycastGrab(opts.controllerOrigin, opts.controllerDir);
            if (hit) grabPoint = opts.controllerOrigin.clone()
                .add(opts.controllerDir.clone().multiplyScalar(this._raycastDistance || 2));
        } else if (opts.camera && opts.pointerNDC) {
            // Desktop path
            this._raycaster.setFromCamera(opts.pointerNDC, opts.camera);
            this._raycaster.far = GRAB_DISTANCE;
            const hits = this._raycaster.intersectObjects(this.grabbables, true);
            if (hits.length > 0) {
                let target = hits[0].object;
                while (target && !target.userData?.grabbable) target = target.parent;
                hit = target;
                grabPoint = hits[0].point;
            }
        }

        // Hover detection (only when not already grabbing)
        if (!this.grabbed) {
            this._setHovered(hit);
        }

        // Grab/release logic
        if (opts.triggerHeld || opts.mouseHeld) {
            if (!this.grabbed && hit && grabPoint) {
                this._grab(hit, grabPoint);
            }
            // While held, move the hand to follow the ray point
            if (this.grabbed && grabPoint) {
                this._handGroup.position.lerp(grabPoint, 0.3);
            }
        } else {
            if (this.grabbed) {
                this._release();
            }
        }
    }

    dispose() {
        if (this.grabbed) this._release();
        if (this.hovered) this._restoreMaterial(this.hovered);
        this.scene.remove(this._handGroup);
    }
}
