import { e as getUserProfile } from "../../../../chunks/writing-stats.js";
import { redirect } from "@sveltejs/kit";
async function load({ params, locals }) {
  const { username } = params;
  const profile = await getUserProfile(locals.db, username);
  if (!profile) {
    throw redirect(302, "/agora");
  }
  const isOwn = locals.user?.id === profile.user.id;
  return {
    user: locals.user || null,
    profile,
    isOwn
  };
}
export {
  load
};
