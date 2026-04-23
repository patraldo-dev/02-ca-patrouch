import { e as escape_html, c as store_get, d as attr, n as maybe_selected, u as unsubscribe_stores, a as pop, p as push } from "../../../chunks/index2.js";
import { g as getLocale, t } from "../../../chunks/index3.js";
import { g as goto } from "../../../chunks/client.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  if (!data.user) {
    goto();
  }
  let text = "";
  let locale = getLocale();
  let isLoading = false;
  let history = [];
  $$payload.out.push(`<main class="refine-page svelte-sgehpq"><div class="container"><div class="page-header svelte-sgehpq"><h1 class="svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.title"))}</h1> <button class="btn-ghost svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.history"))} (${escape_html(history.length)})</button></div> <p class="refine-desc svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.description"))}</p> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[!-->");
    {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<form class="refine-form svelte-sgehpq"><div class="field svelte-sgehpq"><label for="locale" class="svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.locale_label"))}</label> <select id="locale"${attr("disabled", isLoading, true)} class="svelte-sgehpq">`);
      $$payload.select_value = locale;
      $$payload.out.push(`<option value="en"${maybe_selected($$payload, "en")}>English</option><option value="es"${maybe_selected($$payload, "es")}>Español</option><option value="fr"${maybe_selected($$payload, "fr")}>Français</option>`);
      $$payload.select_value = void 0;
      $$payload.out.push(`</select></div> <div class="field full svelte-sgehpq"><label for="text" class="svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.title"))}</label> <textarea id="text"${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("refine.placeholder"))} rows="16"${attr("disabled", isLoading, true)} class="svelte-sgehpq">`);
      const $$body = escape_html(text);
      if ($$body) {
        $$payload.out.push(`${$$body}`);
      }
      $$payload.out.push(`</textarea> <div class="textarea-footer svelte-sgehpq"><span class="char-count svelte-sgehpq">${escape_html(text.length)} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.characters"))}</span></div></div> <p class="privacy-note svelte-sgehpq">🔒 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.privacy_note"))}</p> `);
      {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--> <button type="submit"${attr("disabled", isLoading, true)} class="svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.submit"))}</button></form>`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--> <div class="prompt-inspector"><button class="prompt-toggle svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("taller.show_prompt"))}</button> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div></div></main>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
