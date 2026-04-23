import * as server from '../entries/pages/games/_page.server.js';

export const index = 20;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/games/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/games/+page.server.js";
export const imports = ["_app/immutable/nodes/20.BC1KX-mt.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/7EQ61Un6.js","_app/immutable/chunks/CC5H2EQ_.js","_app/immutable/chunks/DVpYTlYi.js","_app/immutable/chunks/BrvIvy0u.js","_app/immutable/chunks/CuzFCTBL.js","_app/immutable/chunks/S4Hihn2m.js","_app/immutable/chunks/BVz-wF_9.js","_app/immutable/chunks/C0IeHCTK.js","_app/immutable/chunks/Ci2E9ob5.js"];
export const stylesheets = ["_app/immutable/assets/20.BEXHxWT4.css"];
export const fonts = [];
