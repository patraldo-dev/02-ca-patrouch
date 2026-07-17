// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict type-checking (jsconfig.json).
// ═══════════════════════════════════════════════════════════
//  locomotion-system.js
//  Cross-platform locomotion. Two input sources, one movement system:
//
//  1. XR session (dev IWER / real headset): reads left thumbstick,
//     moves world.player (the XROrigin rig the camera is parented to).
//  2. Inline (production desktop + mobile): reads keyboard WASD or a
//     virtual thumbstick via `inlineInput`, moves world.camera directly
//     (the camera IS the viewpoint; no XR rig needed).
//
//  In both cases, setting `locomotion.userActive = true` causes the
//  CameraOrbitSystem to yield (it checks that flag).
// ═══════════════════════════════════════════════════════════
import { createSystem } from 'elics';
import { Vector3, Euler, Quaternion } from 'three';
import { InputComponent } from '@iwsdk/core';
import { GroundedPlayer, isGroundedRealm } from './grounded-player.js';
import { TeleportSystem } from './teleport-system.js';
import { ComfortVignette } from './comfort-vignette.js';

const THUMBSTICK = InputComponent.Thumbstick; // 'xr-standard-thumbstick'
const WALK_SPEED = 1.8;
const FLIGHT_SPEED = 3.0;
const DEAD_ZONE = 0.1;
const EYE_HEIGHT = 1.6;
const DEFAULT_FLOOR_Y = -1.5;
const LOOK_SENSITIVITY = 0.003;

// ── Right-stick locomotion zones (Flowerbed model) ──
// The right thumbstick is shared between snap turn (sides) and
// teleport (forward/back). Angles measured from forward (0°).
const SNAP_TURN_MIN = Math.PI / 6;     // 30°
const SNAP_TURN_MAX = (5 * Math.PI) / 6; // 150°
const SNAP_TURN_MAG = 0.8;             // min magnitude to trigger
const SNAP_ANGLE = Math.PI / 4;        // 45° per snap
const TELEPORT_MAG = 0.8;              // min magnitude to engage teleport
const TELEPORT_FORWARD_MAX = Math.PI / 6;  // 0-30° = forward teleport zone
const TELEPORT_BACKWARD_MIN = (5 * Math.PI) / 6; // 150-180° = backward zone

// Preallocated temporaries (no per-frame alloc).
const _moveDir = new Vector3();
const _upAxis = new Vector3(0, 1, 0);
const _euler = new Euler(0, 0, 0, 'YXZ');
const _grabOrigin = new Vector3();
const _grabQuat = new Quaternion();
const _grabDir = new Vector3();
const _forward3 = new Vector3(0, 0, -1);

// ── Inline input state (populated by keyboard/touch listeners) ──
// { x: -1..1 (strafe), y: -1..1 (forward), lookX: delta, lookY: delta }
export const inlineInput = { x: 0, y: 0, lookX: 0, lookY: 0 };

// Camera yaw/pitch for inline look (persisted across frames).
let _inlineYaw = 0;
let _inlinePitch = 0;

// Module-level locomotion state. The orbit system reads `userActive`.
export const locomotion = {
	mode: 'walk',           // 'walk' (grounded) or 'flight' (free-fly)
	grounded: false,        // true = use GroundedPlayer physics
	floorY: DEFAULT_FLOOR_Y,
	userActive: false,
	enabled: false,
	groundedPlayer: null,   // GroundedPlayer instance (set for grounded realms)
	teleport: null,         // TeleportSystem instance (set for grounded realms)
	vignette: null,         // ComfortVignette instance (set for grounded realms)
	grab: null,             // GrabSystem instance (set for all scenes with elements)
	// Fly-to-target: when set, the update loop eases the camera toward this
	// position (with an optional lookAt target), then clears it. Used by
	// "fly to peer" and "recenter" (mobile). Set via flyTo(); cleared when
	// the camera arrives or on any manual input.
	_flyTarget: null,      // { x, y, z, lookAt?: {x,y,z} }
};

