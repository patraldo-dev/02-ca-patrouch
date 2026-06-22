/**
 * ECS Component Definitions for the Portals Page
 *
 * Data-oriented components following elics/IWSDK patterns.
 * Components are pure data — systems contain all logic.
 *
 * Types reference: elics Types enum (Int8, Int16, Int32, Entity, Float32,
 * Float64, Boolean, String, FilePath, Object, Vec2, Vec3, Vec4, Color, Enum)
 *
 * IMPORTANT: Never store Three.js objects in components. Use Object type
 * sparingly only for non-ECS references (textures, geometries managed
 * outside the Transform system). Position/rotation/scale go on Transform.
 */

import { createComponent, Types } from '@iwsdk/core';

// ─── Portal Gate ────────────────────────────────────────────────────
// One per portal. Carries theme identity + interaction state.
// Paired with a Transform for spatial position in the rail.
export const PortalGate = createComponent('portal-gate', {
	portalId:      { type: Types.String,  default: '' },
	galaxyId:      { type: Types.String,  default: '' },
	portalName:    { type: Types.String,  default: '' },
	portalDesc:    { type: Types.String,  default: '' },
	colorPrimary:  { type: Types.Color,   default: [0.79, 0.66, 0.49, 1] }, // #c9a87c
	colorBg:       { type: Types.Color,   default: [1, 0.97, 0.88, 1] },
	videoUrl:      { type: Types.String,  default: '' },
	writingsCount: { type: Types.Int32,   default: 0 },
	// dormant = hidden, idle = visible, focused = active tab, entering = AR transition
	state:         { type: Types.String,  default: 'idle' },
});

// ─── Tab Layout ─────────────────────────────────────────────────────
// Spatial layout data for the left-rail tabs. Drives slide animation.
// The TabSystem reads these values and writes to Transform via vector views.
export const TabLayout = createComponent('tab-layout', {
	railIndex:       { type: Types.Int32,   default: 0 },
	galaxyGroup:     { type: Types.Int32,   default: 0 }, // section index in rail
	restX:           { type: Types.Float32, default: 0 }, // resting position in rail
	restY:           { type: Types.Float32, default: 0 },
	targetX:         { type: Types.Float32, default: 0 }, // animated target (where it slides to)
	targetY:         { type: Types.Float32, default: 0 },
	currentX:        { type: Types.Float32, default: 0 }, // actual interpolated position
	currentY:        { type: Types.Float32, default: 0 },
	springVelocity:  { type: Types.Float32, default: 0 }, // velocity for spring physics
	width:           { type: Types.Float32, default: 0.12 }, // in world units
	height:          { type: Types.Float32, default: 0.08 },
	isHovered:       { type: Types.Boolean, default: false },
});

// ─── Bumper Phase ───────────────────────────────────────────────────
// Attached to a single controller entity for the brand intro animation.
// BumperSystem runs until phase reaches 'done', then the query empties.
export const BumperPhase = createComponent('bumper-phase', {
	phase:     { type: Types.String,  default: 'converge' }, // converge → hold → shatter → done
	elapsed:   { type: Types.Float32, default: 0 },
	duration:  { type: Types.Float32, default: 2.5 }, // total bumper time
	particleCount: { type: Types.Int32, default: 200 },
});

// ─── Reactive Background ────────────────────────────────────────────
// Lives on one entity. BackgroundSystem lerps colors toward the focused portal.
export const ReactiveBackground = createComponent('reactive-background', {
	colorA:       { type: Types.Vec3, default: [0.05, 0.05, 0.08] }, // current top
	colorB:       { type: Types.Vec3, default: [0.02, 0.02, 0.04] }, // current bottom
	targetColorA: { type: Types.Vec3, default: [0.05, 0.05, 0.08] }, // lerp target
	targetColorB: { type: Types.Vec3, default: [0.02, 0.02, 0.04] },
	driftSpeed:   { type: Types.Float32, default: 0.5 }, // lerp speed
});

// ─── Ambient Particle ───────────────────────────────────────────────
// Dust motes floating upward. Many entities, each with this + Transform.
// ParticleSystem handles spawn/movement/recycle.
export const AmbientParticle = createComponent('ambient-particle', {
	velocityX:  { type: Types.Float32, default: 0 },
	velocityY:  { type: Types.Float32, default: 0.01 },
	velocityZ:  { type: Types.Float32, default: 0 },
	lifespan:   { type: Types.Float32, default: 10 },
	age:        { type: Types.Float32, default: 0 },
	size:       { type: Types.Float32, default: 0.003 },
});

// ─── Carousel Slide ─────────────────────────────────────────────────
// The hero carousel at the top. One entity per portal with a video.
// CarouselSystem cycles opacity and dispatches state changes.
export const CarouselSlide = createComponent('carousel-slide', {
	portalId:    { type: Types.String,  default: '' },
	opacity:     { type: Types.Float32, default: 0 },
	isActive:    { type: Types.Boolean, default: false },
	cycleTimer:  { type: Types.Float32, default: 0 },
	cycleDuration: { type: Types.Float32, default: 6 }, // seconds per slide
	// Non-TypedArray reference for texture (managed outside columnar storage)
	textureRef:  { type: Types.Object,  default: null },
});
