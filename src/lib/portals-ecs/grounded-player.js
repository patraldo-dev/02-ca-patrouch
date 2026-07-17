// @ts-nocheck — IWSDK/Three.js dynamic scene code
// ═══════════════════════════════════════════════════════════
//  grounded-player.js
//  A lightweight grounded-physics layer for the portals, inspired by
//  Project Flowerbed's PlayerPhysicsSystem. Keeps the player on the
//  floor with gravity + capsule collision against registered meshes.
//
//  Free-flight realms (space, dream, cosmos) skip this entirely —
//  those use the existing unconstrained locomotion.
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ── Physics constants (tuned to feel like Flowerbed) ──
const GRAVITY = -10;        // m/s²
const PLAYER_RADIUS = 0.4;  // capsule radius
const PLAYER_HEIGHT = 1.6;  // eye height when standing
const PHYSICS_STEPS = 2;    // substeps per frame
const GROUND_EPSILON = 0.02;

// Preallocated temporaries
const _disp = new THREE.Vector3();
const _tempVec = new THREE.Vector3();
const _closestPoint = new THREE.Vector3();
const _capsuleStart = new THREE.Vector3();
const _capsuleEnd = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();

/**
 * GroundedPlayer — manages collision meshes + per-frame physics for
 * a grounded player. One instance per scene (created in rebuildScene
 * for grounded realms, null for free-flight realms).
 */
export class GroundedPlayer {
    constructor() {
        this.colliderGeometries = [];  // { geometry, matrix }[] — world-space
        this.bvh = null;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.isGrounded = false;
        this._dirty = true;
    }

    /**
     * Register a mesh as collidable. Extracts its geometry in world space.
     * Call during scene build for ground planes + obstacles.
     */
    register(obj) {
        if (!obj) return;
        obj.updateMatrixWorld(true);
        obj.traverse((child) => {
            if (child.isMesh && child.geometry) {
                // Clone geometry + bake world matrix into vertex positions
                const geo = child.geometry.clone();
                geo.applyMatrix4(child.matrixWorld);
                this.colliderGeometries.push(geo);
            }
        });
        this._dirty = true;
    }

    /**
     * Rebuild the BVH from all registered collider geometries.
     * Called lazily on the first physics step after registration.
     */
    _rebuildBVH() {
        if (this.colliderGeometries.length === 0) {
            this._dirty = false;
            return;
        }

        // Merge all geometries into one for a single BVH
        let merged;
        if (this.colliderGeometries.length === 1) {
            merged = this.colliderGeometries[0];
        } else {
            merged = mergeGeometries(this.colliderGeometries, false);
        }

        if (merged) {
            this.bvh = new MeshBVH(merged, {
                maxDepth: 32,
                indirect: true,
            });
        }
        this._dirty = false;
    }

