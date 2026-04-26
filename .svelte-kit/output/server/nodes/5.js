import * as server from '../entries/pages/api/admin/_layout.server.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/api/admin/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/api/admin/+layout.server.js";
export const imports = ["_app/immutable/nodes/5.haTy5OQP.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CZk4491h.js","_app/immutable/chunks/NcJOAUVe.js","_app/immutable/chunks/i3VATfVl.js","_app/immutable/chunks/Cv56_7Gg.js","_app/immutable/chunks/DFjNq0iQ.js","_app/immutable/chunks/CwUWxAZr.js","_app/immutable/chunks/BkN9bCKS.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/DK4nsd6s.js","_app/immutable/chunks/D4LYm5hZ.js","_app/immutable/chunks/CLN2PBBD.js","_app/immutable/chunks/CYnnH-mP.js","_app/immutable/chunks/6NSiUUA1.js","_app/immutable/chunks/DZ0hPRw2.js"];
export const stylesheets = ["_app/immutable/assets/5.D6O-uV_4.css"];
export const fonts = [];
