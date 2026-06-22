// Barrel exports for the Portals ECS module
export { PortalGate, TabLayout, BumperPhase, ReactiveBackground, AmbientParticle, CarouselSlide } from './components.js';
export { TabSystem, BumperSystem, BackgroundSystem, ParticleSystem, CarouselSystem, PortalInputSystem } from './systems.js';
export { initPortalWorld, destroyPortalWorld } from './world.js';
export { default as PortalWorld } from './PortalWorld.svelte';
