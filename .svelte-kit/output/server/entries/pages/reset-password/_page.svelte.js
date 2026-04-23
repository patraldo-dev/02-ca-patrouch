import { e as escape_html, c as store_get, d as attr, u as unsubscribe_stores, a as pop, p as push } from "../../../chunks/index2.js";
import { t } from "../../../chunks/index3.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let password = "";
  let confirmPassword = "";
  $$payload.out.push(`<div class="auth-container svelte-gimkg8"><div class="auth-card svelte-gimkg8"><h1 class="svelte-gimkg8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("reset.title"))}</h1> `);
  {
    $$payload.out.push("<!--[!-->");
    {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<form><div class="input-group svelte-gimkg8"><label for="password" class="svelte-gimkg8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("reset.password_label"))}</label> <input id="password"${attr("value", password)} type="password" placeholder="•••••••••••••••" required minlength="8" autocomplete="new-password" class="svelte-gimkg8"/></div> <div class="input-group svelte-gimkg8"><label for="confirmPassword" class="svelte-gimkg8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("reset.confirm_label"))}</label> <input id="confirmPassword"${attr("value", confirmPassword)} type="password" placeholder="•••••••••••••••" required autocomplete="new-password" class="svelte-gimkg8"/></div> <button type="submit"${attr("disabled", true, true)} class="svelte-gimkg8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("reset.submit"))}</button></form>`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
