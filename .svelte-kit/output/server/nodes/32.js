import * as server from '../entries/pages/write/_username_/_page.server.js';

export const index = 32;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/write/_username_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/write/[username]/+page.server.js";
export const imports = ["_app/immutable/nodes/32.BgsFeAvx.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/7EQ61Un6.js","_app/immutable/chunks/CC5H2EQ_.js","_app/immutable/chunks/DVpYTlYi.js","_app/immutable/chunks/D8ru06rp.js","_app/immutable/chunks/B-LrS94s.js","_app/immutable/chunks/BrvIvy0u.js","_app/immutable/chunks/CuzFCTBL.js","_app/immutable/chunks/Ci2E9ob5.js"];
export const stylesheets = ["_app/immutable/assets/32.BC7HvbFF.css"];
export const fonts = [];
