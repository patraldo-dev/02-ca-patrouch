import { e as escape_html, s as store_get, b as attr, u as unsubscribe_stores } from "../../../chunks/renderer.js";
import { t } from "../../../chunks/index2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let password = "";
    let confirmPassword = "";
    $$renderer2.push(`<div class="auth-container svelte-gimkg8"><div class="auth-card svelte-gimkg8"><h1 class="svelte-gimkg8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("reset.title"))}</h1> `);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<form><div class="input-group svelte-gimkg8"><label for="password" class="svelte-gimkg8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("reset.password_label"))}</label> <input id="password"${attr("value", password)} type="password" placeholder="•••••••••••••••" required="" minlength="8" autocomplete="new-password" class="svelte-gimkg8"/></div> <div class="input-group svelte-gimkg8"><label for="confirmPassword" class="svelte-gimkg8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("reset.confirm_label"))}</label> <input id="confirmPassword"${attr("value", confirmPassword)} type="password" placeholder="•••••••••••••••" required="" autocomplete="new-password" class="svelte-gimkg8"/></div> <button type="submit"${attr("disabled", true, true)} class="svelte-gimkg8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("reset.submit"))}</button></form>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