    /**
     * Resolve a desired position delta against collision geometry.
     * Applies gravity to velocity, moves in substeps, pushes the
     * capsule out of any intersecting geometry.
     *
     * @param {THREE.Vector3} position — player foot position (mutated in place)
     * @param {THREE.Vector3} desiredDelta — intended xz movement this frame
     * @param {number} delta — frame time in seconds
     * @returns {THREE.Vector3} the actual position delta applied
     */
    step(position, desiredDelta, delta) {
        if (this._dirty) this._rebuildBVH();
        if (!this.bvh) {
            // No colliders — free fall with floor at y=0
            this.velocity.y += GRAVITY * delta;
            position.x += desiredDelta.x;
            position.z += desiredDelta.z;
            position.y += this.velocity.y * delta;
            if (position.y <= 0) {
                position.y = 0;
                this.velocity.y = 0;
                this.isGrounded = true;
            }
            return desiredDelta;
        }

        const startPos = position.clone();
        const stepDelta = delta / PHYSICS_STEPS;

        for (let i = 0; i < PHYSICS_STEPS; i++) {
            // Apply gravity
            this.velocity.y += GRAVITY * stepDelta;

            // Movement vector for this substep
            const move = _tempVec.set(
                desiredDelta.x / PHYSICS_STEPS,
                this.velocity.y * stepDelta,
                desiredDelta.z / PHYSICS_STEPS,
            );

            position.add(move);

            // Capsule collision check
            _capsuleStart.copy(position);
            _capsuleStart.y += PLAYER_RADIUS;
            _capsuleEnd.copy(position);
            _capsuleEnd.y += PLAYER_HEIGHT - PLAYER_RADIUS;

            _disp.set(0, 0, 0);
            const capsule = { start: _capsuleStart, end: _capsuleEnd, radius: PLAYER_RADIUS };

            this.bvh.shapecast({
                intersectsBounds: (box) => box.intersectsCapsule(
                    capsule.start, capsule.end, capsule.radius
                ),
                intersectsTriangle: (tri) => {
                    _closestPoint.set(0, 0, 0);
                    tri.closestPointToSegment(
                        capsule.start, capsule.end, _closestPoint
                    );
                    const d = _closestPoint.distanceTo(capsule.start);
                    if (d < PLAYER_RADIUS) {
                        const penetration = PLAYER_RADIUS - d;
                        const dir = capsule.start.clone().sub(_closestPoint);
                        if (dir.lengthSq() > 0.0001) {
                            dir.normalize();
                            _disp.add(dir.multiplyScalar(penetration));
                        }
                    }
                },
            });

            if (_disp.lengthSq() > 0) {
                position.add(_disp);
                // Pushed up = hit ground
                if (_disp.y > GROUND_EPSILON) {
                    this.velocity.y = 0;
                    this.isGrounded = true;
                }
                // Pushed down = hit ceiling
                if (_disp.y < -GROUND_EPSILON && this.velocity.y > 0) {
                    this.velocity.y = 0;
                }
            } else if (this.velocity.y <= 0) {
                // No collision — probe slightly below to check ground
                _capsuleStart.copy(position);
                _capsuleStart.y += PLAYER_RADIUS - 0.05;
                _capsuleEnd.copy(position);
                _capsuleEnd.y += PLAYER_HEIGHT - PLAYER_RADIUS - 0.05;
                const probe = { start: _capsuleStart, end: _capsuleEnd, radius: PLAYER_RADIUS };
                let hitGround = false;

                this.bvh.shapecast({
                    intersectsBounds: (box) => box.intersectsCapsule(
                        probe.start, probe.end, probe.radius
                    ),
                    intersectsTriangle: (tri) => {
                        _closestPoint.set(0, 0, 0);
                        tri.closestPointToSegment(
                            probe.start, probe.end, _closestPoint
                        );
                        if (_closestPoint.distanceTo(probe.start) < PLAYER_RADIUS + 0.05) {
                            hitGround = true;
                        }
                    },
                });

                this.isGrounded = hitGround;
                if (hitGround && this.velocity.y < 0) {
                    this.velocity.y = 0;
                }
            }
        }

        return position.clone().sub(startPos);
    }

    /**
     * Raycast downward to find the floor height at a given xz position.
     * Used for placing the player on the ground at spawn.
     */
    raycastFloor(x, z, fromY = 10) {
        if (this._dirty) this._rebuildBVH();
        if (!this.bvh) return null;

        _rayOrigin.set(x, fromY, z);
        const rayDir = new THREE.Vector3(0, -1, 0);
        const ray = new THREE.Ray(_rayOrigin, rayDir);
        let hitY = null;

        this.bvh.shapecast({
            intersectsBounds: (box) => {
                // Only test boxes below the ray origin
                return box.min.y < fromY;
            },
            intersectsTriangle: (tri) => {
                // Check if the triangle is below the origin and within xz range
                const center = new THREE.Vector3();
                tri.getMidpoint(center);
                if (center.y < fromY && Math.abs(center.x - x) < 25 && Math.abs(center.z - z) < 25) {
                    if (hitY === null || center.y > hitY) {
                        hitY = center.y;
                    }
                }
            },
        });

        return hitY;
    }
}

/**
 * Determine if an environment type should use grounded locomotion
 * (floor + gravity + collision) vs. free-flight.
 *
 * Free-flight: space, dream, cosmos — swim/spacewalk/fly.
 * Grounded: everything else.
 */
export function isGroundedRealm(envType) {
    const FREE_FLIGHT = ['space', 'dream', 'cosmos'];
    return !FREE_FLIGHT.includes(envType);
}
