import * as server from '../entries/pages/agora/community/_page.server.js';

export const index = 15;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/agora/community/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/agora/community/+page.server.js";
export const imports = ["_app/immutable/nodes/15.Dft9EiUH.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BCmwgY1R.js","_app/immutable/chunks/Cai8yQTP.js","_app/immutable/chunks/CU8NK243.js","_app/immutable/chunks/hXTTgo2q.js","_app/immutable/chunks/CeaMKrPw.js","_app/immutable/chunks/vYeeBVxZ.js","_app/immutable/chunks/C91UaUCV.js","_app/immutable/chunks/BTBxOEEE.js","_app/immutable/chunks/CgfdhRf2.js","_app/immutable/chunks/BcNJM6oZ.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/DfXy-Pjo.js"];
export const stylesheets = ["_app/immutable/assets/15.CFW0VVj1.css"];
export const fonts = [];
