import * as server from '../entries/pages/write/new/_page.server.js';

export const index = 33;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/write/new/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/write/new/+page.server.js";
export const imports = ["_app/immutable/nodes/33.CdtIaMuZ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BCmwgY1R.js","_app/immutable/chunks/Cai8yQTP.js","_app/immutable/chunks/CU8NK243.js","_app/immutable/chunks/hXTTgo2q.js","_app/immutable/chunks/CeaMKrPw.js","_app/immutable/chunks/vYeeBVxZ.js","_app/immutable/chunks/C91UaUCV.js","_app/immutable/chunks/CgBRi1Wa.js","_app/immutable/chunks/BZ5TbCuk.js","_app/immutable/chunks/PcJc0xCM.js","_app/immutable/chunks/C-VIXERA.js","_app/immutable/chunks/De-grcsT.js","_app/immutable/chunks/pmSrnTe9.js","_app/immutable/chunks/DiQul2Ep.js"];
export const stylesheets = ["_app/immutable/assets/33.DivMILlQ.css"];
export const fonts = [];
