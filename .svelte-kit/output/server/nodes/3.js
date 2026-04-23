import * as server from '../entries/pages/admin/_layout.server.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+layout.server.js";
export const imports = ["_app/immutable/nodes/3.phUWI9lL.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BCmwgY1R.js","_app/immutable/chunks/Cai8yQTP.js","_app/immutable/chunks/CU8NK243.js","_app/immutable/chunks/hXTTgo2q.js","_app/immutable/chunks/CeaMKrPw.js","_app/immutable/chunks/DsyrPnVk.js","_app/immutable/chunks/C91UaUCV.js","_app/immutable/chunks/CgfdhRf2.js","_app/immutable/chunks/BcNJM6oZ.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/cKguVr2R.js","_app/immutable/chunks/CgUAF2Mz.js","_app/immutable/chunks/BMGDZvjk.js","_app/immutable/chunks/DiQul2Ep.js","_app/immutable/chunks/DfXy-Pjo.js"];
export const stylesheets = ["_app/immutable/assets/3.BaTVQL_z.css"];
export const fonts = [];
