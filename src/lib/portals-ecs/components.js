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
// State machine: idle → focused → entering → inside → idle
export const PortalGate = createComponent('portal-gate', {
	portalId:      { type: Types.String,  default: '' },
	galaxyId:      { type: Types.String,  default: '' },
	portalName:    { type: Types.String,  default: '' },
	portalDesc:    { type: Types.String,  default: '' },
	colorPrimary:  { type: Types.Color,   default: [0.79, 0.66, 0.49, 1] }, // #c9a87c
	colorBg:       { type: Types.Color,   default: [1, 0.97, 0.88, 1] },
	videoUrl:      { type: Types.String,  default: '' },
	writingsCount: { type: Types.Int32,   default: 0 },
	// idle = resting in rail, focused = user touched/hovered, entering = hold timer counting, inside = portal interior active
	state:         { type: Types.String,  default: 'idle' },
	focusTimer:    { type: Types.Float32, default: 0 },  // seconds held in focused state
	holdThreshold: { type: Types.Float32, default: 1.2 }, // seconds to trigger enter
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

// ─── World Mode ────────────────────────────────────────────────────
// Single entity, singleton. Tracks whether we're in the spatial index
// or inside a portal interior. Drives which systems are active.
export const WorldMode = createComponent('world-mode', {
	mode:              { type: Types.String, default: 'index' }, // 'index' | 'transitioning' | 'interior'
	activePortalId:    { type: Types.String, default: '' },
	transitionProgress: { type: Types.Float32, default: 0 },     // 0→1 during 'transitioning'
	cinematicTimer:    { type: Types.Float32, default: 0 },     // entry cinematic elapsed
});

// ─── Narrative State ───────────────────────────────────────────────
// The conductor. Lives on a singleton entity inside the portal interior.
// stateIndex advances when user interacts with crystals. Each state
// derives a new lighting palette from the portal's base color.
export const NarrativeState = createComponent('narrative-state', {
	stateIndex:         { type: Types.Int32,   default: 0 },
	targetStateIndex:   { type: Types.Int32,   default: 0 },
	transitionProgress:  { type: Types.Float32, default: 1 },    // 1 = settled, 0 = just changed
	transitionSpeed:    { type: Types.Float32, default: 0.8 },
	maxStates:          { type: Types.Int32,   default: 3 },
});

// ─── Portal Ring (interior mode) ──────────────────────────────────
// The AR portal mouth. Proximity-based interaction — no tap needed.
// Camera distance drives scale, emissive, particle speed.
export const PortalRing = createComponent('portal-ring', {
	radius:        { type: Types.Float32, default: 0.5 },
	proximity:     { type: Types.Float32, default: 0 },   // 0=far, 1=touching
	activationRadius: { type: Types.Float32, default: 2.5 },
	triggerDistance:  { type: Types.Float32, default: 0.6 },
	pulsePhase:    { type: Types.Float32, default: 0 },
});

// ─── Interior Decoration ──────────────────────────────────────────
// Crystals, pillars, halos inside the portal interior.
// Floats with offset sine waves. Reacts to narrative state.
export const InteriorDecoration = createComponent('interior-decoration', {
	decoType:    { type: Types.String,  default: 'crystal' }, // crystal | pillar | halo
	floatPhase:  { type: Types.Float32, default: 0 },
	floatSpeed:  { type: Types.Float32, default: 1.0 },
	floatAmp:    { type: Types.Float32, default: 0.05 },
	baseY:       { type: Types.Float32, default: 0 },
	spawnDelay:  { type: Types.Float32, default: 0 },   // entry cinematic: seconds before materialize
	materialized: { type: Types.Float32, default: 0 },  // 0→1 opacity/scale during cinematic
});

// ─── Crystal Test Component ────────────────────────────────────────
// Component for testing crystal and spirit animations
export const CrystalTest = createComponent('crystal-test', {
	testType:       { type: Types.String,  default: 'simple' }, // 'simple', 'ultra', 'portal'
	colorIndex:     { type: Types.Float32, default: 0 },
	isAnimating:    { type: Types.Boolean, default: true },
	rotationSpeed:  { type: Types.Float32, default: 0.01 },
	floatSpeed:     { type: Types.Float32, default: 0.001 },
	scale:          { type: Types.Float32, default: 1.0 },
	// Reference to GLB model if using portal test
	glbModel:       { type: Types.String,  default: '' },
	// Test configuration
	text:           { type: Types.String,  default: '' },
	position:       { type: Types.Vec3,    default: [0, 0, 0] },
});
