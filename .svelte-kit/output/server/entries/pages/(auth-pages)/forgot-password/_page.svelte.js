import { e as escape_html, c as store_get, d as attr, u as unsubscribe_stores, a as pop, p as push } from "../../../../chunks/index2.js";
import { t } from "../../../../chunks/index3.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let email = "";
  let isLoading = false;
  $$payload.out.push(`<div class="auth-container svelte-wlo20j"><div class="auth-card svelte-wlo20j"><h1 class="svelte-wlo20j">${escape_html(store_get($$store_subs ??= {}, "$t", t)("forgot.title"))}</h1> <p class="svelte-wlo20j">${escape_html(store_get($$store_subs ??= {}, "$t", t)("forgot.subtitle"))}</p> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <form><div class="input-group svelte-wlo20j"><label for="email" class="svelte-wlo20j">${escape_html(store_get($$store_subs ??= {}, "$t", t)("forgot.email_label"))}</label> <input id="email"${attr("value", email)} type="email"${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("forgot.email_placeholder"))} required${attr("disabled", isLoading, true)} class="svelte-wlo20j"/></div> <button type="submit"${attr("disabled", isLoading, true)} class="svelte-wlo20j">${escape_html(store_get($$store_subs ??= {}, "$t", t)("forgot.submit"))}</button></form> <p class="footer svelte-wlo20j">${escape_html(store_get($$store_subs ??= {}, "$t", t)("forgot.footer_text"))} <a href="/login" class="svelte-wlo20j">${escape_html(store_get($$store_subs ??= {}, "$t", t)("forgot.footer_link"))}</a></p></div></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
