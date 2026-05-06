

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/ar/_layout.svelte.js')).default;
export const universal = {
  "load": null,
  "ssr": false
};
export const universal_id = "src/routes/ar/+layout.js";
export const imports = ["_app/immutable/nodes/6.CTRqYxcR.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B4ixXWAk.js","_app/immutable/chunks/COH9MEEV.js","_app/immutable/chunks/rrbBjjww.js","_app/immutable/chunks/rUh0QOfW.js"];
export const stylesheets = ["_app/immutable/assets/app.vgCbEYl3.css"];
export const fonts = [];
