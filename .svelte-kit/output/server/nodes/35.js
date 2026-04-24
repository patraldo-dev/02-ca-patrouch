import * as server from '../entries/pages/writings/_id_/_page.server.js';

export const index = 35;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/writings/_id_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/writings/[id]/+page.server.js";
export const imports = ["_app/immutable/nodes/35.DcZrclIm.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BCmwgY1R.js","_app/immutable/chunks/Cai8yQTP.js","_app/immutable/chunks/CU8NK243.js","_app/immutable/chunks/hXTTgo2q.js","_app/immutable/chunks/CeaMKrPw.js","_app/immutable/chunks/vYeeBVxZ.js","_app/immutable/chunks/C91UaUCV.js","_app/immutable/chunks/BydnC_uF.js","_app/immutable/chunks/CgBRi1Wa.js","_app/immutable/chunks/BcNJM6oZ.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/C-VIXERA.js","_app/immutable/chunks/Cs51mptw.js","_app/immutable/chunks/CfACfA3D.js","_app/immutable/chunks/BubMB4Uf.js","_app/immutable/chunks/DiQul2Ep.js","_app/immutable/chunks/basodJYg.js","_app/immutable/chunks/B5D8JARp.js","_app/immutable/chunks/BTBxOEEE.js","_app/immutable/chunks/BZ5TbCuk.js","_app/immutable/chunks/PcJc0xCM.js","_app/immutable/chunks/DM3HuRQe.js","_app/immutable/chunks/gPreitE9.js"];
export const stylesheets = ["_app/immutable/assets/35.CnhJkEr3.css"];
export const fonts = [];
