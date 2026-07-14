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
import { Vector3, Euler } from 'three';
import { InputComponent } from '@iwsdk/core';

const THUMBSTICK = InputComponent.Thumbstick; // 'xr-standard-thumbstick'
const WALK_SPEED = 1.8;
const FLIGHT_SPEED = 3.0;
const DEAD_ZONE = 0.1;
const EYE_HEIGHT = 1.6;
const DEFAULT_FLOOR_Y = -1.5;
const LOOK_SENSITIVITY = 0.003;

// Preallocated temporaries (no per-frame alloc).
const _moveDir = new Vector3();
const _upAxis = new Vector3(0, 1, 0);
const _euler = new Euler(0, 0, 0, 'YXZ');

// ── Inline input state (populated by keyboard/touch listeners) ──
// { x: -1..1 (strafe), y: -1..1 (forward), lookX: delta, lookY: delta }
export const inlineInput = { x: 0, y: 0, lookX: 0, lookY: 0 };

// Camera yaw/pitch for inline look (persisted across frames).
let _inlineYaw = 0;
let _inlinePitch = 0;

// Module-level locomotion state. The orbit system reads `userActive`.
export const locomotion = {
	mode: 'walk',
	floorY: DEFAULT_FLOOR_Y,
	userActive: false,
	enabled: false,
};

export function configureLocomotion(config) {
	const envType = config?.environment?.type;
	locomotion.mode = envType === 'space' ? 'flight' : 'walk';
	locomotion.floorY = config?.camera?.floor_y ?? DEFAULT_FLOOR_Y;
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
		mouseDownPos = null;
		mouseMoved = false;
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
				locomotion.userActive = false;
				return;
			}
			updateInlineInputFromKeys();
			const hasMoveInput = Math.abs(inlineInput.x) > 0.01 || Math.abs(inlineInput.y) > 0.01;
			const hasLookInput = Math.abs(inlineInput.lookX) > 0.0001 || Math.abs(inlineInput.lookY) > 0.0001;

			if (!hasMoveInput && !hasLookInput) {
				locomotion.userActive = false;
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

			// Movement: build direction from input, rotate by camera yaw
			if (hasMoveInput) {
				_moveDir.set(inlineInput.x, 0, inlineInput.y);
				_moveDir.applyAxisAngle(_upAxis, _inlineYaw);

				if (locomotion.mode === 'flight') {
					cam.position.addScaledVector(_moveDir, FLIGHT_SPEED * delta);
				} else {
					_moveDir.y = 0;
					cam.position.x += _moveDir.x * WALK_SPEED * delta;
					cam.position.z += _moveDir.z * WALK_SPEED * delta;
					cam.position.y = locomotion.floorY + EYE_HEIGHT;
				}
			}
			return;
		}

		// ── XR session mode: gamepad input (existing path) ──
		locomotion.enabled = true;

		// On session start, place the player rig facing the scene center.
		if (!locomotion._rigPlaced && world.player) {
			const rad = 3;
			const floorY = locomotion.mode === 'walk' ? locomotion.floorY + EYE_HEIGHT : 1;
			world.player.position.set(0, floorY, rad);
			world.player.lookAt(0, floorY, 0);
			locomotion._rigPlaced = true;
		}

		// Flowerbed-style first-person: hide controller models.
		const va = world.input?.visualAdapters;
		if (va) {
			for (const side of ['left', 'right']) {
				const model = va[side]?.value?.visual?.model;
				if (model && model.visible !== false) model.visible = false;
			}
		}

		const left = world.input?.gamepads?.left;
		if (!left) return;

		const value = left.get2DInputValue(THUMBSTICK) ?? 0;
		if (value < DEAD_ZONE) {
			locomotion.userActive = false;
			return;
		}
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
			player.position.x += _moveDir.x * WALK_SPEED * delta;
			player.position.z += _moveDir.z * WALK_SPEED * delta;
			player.position.y = locomotion.floorY + EYE_HEIGHT;
		}
	}
};
