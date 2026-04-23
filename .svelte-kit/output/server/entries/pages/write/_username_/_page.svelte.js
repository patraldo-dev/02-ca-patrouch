import { k as head, e as escape_html, c as store_get, f as ensure_array_like, u as unsubscribe_stores, a as pop, p as push } from "../../../../chunks/index2.js";
import { l as locale, t } from "../../../../chunks/index3.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  const { user: profileUser, stats, writings } = data.profile;
  function formatDate(d) {
    if (!d) return "";
    return (/* @__PURE__ */ new Date(d + "T12:00:00")).toLocaleDateString(store_get($$store_subs ??= {}, "$locale", locale) || "en", { month: "long", year: "numeric" });
  }
  function excerpt(text) {
    if (!text) return "";
    return text.length > 120 ? text.slice(0, 120) + "…" : text;
  }
  function fmtNum(n) {
    return n != null ? n.toLocaleString() : "0";
  }
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>@${escape_html(profileUser.username)} — ${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.agora"))}</title>`;
  });
  $$payload.out.push(`<div class="profile-page svelte-girswp"><a href="/agora" class="back-link svelte-girswp">← ${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.agora"))}</a> <header class="profile-header svelte-girswp"><div class="profile-avatar svelte-girswp">@</div> <div><h1 class="svelte-girswp">@${escape_html(profileUser.username)}</h1> <p class="profile-joined svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.profile.join_date"))} ${escape_html(formatDate(profileUser.created_at))}</p></div></header> <div class="stats-grid svelte-girswp"><div class="stat-item svelte-girswp"><span class="stat-value svelte-girswp">${escape_html(fmtNum(stats.total_writings))}</span> <span class="stat-label svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.profile.writings"))}</span></div> <div class="stat-item svelte-girswp"><span class="stat-value svelte-girswp">${escape_html(fmtNum(stats.total_words))}</span> <span class="stat-label svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.profile.total_words"))}</span></div> <div class="stat-item svelte-girswp"><span class="stat-value svelte-girswp">${escape_html(fmtNum(stats.current_streak))}</span> <span class="stat-label svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.profile.streak"))}</span></div> <div class="stat-item svelte-girswp"><span class="stat-value svelte-girswp">${escape_html(fmtNum(stats.longest_streak))}</span> <span class="stat-label svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.profile.longest_streak"))}</span></div></div> <h2 class="section-heading svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.profile.public_writings"))}</h2> `);
  if (writings?.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(writings);
    $$payload.out.push(`<div class="writings-list svelte-girswp"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let w = each_array[$$index];
      $$payload.out.push(`<article class="writing-item svelte-girswp"><div class="writing-item-header svelte-girswp"><h3 class="svelte-girswp">${escape_html(w.title)}</h3> <span class="writing-words svelte-girswp">${escape_html(w.word_count)} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.words"))}</span></div> <p class="writing-excerpt svelte-girswp">${escape_html(excerpt(w.content))}</p> <span class="writing-date svelte-girswp">${escape_html(formatDate(w.created_at))}</span></article>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="empty svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.no_writings"))}</p>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
