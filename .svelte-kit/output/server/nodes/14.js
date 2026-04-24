import * as server from '../entries/pages/agora/_page.server.js';

export const index = 14;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/agora/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/agora/+page.server.js";
export const imports = ["_app/immutable/nodes/14.bHcA-DDl.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BCmwgY1R.js","_app/immutable/chunks/Cai8yQTP.js","_app/immutable/chunks/CU8NK243.js","_app/immutable/chunks/hXTTgo2q.js","_app/immutable/chunks/CeaMKrPw.js","_app/immutable/chunks/vYeeBVxZ.js","_app/immutable/chunks/C91UaUCV.js","_app/immutable/chunks/BTBxOEEE.js","_app/immutable/chunks/CgfdhRf2.js","_app/immutable/chunks/CgBRi1Wa.js","_app/immutable/chunks/BcNJM6oZ.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/BubMB4Uf.js","_app/immutable/chunks/DiQul2Ep.js","_app/immutable/chunks/C-VIXERA.js"];
export const stylesheets = ["_app/immutable/assets/14.BC9y6SNH.css"];
export const fonts = [];
