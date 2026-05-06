import { redirect, error } from "@sveltejs/kit";
async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, "/login?redirect=" + encodeURIComponent(url.pathname));
  }
  const user = locals.user;
  if (user.role !== "member" && user.role !== "admin") {
    throw error(403, "Member access required");
  }
  return { user, serverLocale: locals.locale || "es" };
}
export {
  load
};
