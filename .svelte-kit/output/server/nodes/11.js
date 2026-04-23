import * as server from '../entries/pages/admin/analytics/_page.server.js';

export const index = 11;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/analytics/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/analytics/+page.server.js";
export const imports = ["_app/immutable/nodes/11.lZJNi_BI.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BVz-wF_9.js","_app/immutable/chunks/7EQ61Un6.js","_app/immutable/chunks/CC5H2EQ_.js","_app/immutable/chunks/DVpYTlYi.js","_app/immutable/chunks/C0IeHCTK.js","_app/immutable/chunks/D8ru06rp.js","_app/immutable/chunks/B-LrS94s.js","_app/immutable/chunks/wYm4gnM0.js","_app/immutable/chunks/BS8WuJrw.js","_app/immutable/chunks/BRzKQYUk.js","_app/immutable/chunks/B9WH8ZWI.js"];
export const stylesheets = ["_app/immutable/assets/11.C3lQG0W8.css"];
export const fonts = [];
