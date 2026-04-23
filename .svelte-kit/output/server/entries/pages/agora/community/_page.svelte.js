import { k as head, e as escape_html, g as attr_class, c as store_get, f as ensure_array_like, u as unsubscribe_stores, a as pop, p as push } from "../../../../chunks/index2.js";
import { t, l as locale } from "../../../../chunks/index3.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  function formatDate(dateStr) {
    if (dateStr === today) return store_get($$store_subs ??= {}, "$t", t)("agora.community.today_label");
    return (/* @__PURE__ */ new Date(dateStr + "T12:00:00")).toLocaleDateString(store_get($$store_subs ??= {}, "$locale", locale) || "en", { weekday: "long", month: "long", day: "numeric" });
  }
  function excerpt(text) {
    if (!text) return "";
    return text.length > 200 ? text.slice(0, 200) + "…" : text;
  }
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.community.title"))} — ${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.agora"))}</title>`;
  });
  $$payload.out.push(`<div class="community-page svelte-1obznh"><header class="community-header svelte-1obznh"><a href="/agora" class="back-link svelte-1obznh">← ${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.agora"))}</a> <h1 class="svelte-1obznh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.community.title"))}</h1> <p class="svelte-1obznh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.community.subtitle"))}</p></header> <div class="community-filters svelte-1obznh"><a href="/agora/community"${attr_class("filter-tag svelte-1obznh", void 0, { "active": !data.filters.locale })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.all"))}</a> <a href="/agora/community?locale=en"${attr_class("filter-tag svelte-1obznh", void 0, { "active": data.filters.locale === "en" })}>EN</a> <a href="/agora/community?locale=es"${attr_class("filter-tag svelte-1obznh", void 0, { "active": data.filters.locale === "es" })}>ES</a> <a href="/agora/community?locale=fr"${attr_class("filter-tag svelte-1obznh", void 0, { "active": data.filters.locale === "fr" })}>FR</a></div> `);
  if (data.groups?.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(data.groups);
    $$payload.out.push(`<!--[-->`);
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let group = each_array[$$index_1];
      const each_array_1 = ensure_array_like(group.writings);
      $$payload.out.push(`<section class="day-group svelte-1obznh"><h2 class="day-heading svelte-1obznh">${escape_html(formatDate(group.date))}</h2> <div class="prompt-quote svelte-1obznh"><span class="prompt-label svelte-1obznh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.community.prompt_label"))}</span> <p class="prompt-text svelte-1obznh">${escape_html(group.prompt)}</p></div> <div class="responses svelte-1obznh"><!--[-->`);
      for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
        let w = each_array_1[$$index];
        $$payload.out.push(`<article class="response-card svelte-1obznh"><div class="response-header svelte-1obznh"><span class="response-author svelte-1obznh">${escape_html(w.username)}</span> <span class="response-words svelte-1obznh">${escape_html(w.word_count)} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.words"))}</span> `);
        if (w.ai_assisted) {
          $$payload.out.push("<!--[-->");
          $$payload.out.push(`<span class="ai-badge svelte-1obznh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.ai_assisted"))}</span>`);
        } else {
          $$payload.out.push("<!--[!-->");
        }
        $$payload.out.push(`<!--]--></div> <h3 class="response-title svelte-1obznh">${escape_html(w.title)}</h3> <p class="response-excerpt svelte-1obznh">${escape_html(excerpt(w.content))}</p></article>`);
      }
      $$payload.out.push(`<!--]--></div></section>`);
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="empty-state svelte-1obznh"><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.community.no_responses"))}</p></div>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
