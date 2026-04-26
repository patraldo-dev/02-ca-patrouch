import { redirect } from "@sveltejs/kit";
async function load({ locals }) {
  const user = locals?.user;
  if (!user) throw redirect(302, "/login");
  throw redirect(302, "/account");
}
export {
  load
};
