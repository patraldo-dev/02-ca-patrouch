import * as server from '../entries/pages/profile/_page.server.js';

export const index = 24;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/profile/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/profile/+page.server.js";
export const imports = ["_app/immutable/nodes/24.DlCJ6Xej.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BCmwgY1R.js","_app/immutable/chunks/Cai8yQTP.js","_app/immutable/chunks/CU8NK243.js","_app/immutable/chunks/hXTTgo2q.js","_app/immutable/chunks/CeaMKrPw.js","_app/immutable/chunks/vYeeBVxZ.js","_app/immutable/chunks/C91UaUCV.js","_app/immutable/chunks/BTBxOEEE.js","_app/immutable/chunks/CgfdhRf2.js","_app/immutable/chunks/CgBRi1Wa.js","_app/immutable/chunks/BcNJM6oZ.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/BZ5TbCuk.js","_app/immutable/chunks/PcJc0xCM.js","_app/immutable/chunks/DfXy-Pjo.js","_app/immutable/chunks/CgUAF2Mz.js","_app/immutable/chunks/BMGDZvjk.js","_app/immutable/chunks/DiQul2Ep.js","_app/immutable/chunks/Dz8xgU37.js","_app/immutable/chunks/DM3HuRQe.js","_app/immutable/chunks/DkZZXSU2.js"];
export const stylesheets = ["_app/immutable/assets/WriterOfTheWeek.DizmgEvb.css","_app/immutable/assets/24.CZNGV40L.css"];
export const fonts = [];
