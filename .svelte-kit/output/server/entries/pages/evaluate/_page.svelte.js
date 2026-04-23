import { e as escape_html, s as store_get, b as attr, u as unsubscribe_stores } from "../../../chunks/renderer.js";
import { g as getLocale, t } from "../../../chunks/index2.js";
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
    $$renderer2.push(`<main class="evaluate-page svelte-10wgvqg"><div class="container"><div class="page-header svelte-10wgvqg"><h1 class="svelte-10wgvqg">${escape_html(
      // Load history on mount
      store_get($$store_subs ??= {}, "$t", t)("evaluate.title")
    )}</h1> <button class="btn-ghost svelte-10wgvqg">${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.history"))} (${escape_html(history.length)})</button></div> <p class="evaluate-desc svelte-10wgvqg">${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.description"))}</p> `);
    {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<form class="evaluate-form svelte-10wgvqg"><div class="field svelte-10wgvqg"><label for="locale" class="svelte-10wgvqg">${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.locale_label"))}</label> `);
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
        "svelte-10wgvqg"
      );
      $$renderer2.push(`</div> <div class="field full svelte-10wgvqg" style="position:relative;"><label for="text" class="svelte-10wgvqg">${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.title"))}</label> <textarea id="text"${attr("lang", data.serverLocale || "en")} spellcheck="true"${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("evaluate.placeholder"))} rows="16"${attr("disabled", isLoading, true)} class="svelte-10wgvqg">`);
      const $$body = escape_html(text);
      if ($$body) {
        $$renderer2.push(`${$$body}`);
      }
      $$renderer2.push(`</textarea> <button class="copy-inline svelte-10wgvqg"${attr("title", store_get($$store_subs ??= {}, "$t", t)("audio.copy"))}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg></button> <div class="textarea-footer"><span class="char-count">${escape_html(text.length)} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.words") || "chars")}</span></div></div> <p class="privacy-note svelte-10wgvqg">🔒 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.privacy_note"))}</p> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <button type="submit"${attr("disabled", isLoading, true)} class="svelte-10wgvqg">${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.submit"))}</button></form>`);
    }
    $$renderer2.push(`<!--]--> <div class="prompt-inspector"><button class="prompt-toggle svelte-10wgvqg">${escape_html(store_get($$store_subs ??= {}, "$t", t)("taller.show_prompt"))}</button> `);
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
