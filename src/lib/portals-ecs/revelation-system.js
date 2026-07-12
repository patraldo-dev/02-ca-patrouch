// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict type-checking (jsconfig.json).
// ═══════════════════════════════════════════════════════════
//  revelation-system.js
//  Proximity-triggered revelation. When the visitor approaches a tagged
//  object, it glows brighter and a fragment of text is revealed. Move away
//  and it fades. This is what turns movement into discovery — you explore
//  to find meaning, not just to look around.
//
//  This is the foundation for multiple modes:
//    - Contemplative: just revelation (this system alone)
//    - Treasure hunt: + collection (future)
//    - Mission: + objectives (future)
//    - Branching story: + state transitions (future, via NarrativeState)
//
//  Objects opt in by carrying userData.revelation = { text, lang, glowMesh? }.
//  world-builder attaches this to portal cubes; themed scenes can tag
//  crystals/gateways the same way.
// ═══════════════════════════════════════════════════════════
import { createSystem } from 'elics';
import { Vector3 } from 'three';

const REVEAL_RADIUS = 4.0;    // distance at which revelation triggers
const FADE_RADIUS = 6.0;      // distance at which it fully fades out
const COOLDOWN_MS = 6000;     // don't re-reveal the same object too quickly

const _playerPos = new Vector3();

export const RevelationSystem = class extends createSystem({}) {
	init() {
		console.log('[revelation] system registered & initialized ✓');
		this._lastRevealed = null;       // object last revealed
		this._lastRevealTime = 0;
	}

	update(delta, _time) {
		const world = this.world;
		// Revelation works both inline (orbit camera) and in XR (player rig).
		// Use whichever position source is available.
		let origin;
		if (world.session && world.player) {
			world.player.getWorldPosition(_playerPos);
			origin = _playerPos;
		} else if (world.camera) {
			world.camera.getWorldPosition(_playerPos);
			origin = _playerPos;
		} else {
			return;
		}

		const targets = world._interactionTargets || [];
		if (!targets.length) return;

		// Find the closest revelation object within range.
		let closest = null;
		let closestDist = Infinity;
		let targetsWithRev = 0;
		for (const target of targets) {
			const rev = target.userData?.revelation;
			if (!rev?.text) continue;
			targetsWithRev++;
			const dist = origin.distanceTo(target.position);
			if (dist < closestDist) { closestDist = dist; closest = target; }
		}

		// Periodic diagnostic.
		if (!this._lastDiag || performance.now() - this._lastDiag > 2000) {
			this._lastDiag = performance.now();
			console.log('[revelation] targets:', targets.length,
				'withRev:', targetsWithRev,
				'closest:', closestDist === Infinity ? 'none' : closestDist.toFixed(2),
				'reveal<', REVEAL_RADIUS, '?', closestDist < REVEAL_RADIUS);
		}

		// If nothing in range, fade the current glow (if any) and return.
		if (!closest || closestDist > FADE_RADIUS) {
			this._fadeGlow();
			return;
		}

		// Within reveal radius → reveal (glow + text).
		if (closestDist < REVEAL_RADIUS) {
			const now = performance.now();
			// Cooldown: don't re-trigger the same object's text immediately.
			if (closest === this._lastRevealed && now - this._lastRevealTime < COOLDOWN_MS) {
				return;
			}
			this._reveal(closest);
			this._lastRevealed = closest;
			this._lastRevealTime = now;
		}
	}

	_reveal(target) {
		const rev = target.userData.revelation;
		if (!rev) return;

		// Glow the target's materials brighter.
		const mats = target.material;
		if (Array.isArray(mats)) {
			mats.forEach(m => { if (m && m.emissive) m.emissive.setScalar(0.5); });
		} else if (mats?.emissive) {
			mats.emissive.setScalar(0.5);
		}
		// For MeshBasicMaterial (no emissive), boost opacity slightly.
		if (Array.isArray(mats)) {
			mats.forEach(m => { if (m && !m.emissive && m.opacity != null) { m._revOp = m.opacity; m.opacity = 1; } });
		}

		// Show the revelation text via the shared overlay (imported lazily to
		// avoid circular deps — showOverlay is module-scoped in world-builder).
		if (rev.text && world_showOverlay) {
			world_showOverlay(rev.text);
		}
		console.log('[revelation] revealed:', rev.text?.slice(0, 60));
	}

	_fadeGlow() {
		if (!this._lastRevealed) return;
		const target = this._lastRevealed;
		const mats = target.material;
		if (Array.isArray(mats)) {
			mats.forEach(m => {
				if (m?.emissive) m.emissive.setScalar(0);
				if (m?._revOp != null) { m.opacity = m._revOp; m._revOp = null; }
			});
		} else if (mats?.emissive) {
			mats.emissive.setScalar(0);
		}
	}
};

// Set by world-builder.js on import (avoids circular dependency).
let world_showOverlay = null;
export function setShowOverlay(fn) { world_showOverlay = fn; }
