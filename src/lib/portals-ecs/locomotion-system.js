// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict type-checking (jsconfig.json).
// ═══════════════════════════════════════════════════════════
//  locomotion-system.js
//  Unified cross-platform locomotion. ONE movement system reads input
//  through InputAdapter — which delegates to XR StatefulGamepads or
//  InlineGamepads (keyboard/mouse/touch) depending on whether a real
//  XR session is active. Gameplay code no longer branches on
//  `world.session` to read input; the only session-dependent branch
//  is the rig target (XR moves world.player, inline moves world.camera).
//
//  Contract preserved: `locomotion.userActive` is the load-bearing
//  flag consumed by CameraOrbitSystem, RevelationSystem, NetworkSystem.
//  It is set true on any input, cleared by recenter / scene rebuild.
// ═══════════════════════════════════════════════════════════
import { createSystem } from 'elics';
import { Vector3, Euler, Quaternion } from 'three';
import { InputComponent } from '@iwsdk/core';
import { GroundedPlayer, isGroundedRealm } from './grounded-player.js';
import { TeleportSystem } from './teleport-system.js';
import { ComfortVignette } from './comfort-vignette.js';
import { InputAdapter, AxesState } from './input-adapter.js';

const THUMBSTICK = InputComponent.Thumbstick; // 'xr-standard-thumbstick' — same id adapter uses
const TRIGGER = InputComponent.Trigger;
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

// One shared adapter — created here so getSource() closes over our
// private _keys / inlineInput / _mouseDown state (the DOM listeners below).
const _keys = {};
let _mouseDown = false;
let _thumbstickActive = false;  // set by PortalScene thumbstick handlers

function getSource() {
	return { keys: _keys, inlineInput, thumbstickActive: _thumbstickActive, mouseDown: _mouseDown };
}
let adapter = null;
function getAdapter() {
	if (!adapter) adapter = new InputAdapter(getSource);
	return adapter;
}

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
		if (locomotion.teleport) locomotion.teleport.dispose();
		locomotion.teleport = new TeleportSystem(scene);
		locomotion.teleport.setGroundedPlayer(locomotion.groundedPlayer);
	} else if (locomotion.teleport) {
		locomotion.teleport.dispose();
		locomotion.teleport = null;
	}
	// Comfort vignette: create for grounded realms (reduces motion sickness)
	if (grounded && camera) {
		if (locomotion.vignette) locomotion.vignette.dispose();
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
function processFlyTarget(rigTarget, delta) {
	if (!locomotion._flyTarget || !rigTarget) return false;
	const t = locomotion._flyTarget;
	const FLY_SPEED = 3.5;
	const ARRIVAL = 0.15;

	rigTarget.position.x += (t.x - rigTarget.position.x) * Math.min(1, FLY_SPEED * delta);
	rigTarget.position.y += (t.y - rigTarget.position.y) * Math.min(1, FLY_SPEED * delta);
	rigTarget.position.z += (t.z - rigTarget.position.z) * Math.min(1, FLY_SPEED * delta);

	if (t.lookAt) rigTarget.lookAt(t.lookAt.x, t.lookAt.y, t.lookAt.z);

	const dist = Math.hypot(
		t.x - rigTarget.position.x,
		t.y - rigTarget.position.y,
		t.z - rigTarget.position.z,
	);
	if (dist < ARRIVAL) locomotion._flyTarget = null;
	return true;
}

// ── Inline input listeners (keyboard) ──

function onKeyDown(e) {
	if (e.code === 'Escape') {
		// Reset all keys + recenter flag
		for (const k in _keys) _keys[k] = false;
		inlineInput.x = 0; inlineInput.y = 0;
		inlineInput.lookX = 0; inlineInput.lookY = 0;
		locomotion._recenter = true;
		return;
	}
	_keys[e.code] = true;
	// Prevent page scroll on arrow keys / space when focused on canvas
	if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
		e.preventDefault();
	}
}
function onKeyUp(e) {
	_keys[e.code] = false;
}

// Mouse/touch look state
let _lookActive = false;

