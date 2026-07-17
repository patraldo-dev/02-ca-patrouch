// @ts-nocheck — IWSDK/Three.js dynamic scene code
// ═══════════════════════════════════════════════════════════
//  teleport-system.js
//  Parabolic-ray teleportation, inspired by Project Flowerbed.
//
//  How it works:
//  1. The player pushes forward on the right stick (XR) or holds a
//     teleport key (desktop). A parabolic ray launches from their
//     hand/camera in the direction they're facing.
//  2. The ray arcs with gravity (-9.8) over N segments. Where it
//     hits a walkable surface, a landing ring appears.
//  3. On release, the player teleports to the landing point —
//     instantly, with foot-height correction.
//
//  Three collision checks (like Flowerbed):
//    - The landing surface must be tagged walkable (for us: any
//      registered ground mesh)
//    - A sphere-cast at the landing point must be clear (no obstacles)
//
//  Desktop input: hold Spacebar, move mouse to aim, release to teleport.
//  XR input: right thumbstick forward (angle 0-30° or 150-180°, mag ≥ 0.8).
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';

// ── Constants (tuned from Flowerbed) ──
const GRAVITY = -9.8;
const SHOOT_SPEED = 10;
const NUM_SEGMENTS = 12;
const MIN_Y_DROP = -1;          // ray computes until it drops this far below origin
const LANDING_CLEARANCE = 0.6;  // sphere-cast radius at landing point
const RING_RADIUS = 0.35;
const RING_VALID_COLOR = 0x48adc8;   // teal
const RING_INVALID_COLOR = 0x771111; // dark red
const TELEPORT_KEY = 'Space';

// Preallocated temporaries
const _v0 = new THREE.Vector3();
const _a = new THREE.Vector3(0, GRAVITY, 0);
const _point = new THREE.Vector3();
const _segmentStart = new THREE.Vector3();
const _segmentEnd = new THREE.Vector3();
const _downRay = new THREE.Ray();

/**
 * TeleportSystem — manages the teleport ray, landing ring, and
 * teleport execution. Created once per grounded scene. Free-flight
 * realms don't use this.
 *
 * Usage: the locomotion system calls `update()` each frame, passing
 * the current input state (isAiming, aimDirection, shouldTeleport)
 * and the player's GroundedPlayer instance for collision queries.
 */
export class TeleportSystem {
    constructor(scene) {
        this.scene = scene;
        this.groundedPlayer = null;
        this.isActive = false;       // ray is showing (aiming)
        this.canTeleport = false;    // landing point is valid
        this.landingPoint = null;    // THREE.Vector3 or null

        // ── Visual: the parabolic ray (line segments) ──
        const rayGeo = new THREE.BufferGeometry();
        const rayPositions = new Float32Array((NUM_SEGMENTS + 1) * 3);
        rayGeo.setAttribute('position', new THREE.BufferAttribute(rayPositions, 3));
        const rayMat = new THREE.LineBasicMaterial({
            color: RING_VALID_COLOR,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
        });
        this.rayLine = new THREE.Line(rayGeo, rayMat);
        this.rayLine.visible = false;
        this.rayLine.frustumCulled = false;
        scene.add(this.rayLine);

        // ── Visual: the landing ring (torus) ──
        const ringGeo = new THREE.TorusGeometry(RING_RADIUS, 0.04, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color: RING_VALID_COLOR,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
        });
        this.ring = new THREE.Mesh(ringGeo, ringMat);
        this.ring.rotation.x = Math.PI / 2; // lie flat
        this.ring.visible = false;
        this.ring.frustumCulled = false;
        scene.add(this.ring);

