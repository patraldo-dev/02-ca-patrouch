import * as server from '../entries/pages/admin/_layout.server.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+layout.server.js";
export const imports = ["_app/immutable/nodes/3.FOXc8xUJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/COH9MEEV.js","_app/immutable/chunks/DGB_sTAZ.js","_app/immutable/chunks/BelQN5Eo.js","_app/immutable/chunks/CNZgEGEW.js","_app/immutable/chunks/CMjCajgg.js","_app/immutable/chunks/rrbBjjww.js","_app/immutable/chunks/rUh0QOfW.js","_app/immutable/chunks/X_E6-_TU.js","_app/immutable/chunks/BsIzlKNo.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/BYodYbKz.js","_app/immutable/chunks/CIWSSOto.js","_app/immutable/chunks/DZcxTGg-.js","_app/immutable/chunks/BnKHZF6D.js","_app/immutable/chunks/lj8Kp-za.js"];
export const stylesheets = ["_app/immutable/assets/3.BaTVQL_z.css"];
export const fonts = [];
