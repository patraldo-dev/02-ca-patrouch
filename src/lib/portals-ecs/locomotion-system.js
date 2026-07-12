// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict type-checking (jsconfig.json).
// ═══════════════════════════════════════════════════════════
//  locomotion-system.js
//  Cross-platform locomotion for the portals. One codepath, driven by the
//  XR left-thumbstick — which IWER's Play Mode remaps WASD onto on desktop.
//  Validated against the WebXR First Steps tutorial (2026-07-10).
//
//  Two movement modes, selected by the current portal config:
//    • "flight"  — starfield hub: full 6-DOF drift (no floor).
//    • "walk"    — floored worlds: movement constrained to the ground plane.
// ═══════════════════════════════════════════════════════════
import { createSystem } from 'elics';
import { Vector3 } from 'three';
import { InputComponent } from '@iwsdk/core';

// Tuning
const WALK_SPEED = 1.8;        // m/s
const FLIGHT_SPEED = 3.0;      // m/s
const DEAD_ZONE = 0.1;
const EYE_HEIGHT = 1.6;        // above floor in walk mode
const DEFAULT_FLOOR_Y = -1.5;  // most scenes; ocean is -2.5 (read from config if present)

// Thumbstick component id in IWSDK's StatefulGamepad.
const THUMBSTICK = InputComponent.Thumbstick; // 'xr-standard-thumbstick'

// Preallocated temporaries — NEVER allocate in update() (IWSDK perf rule).
const _moveDir = new Vector3();
const _upAxis = new Vector3(0, 1, 0);

// Module-level locomotion state. The orbit system reads `userActive` to know
// when to yield camera control.
export const locomotion = {
	mode: 'walk',        // 'flight' | 'walk'
	floorY: DEFAULT_FLOOR_Y,
	userActive: false,   // true once the visitor moves (thumbstick beyond deadzone)
	enabled: false,      // true only while an XR session is active
};

/**
 * Called by world-builder.rebuildScene on every scene swap so the locomotion
 * system knows whether this scene is floorless (hub) or grounded (world).
 */
export function configureLocomotion(config) {
	const envType = config?.environment?.type;
	locomotion.mode = envType === 'space' ? 'flight' : 'walk';
	// Scenes hardcode floor at y=-1.5 (ocean at -2.5). There's no canonical
	// floor field on the config today, so default and let ocean override if
	// a floor_y ever appears; otherwise the visitor floats at a sane height.
	locomotion.floorY = config?.camera?.floor_y ?? DEFAULT_FLOOR_Y;
}

/**
 * LocomotionSystem — moves world.player (the XROrigin group the camera is
 * parented to) from the left thumbstick each frame. Mouse-look is free:
 * IWER updates the headset, and because the camera is a child of the player
 * rig, head rotation comes for free.
 */
