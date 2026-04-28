import { e as escape_html, b as store_get, c as attr, u as unsubscribe_stores } from "../../../../chunks/renderer.js";
import { t } from "../../../../chunks/index3.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let email = "";
    let isLoading = false;
    $$renderer2.push(`<div class="auth-container svelte-wlo20j"><div class="auth-card svelte-wlo20j"><h1 class="svelte-wlo20j">${escape_html(store_get($$store_subs ??= {}, "$t", t)("forgot.title"))}</h1> <p class="svelte-wlo20j">${escape_html(store_get($$store_subs ??= {}, "$t", t)("forgot.subtitle"))}</p> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <form><div class="input-group svelte-wlo20j"><label for="email" class="svelte-wlo20j">${escape_html(store_get($$store_subs ??= {}, "$t", t)("forgot.email_label"))}</label> <input id="email"${attr("value", email)} type="email"${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("forgot.email_placeholder"))} required=""${attr("disabled", isLoading, true)} class="svelte-wlo20j"/></div> <button type="submit"${attr("disabled", isLoading, true)} class="svelte-wlo20j">${escape_html(store_get($$store_subs ??= {}, "$t", t)("forgot.submit"))}</button></form> <p class="footer svelte-wlo20j">${escape_html(store_get($$store_subs ??= {}, "$t", t)("forgot.footer_text"))} <a href="/login" class="svelte-wlo20j">${escape_html(store_get($$store_subs ??= {}, "$t", t)("forgot.footer_link"))}</a></p></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
