import * as server from '../entries/pages/games/_page.server.js';

export const index = 20;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/games/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/games/+page.server.js";
export const imports = ["_app/immutable/nodes/20.BrQH6I1V.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BCmwgY1R.js","_app/immutable/chunks/Cai8yQTP.js","_app/immutable/chunks/CU8NK243.js","_app/immutable/chunks/hXTTgo2q.js","_app/immutable/chunks/CeaMKrPw.js","_app/immutable/chunks/CgfdhRf2.js","_app/immutable/chunks/pmSrnTe9.js","_app/immutable/chunks/DiQul2Ep.js","_app/immutable/chunks/C-VIXERA.js"];
export const stylesheets = ["_app/immutable/assets/20.BFNOxqco.css"];
export const fonts = [];