// Mouse position in NDC (-1..1), for the grab system (inline mode only)
let _mouseNDC = null;

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
	window.addEventListener('mouseup', () => {
		if (_lookActive && mouseDownPos && !mouseMoved) {
			// It was a click, not a drag — forward to canvas as a click
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

// ── Shared movement helpers (used by both inline + XR paths) ──

function applyMovement(rigTarget, axes, cameraYaw, delta) {
	_moveDir.set(axes.x, 0, axes.y);
	_moveDir.applyAxisAngle(_upAxis, cameraYaw);

	if (locomotion.mode === 'flight') {
		rigTarget.position.addScaledVector(_moveDir, FLIGHT_SPEED * delta);
	} else {
		_moveDir.y = 0;
		_moveDir.multiplyScalar(WALK_SPEED * delta);

		if (locomotion.grounded && locomotion.groundedPlayer) {
			// Grounded physics: convert rig position to foot, step through
			// collision, write back. Works whether rig is world.player or camera.
			const footPos = new Vector3(rigTarget.position.x, rigTarget.position.y - EYE_HEIGHT, rigTarget.position.z);
			locomotion.groundedPlayer.step(footPos, _moveDir, delta);
			rigTarget.position.x = footPos.x;
			rigTarget.position.y = footPos.y + EYE_HEIGHT;
			rigTarget.position.z = footPos.z;
		} else {
			rigTarget.position.x += _moveDir.x;
			rigTarget.position.z += _moveDir.z;
			rigTarget.position.y = locomotion.floorY + EYE_HEIGHT;
		}
	}
}

// Apply gravity when no horizontal input (still falls if airborne).
function applyGravity(rigTarget, delta) {
	if (!locomotion.grounded || !locomotion.groundedPlayer) return;
	const footPos = new Vector3(rigTarget.position.x, rigTarget.position.y - EYE_HEIGHT, rigTarget.position.z);
	locomotion.groundedPlayer.step(footPos, new Vector3(0, 0, 0), delta);
	rigTarget.position.x = footPos.x;
	rigTarget.position.y = footPos.y + EYE_HEIGHT;
	rigTarget.position.z = footPos.z;
}

export const LocomotionSystem = class extends createSystem({}) {
	init() {
		console.log('[locomotion] system registered & initialized ✓');
	}

	update(delta, _time) {
		const world = this.world;
		const a = getAdapter();
		a.sync(world);          // pick XR vs inline based on gamepad availability
		a.updateInline();       // advance inline edge buffers (no-op in XR)

		// Esc: recenter the rig to scene origin.
		if (locomotion._recenter) {
			locomotion._recenter = false;
			const rig = world.session ? world.player : world.camera;
			if (rig) {
				rig.position.set(0, 2, 5);
				_inlineYaw = 0;
				_inlinePitch = 0;
				rig.lookAt(0, 0, 0);
			}
			locomotion._flyTarget = null;
			locomotion.userActive = false;
			return;
		}

		// Fly-to-target (peer or recenter-via-UI). Takes priority over input.
		if (locomotion._flyTarget) {
			const rig = world.session ? world.player : world.camera;
			if (processFlyTarget(rig, delta)) return;
		}

		const hasSession = !!world.session;
		// The ONE structural branch: which Object3D does locomotion drive?
		// In XR, the camera is parented to world.player (the XROrigin rig),
		// so we move the rig. Inline, the camera IS the viewpoint.
		const rig = hasSession ? world.player : world.camera;
		if (!rig) return;

		// Inline look (mouse-drag): continuous deltas consumed each frame.
		// In XR, head-tracking drives the camera; this is a no-op (lookX/Y stay 0).
		const hasLookInput = Math.abs(inlineInput.lookX) > 0.0001 || Math.abs(inlineInput.lookY) > 0.0001;
		if (hasLookInput && !hasSession) {
			_inlineYaw -= inlineInput.lookX;
			_inlinePitch -= inlineInput.lookY;
			_inlinePitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, _inlinePitch));
			_euler.set(_inlinePitch, _inlineYaw, 0, 'YXZ');
			rig.quaternion.setFromEuler(_euler);
			inlineInput.lookX = 0;
			inlineInput.lookY = 0;
		}

		// ── Read input through the adapter (no session branching) ──
		const left = a.left;
		const right = a.right;
		const moveMag = left?.get2DInputValue(THUMBSTICK) ?? 0;
		const moveAxes = left?.getAxesValues(THUMBSTICK) ?? { x: 0, y: 0 };
		const hasMoveInput = moveMag > DEAD_ZONE;
		// Trigger counts as input too — so a stationary player clicking to
		// grab still drives the grab system (and keeps userActive asserted).
		const triggerHeld = right?.getButtonPressed(TRIGGER) ?? false;
		const triggerDown = right?.getButtonDown(TRIGGER) ?? false;
		const hasTriggerInput = triggerHeld || triggerDown;

		if (!hasMoveInput && !hasLookInput && !hasTriggerInput) {
			// No input this frame — stop moving, but DON'T clear userActive.
			// Clearing it would hand control back to CameraOrbitSystem, which
			// snaps the camera back to the orbit path. Once the visitor has
			// moved, they keep control until an explicit recenter (Esc).
			if (locomotion.grounded) applyGravity(rig, delta);

			// Teleport: if key held while idle, still show the ray
			if (locomotion.teleport && locomotion.teleport._keyHeld) {
				const aimDir = new Vector3();
				rig.getWorldDirection(aimDir);
				aimDir.y = 0.3;
				aimDir.normalize();
				const footPos = new Vector3(rig.position.x, rig.position.y - EYE_HEIGHT, rig.position.z);
				locomotion.teleport.update({
					camera: rig, isAiming: true, aimDirection: aimDir,
					shouldTeleport: false, playerPos: footPos,
				});
			}
			locomotion.enabled = false;
			return;
		}

		locomotion.userActive = true;
		locomotion.enabled = true;
		locomotion._flyTarget = null;  // any manual input cancels a fly

		// ── Movement: rotate input by camera yaw (camera-relative strafe) ──
		// In XR, yaw is derived from the camera world matrix (rig orientation).
		// Inline, we use our own _inlineYaw (set by mouse-drag look above).
		const cameraYaw = hasSession
			? Math.atan2(world.camera.matrixWorld.elements[8], world.camera.matrixWorld.elements[10])
			: _inlineYaw;

		if (hasMoveInput) {
			applyMovement(rig, moveAxes, cameraYaw, delta);
		} else if (locomotion.grounded && locomotion.groundedPlayer) {
			// No horizontal input but still in a grounded realm — apply gravity
			applyGravity(rig, delta);
		}

		// ── Right thumbstick: snap-turn + teleport (grounded realms only) ──
		// Reads through the adapter — works for both Arrow keys (inline) and
		// the right controller stick (XR). Edge-detected via getAxesEnteringState,
		// so we no longer need _xrSnapState / _xrTeleportEngaged latches.
		if (right && locomotion.grounded) {
			const rMag = right.get2DInputValue(THUMBSTICK);
			const rAxes = right.getAxesValues(THUMBSTICK);

			if (rMag >= SNAP_TURN_MAG) {
				// Stick angle: 0 = forward, ±π = back (y inverted on controllers)
				const angle = Math.atan2(rAxes.x, -rAxes.y);
				const absAngle = Math.abs(angle);

				if (absAngle < TELEPORT_FORWARD_MAX || absAngle > TELEPORT_BACKWARD_MIN) {
					// TELEPORT ZONE (forward/back) — aim the ray
					if (locomotion.teleport) {
						const aimDir = new Vector3();
						rig.getWorldDirection(aimDir);
						aimDir.y = 0.3;
						aimDir.normalize();
						const footPos = new Vector3(rig.position.x, rig.position.y - EYE_HEIGHT, rig.position.z);
						locomotion.teleport.update({
							camera: rig, isAiming: true, aimDirection: aimDir,
							shouldTeleport: false, playerPos: footPos,
						});
						locomotion._teleportAiming = true;
					}
				} else if (absAngle >= SNAP_TURN_MIN && absAngle <= SNAP_TURN_MAX) {
					// SNAP TURN ZONE — edge-triggered 45° rotation
					if (right.getAxesEnteringState(THUMBSTICK, _axesStateFromAngle(angle))) {
						rig.rotateY((angle > 0 ? -1 : 1) * SNAP_ANGLE);
						if (locomotion.vignette) locomotion.vignette.pulse();
					}
				}
			} else {
				// Stick released below threshold — fire teleport if we were aiming
				if (locomotion._teleportAiming && locomotion.teleport) {
					const footPos = new Vector3(rig.position.x, rig.position.y - EYE_HEIGHT, rig.position.z);
					const teleported = locomotion.teleport.update({
						camera: rig, isAiming: false, aimDirection: null,
						shouldTeleport: true, playerPos: footPos,
					});
					if (teleported) {
						rig.position.x = footPos.x;
						rig.position.y = footPos.y + EYE_HEIGHT;
						rig.position.z = footPos.z;
						locomotion.groundedPlayer?.velocity.set(0, 0, 0);
						if (locomotion.vignette) locomotion.vignette.pulse(0.8);
					}
				}
				locomotion._teleportAiming = false;

				// Hide teleport visuals when stick is centered
				if (locomotion.teleport) {
					locomotion.teleport.update({
						camera: rig, isAiming: false, aimDirection: null,
						shouldTeleport: false, playerPos: null,
					});
				}
			}
		}

		// Desktop teleport (Space): hold to aim, release to fire.
		// Not in the adapter (Space isn't a gamepad axis) — keep the
		// existing Space-key path for inline mode.
		if (!hasSession && locomotion.teleport) {
			const wasHeld = locomotion.teleport._keyHeld;
			if (wasHeld || locomotion.teleport._wasHeld) {
				const aimDir = new Vector3();
				rig.getWorldDirection(aimDir);
				aimDir.y = Math.abs(aimDir.y) > 0.7 ? 0.5 * Math.sign(aimDir.y) : 0.3;
				aimDir.normalize();
				const footPos = new Vector3(rig.position.x, rig.position.y - EYE_HEIGHT, rig.position.z);
				locomotion.teleport.update({
					camera: rig,
					isAiming: wasHeld,
					aimDirection: aimDir,
					shouldTeleport: !wasHeld && locomotion.teleport._wasHeld,
					playerPos: footPos,
				});
				locomotion.teleport._wasHeld = wasHeld;
				footPos.y += EYE_HEIGHT;
				rig.position.copy(footPos);
				if (wasHeld) {
					locomotion.userActive = true;
					return;  // skip grab while aiming teleport
				}
			}
		}

		// ── Comfort vignette: XR only. On desktop the 3D tube occludes the
		// whole view, so we disable it entirely for inline mode. ──
		if (locomotion.vignette) {
			if (hasSession) {
				locomotion.vignette.setEnabled(true);
				const norm = Math.max(0, Math.min(1, (moveMag - DEAD_ZONE) / (1 - DEAD_ZONE)));
				locomotion.vignette.update(norm);
			} else {
				locomotion.vignette.setEnabled(false);
			}
		}

		// ── Grab system: ray source is the only session-dependent part ──
		// triggerHeld / triggerDown already read above (in the input check).
		if (locomotion.grab) {
			if (hasSession) {
				// XR: right controller ray space origin + forward direction
				const raySpace = world.player?.raySpaces?.right;
				if (raySpace) {
					raySpace.getWorldPosition(_grabOrigin);
					raySpace.getWorldQuaternion(_grabQuat);
					_grabDir.copy(_forward3).applyQuaternion(_grabQuat);
					locomotion.grab.update({
						controllerOrigin: _grabOrigin,
						controllerDir: _grabDir,
						triggerHeld,
						triggerDown,
					});
				}
			} else if (_mouseNDC) {
				// Desktop: camera + pointer NDC + mouse held
				locomotion.grab.update({
					camera: rig,
					pointerNDC: _mouseNDC,
					mouseHeld: triggerHeld,
					mouseDown: triggerDown,
				});
			}
		}
	}
};

// ── Helper: map a thumbstick angle (atan2(x, -y)) to an AxesState ──
// so the adapter's edge detection works for snap-turn.
function _axesStateFromAngle(angle) {
	const absAngle = Math.abs(angle);
	if (absAngle < TELEPORT_FORWARD_MAX || absAngle > TELEPORT_BACKWARD_MIN) {
		// forward/back — treat as Up/Down for edge detection
		return angle > 0 ? AxesState.Down : AxesState.Up;
	}
	if (angle > 0) return AxesState.Right;
	return AxesState.Left;
}
