import * as server from '../entries/pages/write/_page.server.js';

export const index = 35;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/write/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/write/+page.server.js";
export const imports = ["_app/immutable/nodes/35.OXJpjAyO.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C7wSchzS.js","_app/immutable/chunks/C_ypCbr-.js","_app/immutable/chunks/DhFLis_7.js","_app/immutable/chunks/D60XAhtd.js","_app/immutable/chunks/BYHqxEaj.js","_app/immutable/chunks/BBzQ1gTY.js","_app/immutable/chunks/16EERJEz.js","_app/immutable/chunks/DTCNAND8.js","_app/immutable/chunks/DmT-1Ms3.js","_app/immutable/chunks/nnzeBT93.js","_app/immutable/chunks/DAk3OZq9.js","_app/immutable/chunks/wP0qf2A5.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/BK355jMr.js","_app/immutable/chunks/j_clqXuE.js","_app/immutable/chunks/C9unnt0N.js","_app/immutable/chunks/IpB75WsZ.js","_app/immutable/chunks/BIVhEQ11.js","_app/immutable/chunks/eLItx-_i.js","_app/immutable/chunks/Cs51mptw.js","_app/immutable/chunks/B4noSjM_.js","_app/immutable/chunks/BoaBw_Xt.js","_app/immutable/chunks/NwXuEIVk.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/DrUhxKce.js"];
export const stylesheets = ["_app/immutable/assets/BadgeTrophyCase.D3Gr7r2L.css","_app/immutable/assets/OnboardingFlow.DYBVSHnm.css","_app/immutable/assets/35.CoAeiDpG.css","_app/immutable/assets/WriterOfTheWeek.DfC5H6VZ.css"];
export const fonts = [];