export function configureLocomotion(config, scene, camera) {
	const envType = config?.environment?.type;
	const grounded = isGroundedRealm(envType);
	locomotion.grounded = grounded;
	locomotion.mode = grounded ? 'walk' : 'flight';
	locomotion.floorY = config?.camera?.floor_y ?? DEFAULT_FLOOR_Y;
	// Create the grounded physics player for grounded realms
	locomotion.groundedPlayer = grounded ? new GroundedPlayer() : null;
	// Teleport system: create for grounded realms with a scene
	if (grounded && scene) {
		// Clean up previous teleport system if it exists
		if (locomotion.teleport) {
			locomotion.teleport.dispose();
		}
		locomotion.teleport = new TeleportSystem(scene);
		locomotion.teleport.setGroundedPlayer(locomotion.groundedPlayer);
	} else if (locomotion.teleport) {
		locomotion.teleport.dispose();
		locomotion.teleport = null;
	}
	// Comfort vignette: create for grounded realms (reduces motion sickness)
	if (grounded && camera) {
		if (locomotion.vignette) {
			locomotion.vignette.dispose();
		}
		locomotion.vignette = new ComfortVignette(camera);
	} else if (locomotion.vignette) {
		locomotion.vignette.dispose();
		locomotion.vignette = null;
	}
}

// Fly the camera toward a target position (with optional lookAt). Used by
// "fly to peer" (tap a name in the presence roster) and recenter. The update
// loop eases the camera until it arrives, then clears the target. Any manual
// input (key/thumbstick) cancels the fly.
export function flyTo(x, y, z, lookAt) {
	locomotion._flyTarget = { x, y, z, lookAt: lookAt || null };
	locomotion.userActive = true;  // keep the orbit yielded during the fly
}

// Recenter to scene origin (same as Esc, but callable from UI for mobile).
export function recenter() {
	locomotion._recenter = true;
}

// Internal: process the fly target each frame. Returns true if it consumed
// the frame (caller should skip normal input handling).
function processFlyTarget(cam, delta) {
	if (!locomotion._flyTarget || !cam) return false;
	const t = locomotion._flyTarget;
	const FLY_SPEED = 3.5;  // units per second ease rate
	const ARRIVAL = 0.15;   // distance at which the fly completes

	cam.position.x += (t.x - cam.position.x) * Math.min(1, FLY_SPEED * delta);
	cam.position.y += (t.y - cam.position.y) * Math.min(1, FLY_SPEED * delta);
	cam.position.z += (t.z - cam.position.z) * Math.min(1, FLY_SPEED * delta);

	if (t.lookAt) {
		cam.lookAt(t.lookAt.x, t.lookAt.y, t.lookAt.z);
	}

	const dist = Math.hypot(t.x - cam.position.x, t.y - cam.position.y, t.z - cam.position.z);
	if (dist < ARRIVAL) {
		locomotion._flyTarget = null;  // arrived
	}
	return true;
}

// ── Inline input listeners (keyboard) ──
const _keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
let _thumbstickActive = false;  // set by PortalScene thumbstick handlers

function onKeyDown(e) {
	if (e.code === 'Escape') {
		// Reset all keys + recenter flag
		for (const k in _keys) _keys[k] = false;
		inlineInput.x = 0; inlineInput.y = 0;
		inlineInput.lookX = 0; inlineInput.lookY = 0;
		locomotion._recenter = true;  // locomotion update() checks this
		return;
	}
	if (e.code in _keys) { _keys[e.code] = true; e.preventDefault(); }
}
function onKeyUp(e) {
	if (e.code in _keys) { _keys[e.code] = false; }
}

// Mouse/touch look state
let _lookActive = false;

// Mouse position in NDC (-1..1) + button state, for the grab system
let _mouseNDC = null;  // { x, y } or null
let _mouseDown = false;

function updateInlineInputFromKeys() {
	// If the thumbstick is active (touch), don't overwrite — let it own x/y.
	if (_thumbstickActive) return;
	// Otherwise always write (including zeros when no keys pressed) so movement
	// stops when keys are released.
	let x = 0, y = 0;
	if (_keys.KeyW) y -= 1;
	if (_keys.KeyS) y += 1;
	if (_keys.KeyA) x -= 1;
	if (_keys.KeyD) x += 1;
	inlineInput.x = x;
	inlineInput.y = y;
}

// Called by PortalScene when the thumbstick starts/stops dragging.
export function setThumbstickActive(active) { _thumbstickActive = active; }

