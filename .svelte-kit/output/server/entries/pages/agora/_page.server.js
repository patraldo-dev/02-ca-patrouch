import { a as getPublicWritings } from "../../../chunks/writing-stats.js";
async function load({ url, locals }) {
  let writings = [];
  try {
    const locale = url.searchParams.get("locale") || null;
    const category = url.searchParams.get("category") || null;
    const author = url.searchParams.get("author") || null;
    const result = await getPublicWritings(locals.db, {
      page: 1,
      limit: 12,
      locale: ["en", "es", "fr"].includes(locale) ? locale : null,
      category: category || null,
      author: ["agents", "humans", "both"].includes(author) ? author : null
    });
    writings = result.writings || [];
  } catch (e) {
    console.error("Agora load error:", e);
  }
  return {
    user: locals.user || null,
    writings,
    filters: { locale: url.searchParams.get("locale") || null, category: url.searchParams.get("category") || null, author: url.searchParams.get("author") || null }
  };
}
export {
  load
};