        // Desktop input state
        this._keyHeld = false;
        this._desktop = typeof window !== 'undefined';
        if (this._desktop) {
            window.addEventListener('keydown', this._onKeyDown);
            window.addEventListener('keyup', this._onKeyUp);
        }
    }

    _onKeyDown = (e) => {
        if (e.code === TELEPORT_KEY && !e.repeat) {
            this._keyHeld = true;
            e.preventDefault();
        }
    };

    _onKeyUp = (e) => {
        if (e.code === TELEPORT_KEY) {
            this._keyHeld = false;
        }
    };

    setGroundedPlayer(gp) {
        this.groundedPlayer = gp;
    }

    /**
     * Compute the parabolic ray points from an origin + direction.
     * Returns an array of THREE.Vector3 points along the arc.
     */
    _computeArc(origin, direction) {
        _v0.copy(direction).normalize().multiplyScalar(SHOOT_SPEED);
        const points = [];
        // Solve for when the ray drops MIN_Y_DROP below origin
        // y(t) = origin.y + v0.y*t + 0.5*g*t² = origin.y + MIN_Y_DROP
        // 0.5*g*t² + v0.y*t + |MIN_Y_DROP| = 0
        const a = 0.5 * GRAVITY;
        const b = _v0.y;
        const c = Math.abs(MIN_Y_DROP);
        const disc = b * b - 4 * a * c;
        let maxT = 1.5; // fallback
        if (disc >= 0 && a !== 0) {
            maxT = Math.max((-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a));
            maxT = Math.min(maxT, 2.5); // cap flight time
        }

        const dt = maxT / NUM_SEGMENTS;
        for (let i = 0; i <= NUM_SEGMENTS; i++) {
            const t = i * dt;
            _point.set(
                origin.x + _v0.x * t + 0.5 * _a.x * t * t,
                origin.y + _v0.y * t + 0.5 * _a.y * t * t,
                origin.z + _v0.z * t + 0.5 * _a.z * t * t,
            );
            points.push(_point.clone());
        }
        return points;
    }

    /**
     * Trace the arc against the BVH to find where the ray hits ground.
     * Walks segment by segment; returns the hit point + whether it's valid.
     */
    _traceArc(points) {
        if (!this.groundedPlayer?.bvh) return null;

        for (let i = 0; i < points.length - 1; i++) {
            _segmentStart.copy(points[i]);
            _segmentEnd.copy(points[i + 1]);

            // Raycast this segment against the collision world
            const segDir = _segmentEnd.clone().sub(_segmentStart);
            const segLen = segDir.length();
            segDir.normalize();

            const raycaster = new THREE.Raycaster(_segmentStart, segDir, 0, segLen);
            raycaster.firstHitOnly = true;

            let hit = null;
            this.groundedPlayer.bvh.shapecast({
                intersectsBounds: (box) => {
                    const intersectPoint = new THREE.Vector3();
                    const ray = raycaster.ray;
                    return ray.intersectBox(box, intersectPoint) !== null;
                },
                intersectsTriangle: (tri) => {
                    const result = raycaster.ray.intersectTriangle(
                        tri.a, tri.b, tri.c, false, _point
                    );
                    if (result) {
                        // Check this is a downward-facing surface (walkable)
                        const normal = tri.getNormal(new THREE.Vector3());
                        if (normal.y > 0.3 && !hit) {
                            hit = _point.clone();
                        }
                    }
                },
            });

            if (hit) {
                // Verify landing clearance: sphere-cast at hit point
                if (this._checkLandingClearance(hit)) {
                    return hit;
                }
                // Hit something but can't land there
                return { invalid: true, point: hit };
            }
        }
        return null;
    }

    /**
     * Check that there's nothing obstructing the landing zone (no walls,
     * obstacles in the way). Sphere-cast at the landing point.
     */
    _checkLandingClearance(point) {
        if (!this.groundedPlayer?.bvh) return true;

        // Check for obstacles in a sphere around the landing point
        let hasObstruction = false;
        this.groundedPlayer.bvh.shapecast({
            intersectsBounds: (box) => {
                const sphere = new THREE.Sphere(point, LANDING_CLEARANCE);
                return box.intersectsSphere(sphere);
            },
            intersectsTriangle: (tri) => {
                const closest = new THREE.Vector3();
                tri.closestPointToPoint(point, closest);
                if (closest.distanceTo(point) < LANDING_CLEARANCE) {
                    // But ignore the ground itself (downward-facing triangles)
                    const normal = tri.getNormal(new THREE.Vector3());
                    if (normal.y < 0.3) {
                        hasObstruction = true;
                    }
                }
            },
        });
        return !hasObstruction;
    }

    /**
     * Update the teleport visuals. Called each frame.
     *
     * @param {object} opts
     *   - camera: THREE.Camera (for origin + direction)
     *   - isAiming: boolean (ray should be visible)
     *   - aimDirection: THREE.Vector3 (direction to cast the ray)
     *   - shouldTeleport: boolean (trigger a teleport this frame)
     *   - playerPos: THREE.Vector3 (current foot position, for teleport)
     * @returns {boolean} true if a teleport happened
     */
    update({ camera, isAiming, aimDirection, shouldTeleport, playerPos }) {
        if (!this.groundedPlayer) return false;

        // If aiming, compute the arc and show visuals
        if (isAiming && aimDirection) {
            const origin = camera.position.clone();
            origin.y -= 0.3; // cast from roughly hand/chest height

            const points = this._computeArc(origin, aimDirection);
            const hit = this._traceArc(points);

            // Update the ray line geometry
            const positions = this.rayLine.geometry.attributes.position.array;
            const visiblePoints = hit && !hit.invalid
                ? points.slice(0, points.findIndex(p => p.distanceTo(hit) < 0.5) + 2)
                : points;
            for (let i = 0; i < visiblePoints.length && i <= NUM_SEGMENTS; i++) {
                positions[i * 3] = visiblePoints[i].x;
                positions[i * 3 + 1] = visiblePoints[i].y;
                positions[i * 3 + 2] = visiblePoints[i].z;
            }
            // Fill remaining with last point (avoids garbage)
            const lastIdx = Math.min(visiblePoints.length - 1, NUM_SEGMENTS);
            for (let i = lastIdx + 1; i <= NUM_SEGMENTS; i++) {
                positions[i * 3] = positions[lastIdx * 3];
                positions[i * 3 + 1] = positions[lastIdx * 3 + 1];
                positions[i * 3 + 2] = positions[lastIdx * 3 + 2];
            }
            this.rayLine.geometry.attributes.position.needsUpdate = true;
            this.rayLine.visible = true;

            // Update the landing ring
            if (hit && !hit.invalid) {
                this.canTeleport = true;
                this.landingPoint = hit;
                this.ring.position.copy(hit);
                this.ring.position.y += 0.05;
                this.ring.material.color.setHex(RING_VALID_COLOR);
                this.ring.visible = true;
            } else {
                this.canTeleport = false;
                this.landingPoint = hit?.invalid ? hit.point : null;
                if (this.landingPoint) {
                    this.ring.position.copy(this.landingPoint);
                    this.ring.position.y += 0.05;
                    this.ring.material.color.setHex(RING_INVALID_COLOR);
                    this.ring.visible = true;
                } else {
                    this.ring.visible = false;
                }
            }
            this.isActive = true;
        } else {
            // Not aiming — hide visuals
            this.rayLine.visible = false;
            this.ring.visible = false;
            this.isActive = false;
            this.canTeleport = false;
            this.landingPoint = null;
        }

        // Execute teleport on trigger
        if (shouldTeleport && this.canTeleport && this.landingPoint && playerPos) {
            playerPos.x = this.landingPoint.x;
            playerPos.z = this.landingPoint.z;
            // Keep the player on the ground (foot height)
            playerPos.y = this.landingPoint.y;
            // Reset velocity so they don't keep falling
            this.groundedPlayer.velocity.set(0, 0, 0);
            return true;
        }

        return false;
    }

    dispose() {
        if (this._desktop) {
            window.removeEventListener('keydown', this._onKeyDown);
            window.removeEventListener('keyup', this._onKeyUp);
        }
        this.scene.remove(this.rayLine);
        this.scene.remove(this.ring);
        this.rayLine.geometry.dispose();
        this.rayLine.material.dispose();
        this.ring.geometry.dispose();
        this.ring.material.dispose();
    }
}

// ── Desktop input helper: is the teleport key held? ──
export function isTeleportKeyHeld() {
    return typeof window !== 'undefined' && window._teleportKeyHeld === true;
}