export function initInlineInput(domElement) {
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	// Mouse-drag look on desktop. Track whether the mouse actually moved
	// during the press — if not, it's a click (let it reach the canvas for
	// portal navigation). If it moved, it's a look-drag.
	let mouseDownPos = null;
	let mouseMoved = false;
	domElement.addEventListener('mousedown', (e) => {
		_lookActive = true;
		_mouseDown = true;
		mouseDownPos = { x: e.clientX, y: e.clientY };
		mouseMoved = false;
	});
	window.addEventListener('mouseup', (e) => {
		if (_lookActive && mouseDownPos && !mouseMoved) {
			// It was a click, not a drag — forward to canvas as pointerdown
			// so the themed scene / starfield tap handler can raycast + navigate.
			domElement.dispatchEvent(new PointerEvent('click', {
				clientX: mouseDownPos.x, clientY: mouseDownPos.y, bubbles: true,
			}));
		}
		_lookActive = false;
		_mouseDown = false;
		mouseDownPos = null;
		mouseMoved = false;
	});
	// Track mouse position in NDC for the grab system
	window.addEventListener('mousemove', (e) => {
		_mouseNDC = {
			x: (e.clientX / window.innerWidth) * 2 - 1,
			y: -(e.clientY / window.innerHeight) * 2 + 1,
		};
	});
	domElement.addEventListener('mousemove', (e) => {
		if (_lookActive && e.buttons > 0) {
			if (mouseDownPos && (Math.abs(e.clientX - mouseDownPos.x) > 5 || Math.abs(e.clientY - mouseDownPos.y) > 5)) {
				mouseMoved = true;
			}
			if (mouseMoved) {
				inlineInput.lookX = e.movementX * LOOK_SENSITIVITY;
				inlineInput.lookY = e.movementY * LOOK_SENSITIVITY;
			}
		}
	});
}

export function disposeInlineInput() {
	window.removeEventListener('keydown', onKeyDown);
	window.removeEventListener('keyup', onKeyUp);
}

