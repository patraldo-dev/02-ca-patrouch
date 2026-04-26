import * as server from '../entries/pages/agora/community/_page.server.js';

export const index = 16;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/agora/community/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/agora/community/+page.server.js";
export const imports = ["_app/immutable/nodes/16.Bj_UpHDw.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CZk4491h.js","_app/immutable/chunks/NcJOAUVe.js","_app/immutable/chunks/i3VATfVl.js","_app/immutable/chunks/6NSiUUA1.js","_app/immutable/chunks/DZ0hPRw2.js","_app/immutable/chunks/DZk9-0M-.js","_app/immutable/chunks/DFjNq0iQ.js","_app/immutable/chunks/CFTIMbi0.js","_app/immutable/chunks/CwUWxAZr.js","_app/immutable/chunks/BkN9bCKS.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/nCIxTaFM.js"];
export const stylesheets = ["_app/immutable/assets/16.CFW0VVj1.css"];
export const fonts = [];
