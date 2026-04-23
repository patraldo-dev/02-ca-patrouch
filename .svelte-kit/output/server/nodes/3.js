import * as server from '../entries/pages/admin/_layout.server.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+layout.server.js";
export const imports = ["_app/immutable/nodes/3.CFPnOWBB.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/7EQ61Un6.js","_app/immutable/chunks/CC5H2EQ_.js","_app/immutable/chunks/DVpYTlYi.js","_app/immutable/chunks/C0IeHCTK.js","_app/immutable/chunks/KfB9xc2B.js","_app/immutable/chunks/BRzKQYUk.js","_app/immutable/chunks/BrvIvy0u.js","_app/immutable/chunks/CuzFCTBL.js","_app/immutable/chunks/BssjRciR.js","_app/immutable/chunks/S4Hihn2m.js","_app/immutable/chunks/BVz-wF_9.js","_app/immutable/chunks/Ci2E9ob5.js"];
export const stylesheets = ["_app/immutable/assets/3.BaTVQL_z.css"];
export const fonts = [];
