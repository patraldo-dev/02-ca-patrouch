// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict type-checking (jsconfig.json).
// ═══════════════════════════════════════════════════════════
//  interaction-system.js
//  XR controller-ray selection. Casts a ray from the right controller's
//  raySpace forward; on trigger click, selects the portal/object hit.
//
//  In IWER Play Mode: mouse-look aims the right controller, left-click is
//  the trigger — so you look at a cube, click, and navigate. Same codepath
//  works with a real headset's right controller + trigger.
// ═══════════════════════════════════════════════════════════
import { createSystem } from 'elics';
import { Raycaster, Vector3, Quaternion } from 'three';
import { InputComponent } from '@iwsdk/core';

const TRIGGER = InputComponent.Trigger;   // 'xr-standard-trigger'
const RAY_LENGTH = 10;                     // max selection distance

// Preallocated temporaries (no per-frame alloc — IWSDK perf rule).
const _raycaster = new Raycaster();
const _origin = new Vector3();
const _direction = new Vector3();
const _quat = new Quaternion();
const _forward = new Vector3(0, 0, -1);

export const InteractionSystem = class extends createSystem({}) {
	init() {
		console.log('[interaction] system registered & initialized ✓');
		this._triggerPrev = false;
	}

	update(delta, _time) {
		const world = this.world;
		if (!world.session) return;

		const right = world.input?.gamepads?.right;
		if (!right) return;

		// Edge-detected trigger click (fires once per press, not every frame held).
		const triggerNow = right.getButtonPressed(TRIGGER);
		const clicked = triggerNow && !this._triggerPrev;
		this._triggerPrev = triggerNow;

		// Get the right controller's ray space — this is where the ray originates.
		// In IWER Play Mode, mouse-look aims this; on a headset, it's the controller.
		const raySpace = world.player?.raySpaces?.right;
		if (!raySpace) return;

		// Compute ray origin + direction in world space from the raySpace transform.
		raySpace.getWorldPosition(_origin);
		raySpace.getWorldQuaternion(_quat);
		_direction.copy(_forward).applyQuaternion(_quat);
		_raycaster.set(_origin, _direction);
		_raycaster.far = RAY_LENGTH;

		// Raycast against the current scene's interactive targets.
		const targets = world._interactionTargets || [];
		if (!targets.length) return;

		const hits = _raycaster.intersectObjects(targets, true);
		const hit = hits.length > 0 ? hits[0] : null;

		// Walk up the object tree to find one with userData.portalId (themed scenes
		// use Groups; starfield uses Meshes directly).
		let portalId = null;
		if (hit) {
			let obj = hit.object;
			while (obj && !obj.userData?.portalId) obj = obj.parent;
			portalId = obj?.userData?.portalId || null;
		}

		// On click: navigate to the targeted portal.
		if (clicked && portalId && world._onNavigate) {
			console.log('[interaction] trigger → navigating to:', portalId);
			world._onNavigate(portalId);
		}
	}
};