export const LocomotionSystem = class extends createSystem({}) {
	init() {
		console.log('[locomotion] system registered & initialized ✓');
	}

	update(delta, _time) {
		const world = this.world;
		const hasSession = !!world.session;

		// ── Inline mode (no XR session): keyboard/touch input ──
		if (!hasSession) {
			// Esc: recenter the camera to the scene origin.
			if (locomotion._recenter) {
				locomotion._recenter = false;
				const cam = world.camera;
				if (cam) {
					cam.position.set(0, 2, 5);
					_inlineYaw = 0;
					_inlinePitch = 0;
					cam.lookAt(0, 0, 0);
				}
				locomotion._flyTarget = null;  // cancel any in-progress fly
				locomotion.userActive = false;
				return;
			}
			// Fly-to-target (peer or recenter-via-UI). Takes priority over input.
			if (locomotion._flyTarget) {
				const cam = world.camera;
				if (processFlyTarget(cam, delta)) return;
			}
			updateInlineInputFromKeys();
			const hasMoveInput = Math.abs(inlineInput.x) > 0.01 || Math.abs(inlineInput.y) > 0.01;
			const hasLookInput = Math.abs(inlineInput.lookX) > 0.0001 || Math.abs(inlineInput.lookY) > 0.0001;

			if (!hasMoveInput && !hasLookInput) {
				// No input this frame — stop moving, but DON'T clear userActive.
				// Clearing it would hand control back to CameraOrbitSystem, which
				// snaps the camera back to the orbit path (the "snap to start" bug).
				// Once the visitor has moved, they keep control until an explicit
				// recenter (Esc); the orbit yields permanently for this scene.

				// In grounded mode, still apply gravity (player might be airborne).
				// Also update teleport visuals if aiming.
				if (locomotion.grounded && locomotion.groundedPlayer) {
					const cam = world.camera;
					if (cam) {
						const footPos = new Vector3(cam.position.x, cam.position.y - EYE_HEIGHT, cam.position.z);
						locomotion.groundedPlayer.step(footPos, new Vector3(0, 0, 0), delta);
						cam.position.y = footPos.y + EYE_HEIGHT;
					}
				}
				// Teleport: if key held while idle, still show the ray
				if (locomotion.teleport && locomotion.teleport._keyHeld) {
					const cam = world.camera;
					const aimDir = new Vector3();
					cam.getWorldDirection(aimDir);
					aimDir.y = 0.3;
					aimDir.normalize();
					const footPos = new Vector3(cam.position.x, cam.position.y - EYE_HEIGHT, cam.position.z);
					locomotion.teleport.update({
						camera: cam, isAiming: true, aimDirection: aimDir,
						shouldTeleport: false, playerPos: footPos,
					});
				}
				locomotion.enabled = false;
				// Consume look deltas so they don't accumulate
				inlineInput.lookX = 0;
				inlineInput.lookY = 0;
				return;
			}

			locomotion.userActive = true;
			locomotion.enabled = true;

			const cam = world.camera;
			if (!cam) return;

			// Apply look (yaw + pitch) to camera rotation
			if (hasLookInput) {
				_inlineYaw -= inlineInput.lookX;
				_inlinePitch -= inlineInput.lookY;
				_inlinePitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, _inlinePitch));
				_euler.set(_inlinePitch, _inlineYaw, 0, 'YXZ');
				cam.quaternion.setFromEuler(_euler);
				// Consume the look delta
				inlineInput.lookX = 0;
				inlineInput.lookY = 0;
			}

			// ── Teleport (desktop): hold Space + look to aim, release to teleport ──
			if (locomotion.teleport) {
				const wasHeld = locomotion.teleport._keyHeld;
				// Aim direction: camera forward, flattened to horizontal + slight up
				const aimDir = new Vector3();
				cam.getWorldDirection(aimDir);
				aimDir.y = Math.abs(aimDir.y) > 0.7 ? 0.5 * Math.sign(aimDir.y) : 0.3; // give upward arc
				aimDir.normalize();

				// Determine the foot position (for teleport target)
				const footPos = new Vector3(cam.position.x, cam.position.y - EYE_HEIGHT, cam.position.z);

				locomotion.teleport.update({
					camera: cam,
					isAiming: wasHeld,
					aimDirection: aimDir,
					shouldTeleport: !wasHeld && locomotion.teleport._wasHeld, // released this frame
					playerPos: footPos,
				});
				locomotion.teleport._wasHeld = wasHeld;

				// If a teleport happened, update the camera position to match
				footPos.y += EYE_HEIGHT;
				cam.position.copy(footPos);

				// If aiming teleport, skip normal movement (let them aim)
				if (wasHeld) {
					locomotion.userActive = true;
					return;
				}
			}

			// Movement: build direction from input, rotate by camera yaw.
			// Any manual input cancels an in-progress fly-to.
			if (hasMoveInput) {
				locomotion._flyTarget = null;
				_moveDir.set(inlineInput.x, 0, inlineInput.y);
				_moveDir.applyAxisAngle(_upAxis, _inlineYaw);

				if (locomotion.mode === 'flight') {
					cam.position.addScaledVector(_moveDir, FLIGHT_SPEED * delta);
				} else {
					_moveDir.y = 0;
					_moveDir.multiplyScalar(WALK_SPEED * delta);

					if (locomotion.grounded && locomotion.groundedPlayer) {
						// Grounded physics: gravity + collision resolution
						const footPos = new Vector3(cam.position.x, cam.position.y - EYE_HEIGHT, cam.position.z);
						locomotion.groundedPlayer.step(footPos, _moveDir, delta);
						cam.position.x = footPos.x;
						cam.position.y = footPos.y + EYE_HEIGHT;
						cam.position.z = footPos.z;
					} else {
						// Legacy hard-floor pin (fallback if no grounded player)
						cam.position.x += _moveDir.x;
						cam.position.z += _moveDir.z;
						cam.position.y = locomotion.floorY + EYE_HEIGHT;
					}
				}
			} else if (locomotion.grounded && locomotion.groundedPlayer && !locomotion._flyTarget) {
				// No horizontal input but still in a grounded realm — apply gravity
				const footPos = new Vector3(cam.position.x, cam.position.y - EYE_HEIGHT, cam.position.z);
				locomotion.groundedPlayer.step(footPos, new Vector3(0, 0, 0), delta);
				cam.position.y = footPos.y + EYE_HEIGHT;
			}

			// ── Comfort vignette: XR only. On desktop the 3D tube occludes the
			// whole view, so we disable it entirely for inline mode. ──
			if (locomotion.vignette) {
				locomotion.vignette.setEnabled(false);
			}

			// ── Grab system (desktop): mouse position + click to grab ──
			if (locomotion.grab && _mouseNDC) {
				locomotion.grab.update({
					camera: cam,
					pointerNDC: _mouseNDC,
					mouseHeld: _mouseDown,
				});
			}
			return;
		}

		// ── XR session mode: gamepad input (existing path) ──
		locomotion.enabled = true;

		// On session start, place the player rig facing the scene center.
		if (!locomotion._rigPlaced && world.player) {
			const rad = 3;
			// For grounded realms, start slightly above floor and let gravity settle.
			// For flight realms, start at a viewing height.
			const floorY = locomotion.mode === 'walk'
				? locomotion.floorY + EYE_HEIGHT + 0.5
				: 1;
			world.player.position.set(0, floorY, rad);
			world.player.lookAt(0, floorY, 0);
			locomotion._rigPlaced = true;
		}

		// Show controller models — like Flowerbed, visible hands/controllers
		// make the experience feel immersive rather than observational.
		// (Previously these were hidden, which made it feel like a detached
		// camera. Restored so the player sees their virtual hands.)
		const va = world.input?.visualAdapters;
		if (va) {
			for (const side of ['left', 'right']) {
				const model = va[side]?.value?.visual?.model;
				if (model) model.visible = true;
			}
		}

		const left = world.input?.gamepads?.left;
		if (!left) return;

		const value = left.get2DInputValue(THUMBSTICK) ?? 0;
		if (value < DEAD_ZONE) {
			// Thumbstick centered — stop moving, but keep userActive true so the
			// orbit doesn't snap the camera back to its idle path. Control is only
			// relinquished on explicit recenter (Esc), not on releasing the stick.
			// Fly-to-target continues even with thumbstick centered (it's a
			// programmatic camera move, not thumbstick input).
			if (locomotion._flyTarget && world.player) {
				const player = world.player;
				const t = locomotion._flyTarget;
				const FLY_SPEED = 3.5;
				const ARRIVAL = 0.15;
				player.position.x += (t.x - player.position.x) * Math.min(1, FLY_SPEED * delta);
				player.position.z += (t.z - player.position.z) * Math.min(1, FLY_SPEED * delta);
				if (t.lookAt) player.lookAt(t.lookAt.x, t.lookAt.y, t.lookAt.z);
				if (Math.hypot(t.x - player.position.x, t.z - player.position.z) < ARRIVAL) {
					locomotion._flyTarget = null;
				}
			}
			// Grounded: apply gravity even when left stick is idle
			if (locomotion.grounded && locomotion.groundedPlayer && world.player) {
				const player = world.player;
				const footPos = new Vector3(player.position.x, player.position.y - EYE_HEIGHT, player.position.z);
				locomotion.groundedPlayer.step(footPos, new Vector3(0, 0, 0), delta);
				player.position.x = footPos.x;
				player.position.y = footPos.y + EYE_HEIGHT;
				player.position.z = footPos.z;
			}
			// Fall through to right-stick handling (don't return yet)
			// ... right stick teleport/snap-turn handled below
		} else {
		locomotion._flyTarget = null;  // thumbstick input cancels fly
		locomotion.userActive = true;

		const axes = left.getAxesValues?.(THUMBSTICK) ?? { x: 0, y: 0 };
		_moveDir.set(axes.x, 0, axes.y);
		const cam = world.camera;
		const cameraYaw = Math.atan2(
			cam.matrixWorld.elements[8],
			cam.matrixWorld.elements[10],
		);
		_moveDir.applyAxisAngle(_upAxis, cameraYaw);

		const player = world.player;
		if (locomotion.mode === 'flight') {
			player.position.addScaledVector(_moveDir, FLIGHT_SPEED * delta);
		} else {
			_moveDir.y = 0;
			_moveDir.multiplyScalar(WALK_SPEED * delta);

			if (locomotion.grounded && locomotion.groundedPlayer) {
				// Grounded physics: convert player rig position to foot,
				// step through collision, write back.
				const footPos = new Vector3(player.position.x, player.position.y - EYE_HEIGHT, player.position.z);
				locomotion.groundedPlayer.step(footPos, _moveDir, delta);
				player.position.x = footPos.x;
				player.position.y = footPos.y + EYE_HEIGHT;
				player.position.z = footPos.z;
			} else {
				player.position.x += _moveDir.x;
				player.position.z += _moveDir.z;
				player.position.y = locomotion.floorY + EYE_HEIGHT;
			}
		}
		}

		// ── Right thumbstick: snap turn + teleport (XR, grounded realms only) ──
		const right = world.input?.gamepads?.right;
		if (right && locomotion.grounded) {
			const rValue = right.get2DInputValue(THUMBSTICK) ?? 0;
			const rAxes = right.getAxesValues?.(THUMBSTICK) ?? { x: 0, y: 0 };

			if (rValue >= SNAP_TURN_MAG) {
				// Stick angle: 0 = forward, ±π = back (y inverted on controllers)
				const angle = Math.atan2(rAxes.x, -rAxes.y);
				const absAngle = Math.abs(angle);

				if (absAngle < TELEPORT_FORWARD_MAX || absAngle > TELEPORT_BACKWARD_MIN) {
					// ── TELEPORT ZONE (forward/back) — aim the ray ──
					if (locomotion.teleport) {
						const cam = world.camera;
						const player = world.player;
						const aimDir = new Vector3();
						cam.getWorldDirection(aimDir);
						aimDir.y = 0.3;
						aimDir.normalize();
						const footPos = new Vector3(player.position.x, player.position.y - EYE_HEIGHT, player.position.z);
						locomotion.teleport.update({
							camera: cam, isAiming: true, aimDirection: aimDir,
							shouldTeleport: false, playerPos: footPos,
						});
						locomotion._xrTeleportEngaged = true;
					}
				} else if (absAngle >= SNAP_TURN_MIN && absAngle <= SNAP_TURN_MAX) {
					// ── SNAP TURN ZONE — edge-triggered 45° rotation ──
					if (!locomotion._xrSnapState) {
						world.player.rotateY((angle > 0 ? -1 : 1) * SNAP_ANGLE);
						locomotion._xrSnapState = true;
						// Pulse the comfort vignette on snap turn
						if (locomotion.vignette) locomotion.vignette.pulse();
					}
				}
			} else {
				// Stick released below threshold
				if (locomotion._xrTeleportEngaged && locomotion.teleport) {
					const cam = world.camera;
					const player = world.player;
					const footPos = new Vector3(player.position.x, player.position.y - EYE_HEIGHT, player.position.z);
					const teleported = locomotion.teleport.update({
						camera: cam, isAiming: false, aimDirection: null,
						shouldTeleport: true, playerPos: footPos,
					});
					if (teleported) {
						player.position.x = footPos.x;
						player.position.y = footPos.y + EYE_HEIGHT;
						player.position.z = footPos.z;
						locomotion.groundedPlayer.velocity.set(0, 0, 0);
						// Pulse the comfort vignette on teleport
						if (locomotion.vignette) locomotion.vignette.pulse(0.8);
					}
				}
				locomotion._xrTeleportEngaged = false;
				locomotion._xrSnapState = false;

				// Hide teleport visuals when stick is centered
				if (locomotion.teleport) {
					locomotion.teleport.update({
						camera: world.camera, isAiming: false, aimDirection: null,
						shouldTeleport: false, playerPos: null,
					});
				}
			}
		}

		// ── Comfort vignette (XR): modulate by left-stick magnitude ──
		if (locomotion.vignette) {
			locomotion.vignette.setEnabled(true); // ensure on for XR
			const leftMag = left ? (left.get2DInputValue(THUMBSTICK) ?? 0) : 0;
			// Normalize: our DEAD_ZONE is 0.1, max useful is ~1.0
			const speed = Math.max(0, Math.min(1, (leftMag - DEAD_ZONE) / (1 - DEAD_ZONE)));
			locomotion.vignette.update(speed);
		}

		// ── Grab system (XR): right controller ray + trigger to grab ──
		if (locomotion.grab && world.input?.gamepads?.right) {
			const rightGp = world.input.gamepads.right;
			const triggerHeld = rightGp.getButtonPressed(InputComponent.Trigger);
			const raySpace = world.player?.raySpaces?.right;
			if (raySpace) {
				raySpace.getWorldPosition(_grabOrigin);
				raySpace.getWorldQuaternion(_grabQuat);
				_grabDir.copy(_forward3).applyQuaternion(_grabQuat);
				locomotion.grab.update({
					controllerOrigin: _grabOrigin,
					controllerDir: _grabDir,
					triggerHeld,
				});
			}
		}
	}
};
