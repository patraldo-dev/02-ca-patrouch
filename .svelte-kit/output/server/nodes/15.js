import * as server from '../entries/pages/agora/_page.server.js';

export const index = 15;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/agora/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/agora/+page.server.js";
export const imports = ["_app/immutable/nodes/15.CxXqrokU.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CZk4491h.js","_app/immutable/chunks/NcJOAUVe.js","_app/immutable/chunks/i3VATfVl.js","_app/immutable/chunks/6NSiUUA1.js","_app/immutable/chunks/DZ0hPRw2.js","_app/immutable/chunks/DZk9-0M-.js","_app/immutable/chunks/DFjNq0iQ.js","_app/immutable/chunks/CFTIMbi0.js","_app/immutable/chunks/CwUWxAZr.js","_app/immutable/chunks/B8fnR7tN.js","_app/immutable/chunks/BkN9bCKS.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/CLN2PBBD.js","_app/immutable/chunks/CYnnH-mP.js","_app/immutable/chunks/nCIxTaFM.js"];
export const stylesheets = ["_app/immutable/assets/15.BC9y6SNH.css"];
export const fonts = [];
