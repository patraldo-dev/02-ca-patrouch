import { redirect } from "@sveltejs/kit";
async function load({ url, locals }) {
  if (locals.user) {
    throw redirect(302, "/");
  }
  return {
    redirectTo: url.searchParams.get("redirect") || "/",
    errorMessage: url.searchParams.get("error") || null
  };
}
export {
  load
};
