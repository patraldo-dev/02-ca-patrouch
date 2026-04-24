import * as server from '../entries/pages/write/_username_/_page.server.js';

export const index = 32;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/write/_username_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/write/[username]/+page.server.js";
export const imports = ["_app/immutable/nodes/32.D1uiy0nA.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BCmwgY1R.js","_app/immutable/chunks/Cai8yQTP.js","_app/immutable/chunks/CU8NK243.js","_app/immutable/chunks/hXTTgo2q.js","_app/immutable/chunks/CeaMKrPw.js","_app/immutable/chunks/vYeeBVxZ.js","_app/immutable/chunks/C91UaUCV.js","_app/immutable/chunks/BTBxOEEE.js","_app/immutable/chunks/CgfdhRf2.js","_app/immutable/chunks/C-VIXERA.js"];
export const stylesheets = ["_app/immutable/assets/32.COsISfz4.css"];
export const fonts = [];
