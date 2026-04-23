import * as server from '../entries/pages/api/admin/_layout.server.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/api/admin/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/api/admin/+layout.server.js";
export const imports = ["_app/immutable/nodes/5.Ps8OhEgA.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/7EQ61Un6.js","_app/immutable/chunks/CC5H2EQ_.js","_app/immutable/chunks/DVpYTlYi.js","_app/immutable/chunks/C0IeHCTK.js","_app/immutable/chunks/KfB9xc2B.js","_app/immutable/chunks/BRzKQYUk.js","_app/immutable/chunks/BrvIvy0u.js","_app/immutable/chunks/CuzFCTBL.js","_app/immutable/chunks/BssjRciR.js","_app/immutable/chunks/S4Hihn2m.js","_app/immutable/chunks/BVz-wF_9.js"];
export const stylesheets = ["_app/immutable/assets/5.D6O-uV_4.css"];
export const fonts = [];
