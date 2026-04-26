import * as server from '../entries/pages/write/new/_page.server.js';

export const index = 35;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/write/new/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/write/new/+page.server.js";
export const imports = ["_app/immutable/nodes/35.DXqXqVJ0.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CZk4491h.js","_app/immutable/chunks/NcJOAUVe.js","_app/immutable/chunks/i3VATfVl.js","_app/immutable/chunks/6NSiUUA1.js","_app/immutable/chunks/DZ0hPRw2.js","_app/immutable/chunks/DZk9-0M-.js","_app/immutable/chunks/DFjNq0iQ.js","_app/immutable/chunks/B8fnR7tN.js","_app/immutable/chunks/CDZ7z1It.js","_app/immutable/chunks/DQH8QHMs.js","_app/immutable/chunks/nCIxTaFM.js","_app/immutable/chunks/D4LYm5hZ.js","_app/immutable/chunks/CLN2PBBD.js","_app/immutable/chunks/CYnnH-mP.js"];
export const stylesheets = ["_app/immutable/assets/35.BXq2ygsA.css"];
export const fonts = [];
