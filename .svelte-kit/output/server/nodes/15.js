import * as server from '../entries/pages/agora/community/_page.server.js';

export const index = 15;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/agora/community/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/agora/community/+page.server.js";
export const imports = ["_app/immutable/nodes/15.m9mxOiTy.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/7EQ61Un6.js","_app/immutable/chunks/CC5H2EQ_.js","_app/immutable/chunks/DVpYTlYi.js","_app/immutable/chunks/D8ru06rp.js","_app/immutable/chunks/B-LrS94s.js","_app/immutable/chunks/KfB9xc2B.js","_app/immutable/chunks/BRzKQYUk.js","_app/immutable/chunks/BrvIvy0u.js","_app/immutable/chunks/CuzFCTBL.js","_app/immutable/chunks/Ci2E9ob5.js"];
export const stylesheets = ["_app/immutable/assets/15.CFW0VVj1.css"];
export const fonts = [];
