import { g as getCommunityResponses } from "../../../../chunks/writing-stats.js";
async function load({ url, locals }) {
  const locale = url.searchParams.get("locale") || null;
  const groups = await getCommunityResponses(locals.db, {
    locale: ["en", "es", "fr"].includes(locale) ? locale : null
  });
  return {
    user: locals.user || null,
    groups,
    filters: { locale }
  };
}
export {
  load
};