export const LocomotionSystem = class extends createSystem({}) {
	init() {
		console.log('[locomotion] system registered & initialized ✓');
	}
	update(delta, _time) {
		const world = this.world;
		// Only drive movement while an XR session is active. In inline mode
		// world.input.gamepads is unpopulated and CameraOrbitSystem owns the camera.
		let hasSession = false;
		try { hasSession = !!world.session; } catch (e) {}
		// Periodic diagnostic (crash-proof) so we can see session state.
		if (!locomotion._lastDiag || performance.now() - locomotion._lastDiag > 2000) {
			locomotion._lastDiag = performance.now();
			let vis = '?', gp = '?', player = '?';
			try { vis = String(world.visibilityState?.peek?.() ?? world.visibilityState ?? '?'); } catch (e) {}
			try { gp = world.input?.gamepads?.left ? 'present' : 'none'; } catch (e) {}
			try { player = world.player ? 'present' : 'MISSING'; } catch (e) {}
			console.log('[locomotion] tick — session:', hasSession, '| vis:', vis, '| gamepads.left:', gp, '| player:', player);
		}
		if (!hasSession) {
			locomotion.enabled = false;
			locomotion.userActive = false;
			locomotion._rigPlaced = false;
			return;
		}
		locomotion.enabled = true;

		// On session start, place the player rig at a sensible vantage facing
		// the scene center — so entering XR sees the content (not empty space).
		// This runs once per session; world-builder skips rig placement in
		// inline mode to avoid skewing the orbit camera / tap raycast.
		if (!locomotion._rigPlaced && world.player) {
			const rad = 3;
			const floorY = locomotion.mode === 'walk' ? locomotion.floorY + EYE_HEIGHT : 1;
			world.player.position.set(0, floorY, rad);
			world.player.lookAt(0, floorY, 0);
			locomotion._rigPlaced = true;
		}

		// Flowerbed-style first-person: hide any controller/hand models so the
		// visitor is just a camera moving through the world (no visible hands).
		// The gamepads stay functional for input — only the visual models hide.
		// Re-checked each frame because visuals connect lazily on session start.
		const va = world.input?.visualAdapters;
		if (va) {
			for (const side of ['left', 'right']) {
				const model = va[side]?.value?.visual?.model;
				if (model && model.visible !== false) model.visible = false;
			}
		}

		const left = world.input?.gamepads?.left;
		// One-shot diagnostic: log the input state a few times after entering a
		// session so we can see whether the emulated gamepad is populated.
		if (!locomotion._diagLogged) {
			console.log('[locomotion] session active. world.input=', world.input ? 'present' : 'MISSING',
				'gamepads=', world.input?.gamepads ? '{left:' + typeof world.input.gamepads.left + ', right:' + typeof world.input.gamepads.right + '}' : 'MISSING',
				'player=', world.player ? 'present' : 'MISSING');
			locomotion._diagLogged = true;
			locomotion._diagStart = performance.now();
		}
		// Re-log once after a couple seconds (controllers may connect late).
		if (locomotion._diagLogged && !locomotion._diagLogged2 && performance.now() - locomotion._diagStart > 2500) {
			console.log('[locomotion] +2.5s. gamepads.left=', typeof world.input?.gamepads?.left,
				'right=', typeof world.input?.gamepads?.right);
			locomotion._diagLogged2 = true;
		}
		if (!left) return;

		const value = left.get2DInputValue(THUMBSTICK) ?? 0;
		// Raw axes diagnostic — log the actual x/y the gamepad reports, so we
		// can see whether Play Mode's WASD reaches the thumbstick at all.
		const rawAxes = left.getAxesValues?.(THUMBSTICK);
		if (!locomotion._lastAxesDiag || performance.now() - locomotion._lastAxesDiag > 1500) {
			locomotion._lastAxesDiag = performance.now();
			console.log('[locomotion] axes — value:', value?.toFixed(3),
				'| raw:', rawAxes ? `{x:${rawAxes.x?.toFixed(3)}, y:${rawAxes.y?.toFixed(3)}}` : 'none',
				'| THUMBSTICK id:', THUMBSTICK);
		}
		if (value > DEAD_ZONE && !locomotion._diagMoved) {
			console.log('[locomotion] thumbstick input detected! value=', value.toFixed(2));
			locomotion._diagMoved = true;
		}
		if (value < DEAD_ZONE) {
			locomotion.userActive = false;
			return;
		}
		locomotion.userActive = true;

		// IWSDK's StatefulGamepad has get2DInputValue (magnitude) but NOT
		// get2DInputAngle (that's gamepad-wrapper's API). Use getAxesValues for
		// the x/y directly: y is forward/back (-1 = up/forward), x is strafe.
		const axes = left.getAxesValues?.(THUMBSTICK) ?? { x: 0, y: 0 };
		// Build a movement vector from the raw stick axes, then rotate by the
		// camera's yaw so "forward" is where the visitor looks.
		_moveDir.set(axes.x, 0, axes.y);   // y positive = stick down/backward → +Z
		const cam = world.camera;
		const cameraYaw = Math.atan2(
			cam.matrixWorld.elements[8],
			cam.matrixWorld.elements[10],
		);
		_moveDir.applyAxisAngle(_upAxis, cameraYaw);

		const player = world.player;
		// Diagnostic: log when movement is actually applied (mode + position delta).
		if (!locomotion._lastMoveDiag || performance.now() - locomotion._lastMoveDiag > 1000) {
			locomotion._lastMoveDiag = performance.now();
			console.log('[locomotion] MOVING — mode:', locomotion.mode,
				'| player.pos:', `(${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)})`,
				'| cam.worldPos:', `(${cam.matrixWorld.elements[12].toFixed(2)}, ${cam.matrixWorld.elements[14].toFixed(2)})`);
		}
		if (locomotion.mode === 'flight') {
			// Free drift along the look direction (full horizontal; gentle
			// vertical follow of the headset pitch so you rise/dip naturally).
			player.position.addScaledVector(_moveDir, FLIGHT_SPEED * delta);
		} else {
			// Walk: constrain to the floor plane at eye height.
			_moveDir.y = 0;
			player.position.x += _moveDir.x * WALK_SPEED * delta;
			player.position.z += _moveDir.z * WALK_SPEED * delta;
			// Hold eye height above the floor. The headset can still look
			// around freely; only the rig's vertical position is locked.
			player.position.y = locomotion.floorY + EYE_HEIGHT - 0; // rig origin → camera adds nothing here
		}
	}
};
