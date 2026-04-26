import * as server from '../entries/pages/profile/_page.server.js';

export const index = 25;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/profile/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/profile/+page.server.js";
export const imports = ["_app/immutable/nodes/25.DoNOysZ4.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CZk4491h.js","_app/immutable/chunks/NcJOAUVe.js","_app/immutable/chunks/i3VATfVl.js","_app/immutable/chunks/6NSiUUA1.js","_app/immutable/chunks/DZ0hPRw2.js","_app/immutable/chunks/DZk9-0M-.js","_app/immutable/chunks/DFjNq0iQ.js","_app/immutable/chunks/CFTIMbi0.js","_app/immutable/chunks/CwUWxAZr.js","_app/immutable/chunks/B8fnR7tN.js","_app/immutable/chunks/BkN9bCKS.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/CA90GWDq.js","_app/immutable/chunks/CDZ7z1It.js","_app/immutable/chunks/DQH8QHMs.js","_app/immutable/chunks/pVRH455n.js","_app/immutable/chunks/nCIxTaFM.js","_app/immutable/chunks/D4LYm5hZ.js","_app/immutable/chunks/CLN2PBBD.js","_app/immutable/chunks/CYnnH-mP.js","_app/immutable/chunks/gPreitE9.js","_app/immutable/chunks/s4yEpJwB.js","_app/immutable/chunks/BTNOIVkH.js"];
export const stylesheets = ["_app/immutable/assets/BadgeTrophyCase.D3Gr7r2L.css","_app/immutable/assets/25.az6gdbbF.css","_app/immutable/assets/WriterOfTheWeek.DfC5H6VZ.css"];
export const fonts = [];
