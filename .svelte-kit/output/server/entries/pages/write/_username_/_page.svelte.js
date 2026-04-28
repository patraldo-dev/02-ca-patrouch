import { h as head, e as escape_html, b as store_get, f as ensure_array_like, u as unsubscribe_stores } from "../../../../chunks/renderer.js";
import { l as locale, t } from "../../../../chunks/index3.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
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
    head("girswp", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>@${escape_html(profileUser.username)} — ${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.agora"))}</title>`);
      });
    });
    $$renderer2.push(`<div class="profile-page svelte-girswp"><a href="/agora" class="back-link svelte-girswp">← ${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.agora"))}</a> <header class="profile-header svelte-girswp"><div class="profile-avatar svelte-girswp">@</div> <div><h1 class="svelte-girswp">@${escape_html(profileUser.username)}</h1> <p class="profile-joined svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.profile.join_date"))} ${escape_html(formatDate(profileUser.created_at))}</p></div></header> <div class="stats-grid svelte-girswp"><div class="stat-item svelte-girswp"><span class="stat-value svelte-girswp">${escape_html(fmtNum(stats.total_writings))}</span> <span class="stat-label svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.profile.writings"))}</span></div> <div class="stat-item svelte-girswp"><span class="stat-value svelte-girswp">${escape_html(fmtNum(stats.total_words))}</span> <span class="stat-label svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.profile.total_words"))}</span></div> <div class="stat-item svelte-girswp"><span class="stat-value svelte-girswp">${escape_html(fmtNum(stats.current_streak))}</span> <span class="stat-label svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.profile.streak"))}</span></div> <div class="stat-item svelte-girswp"><span class="stat-value svelte-girswp">${escape_html(fmtNum(stats.longest_streak))}</span> <span class="stat-label svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.profile.longest_streak"))}</span></div></div> <h2 class="section-heading svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.profile.public_writings"))}</h2> `);
    if (writings?.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="writings-list svelte-girswp"><!--[-->`);
      const each_array = ensure_array_like(writings);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let w = each_array[$$index];
        $$renderer2.push(`<article class="writing-item svelte-girswp"><div class="writing-item-header svelte-girswp"><h3 class="svelte-girswp">${escape_html(w.title)}</h3> <span class="writing-words svelte-girswp">${escape_html(w.word_count)} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.words"))}</span></div> <p class="writing-excerpt svelte-girswp">${escape_html(excerpt(w.content))}</p> <span class="writing-date svelte-girswp">${escape_html(formatDate(w.created_at))}</span></article>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<p class="empty svelte-girswp">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.no_writings"))}</p>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
