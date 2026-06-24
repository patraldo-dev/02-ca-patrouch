// Barrel exports for the Portals ECS module
export { PortalGate, TabLayout, BumperPhase, ReactiveBackground, AmbientParticle, CarouselSlide, WorldMode, NarrativeState, PortalRing, InteriorDecoration } from './components.js';
export { TabSystem, BumperSystem, BackgroundSystem, ParticleSystem, CarouselSystem, PortalInputSystem, FocusHoldSystem, NarrativeSystem, ProximityRingSystem, EntryCinematicSystem, CrystalInteractionSystem } from './systems.js';
export { initPortalWorld, destroyPortalWorld } from './world.js';
