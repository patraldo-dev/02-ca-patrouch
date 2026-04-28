import { e as escape_html, b as store_get, c as attr, u as unsubscribe_stores } from "../../../chunks/renderer.js";
import { g as getLocale, t } from "../../../chunks/index3.js";
import { g as goto } from "../../../chunks/client.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    if (!data.user) {
      goto();
    }
    let text = "";
    let locale = getLocale();
    let isLoading = false;
    let history = [];
    $$renderer2.push(`<main class="refine-page svelte-sgehpq"><div class="container"><div class="page-header svelte-sgehpq"><h1 class="svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.title"))}</h1> <button class="btn-ghost svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.history"))} (${escape_html(history.length)})</button></div> <p class="refine-desc svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.description"))}</p> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<form class="refine-form svelte-sgehpq"><div class="field svelte-sgehpq"><label for="locale" class="svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.locale_label"))}</label> `);
      $$renderer2.select(
        { id: "locale", value: locale, disabled: isLoading, class: "" },
        ($$renderer3) => {
          $$renderer3.option({ value: "en" }, ($$renderer4) => {
            $$renderer4.push(`English`);
          });
          $$renderer3.option({ value: "es" }, ($$renderer4) => {
            $$renderer4.push(`Español`);
          });
          $$renderer3.option({ value: "fr" }, ($$renderer4) => {
            $$renderer4.push(`Français`);
          });
        },
        "svelte-sgehpq"
      );
      $$renderer2.push(`</div> <div class="field full svelte-sgehpq"><label for="text" class="svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.title"))}</label> <textarea id="text"${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("refine.placeholder"))} rows="16"${attr("disabled", isLoading, true)} class="svelte-sgehpq">`);
      const $$body = escape_html(text);
      if ($$body) {
        $$renderer2.push(`${$$body}`);
      }
      $$renderer2.push(`</textarea> <div class="textarea-footer svelte-sgehpq"><span class="char-count svelte-sgehpq">${escape_html(text.length)} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.characters"))}</span></div></div> <p class="privacy-note svelte-sgehpq">🔒 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.privacy_note"))}</p> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <button type="submit"${attr("disabled", isLoading, true)} class="svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("refine.submit"))}</button></form>`);
    }
    $$renderer2.push(`<!--]--> <div class="prompt-inspector"><button class="prompt-toggle svelte-sgehpq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("taller.show_prompt"))}</button> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div></main>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
