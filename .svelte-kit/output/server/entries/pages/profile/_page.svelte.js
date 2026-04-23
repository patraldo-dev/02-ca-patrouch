import { h as head, e as escape_html, s as store_get, a as attr_class, b as attr, u as unsubscribe_stores, d as derived } from "../../../chunks/renderer.js";
import { t } from "../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils3.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
import "../../../chunks/WriterOfTheWeek.svelte_svelte_type_style_lang.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let isAdmin = derived(() => data.user?.role === "admin");
    let activeTab = "user-profile";
    data.profiles || [];
    data.showProfile ?? 1;
    data.bootyOptIn ?? 0;
    let userDisplayName = data.profile?.display_name || "";
    let userBio = data.profile?.bio || "";
    let savingProfile = false;
    let memberSince = derived(() => () => {
      const d = data.profile?.created_at;
      if (!d) return "";
      return new Date(d.replace ? d.replace(" ", "T") : d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    });
    head("maq4gq", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.title"))}</title>`);
      });
    });
    $$renderer2.push(`<div class="profile-page svelte-maq4gq"><h1 class="svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.title"))}</h1> <p class="profile-subtitle svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.subtitle"))}</p> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="tab-bar svelte-maq4gq"><button${attr_class("tab-btn svelte-maq4gq", void 0, { "active": activeTab === "user-profile" })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.user.tab"))}</button> `);
    if (isAdmin()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button${attr_class("tab-btn svelte-maq4gq", void 0, { "active": activeTab === "profile" })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.tab_profile"))}</button> <button${attr_class("tab-btn svelte-maq4gq", void 0, { "active": activeTab === "stats" })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.tab_stats"))}</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<section class="user-profile-section svelte-maq4gq"><div class="user-profile-avatar-large svelte-maq4gq">${escape_html((userDisplayName || data.user?.username || "?")[0].toUpperCase())}</div> <p class="user-profile-avatar-label svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.user.avatar_label"))}</p> <div class="user-profile-form svelte-maq4gq"><div class="form-group svelte-maq4gq"><label class="svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.user.display_name"))}</label> <input${attr("value", userDisplayName)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("profile.user.display_name_placeholder"))} maxlength="50" class="svelte-maq4gq"/></div> <div class="form-group svelte-maq4gq"><label class="svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.user.bio"))}</label> <textarea${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("profile.user.bio_placeholder"))} maxlength="500" rows="4" class="svelte-maq4gq">`);
      const $$body = escape_html(userBio);
      if ($$body) {
        $$renderer2.push(`${$$body}`);
      }
      $$renderer2.push(`</textarea> <span class="bio-counter svelte-maq4gq">${escape_html(userBio.length)}/500</span></div> <div class="member-since svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.user.member_since"))} ${escape_html(memberSince())}</div> <button class="btn-save-user svelte-maq4gq"${attr("disabled", savingProfile, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.user.save"))}</button></div></section>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (isAdmin() && activeTab === "stats") ;
    else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
