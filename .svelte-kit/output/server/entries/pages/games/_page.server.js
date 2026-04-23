import "@sveltejs/kit";
async function load({ locals }) {
  return {
    user: locals.user || null,
    serverLocale: locals.locale || "es"
  };
}
export {
  load
};
