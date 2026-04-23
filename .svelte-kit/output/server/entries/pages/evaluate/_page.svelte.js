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
  $$payload.out.push(`<main class="evaluate-page svelte-10wgvqg"><div class="container"><div class="page-header svelte-10wgvqg"><h1 class="svelte-10wgvqg">${escape_html(
    // Load history on mount
    store_get($$store_subs ??= {}, "$t", t)("evaluate.title")
  )}</h1> <button class="btn-ghost svelte-10wgvqg">${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.history"))} (${escape_html(history.length)})</button></div> <p class="evaluate-desc svelte-10wgvqg">${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.description"))}</p> `);
  {
    $$payload.out.push("<!--[!-->");
    {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<form class="evaluate-form svelte-10wgvqg"><div class="field svelte-10wgvqg"><label for="locale" class="svelte-10wgvqg">${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.locale_label"))}</label> <select id="locale"${attr("disabled", isLoading, true)} class="svelte-10wgvqg">`);
      $$payload.select_value = locale;
      $$payload.out.push(`<option value="en"${maybe_selected($$payload, "en")}>English</option><option value="es"${maybe_selected($$payload, "es")}>Español</option><option value="fr"${maybe_selected($$payload, "fr")}>Français</option>`);
      $$payload.select_value = void 0;
      $$payload.out.push(`</select></div> <div class="field full svelte-10wgvqg" style="position:relative;"><label for="text" class="svelte-10wgvqg">${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.title"))}</label> <textarea id="text"${attr("lang", data.serverLocale || "en")} spellcheck="true"${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("evaluate.placeholder"))} rows="16"${attr("disabled", isLoading, true)} class="svelte-10wgvqg">`);
      const $$body = escape_html(text);
      if ($$body) {
        $$payload.out.push(`${$$body}`);
      }
      $$payload.out.push(`</textarea> <button class="copy-inline svelte-10wgvqg"${attr("title", store_get($$store_subs ??= {}, "$t", t)("audio.copy"))}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg></button> <div class="textarea-footer"><span class="char-count">${escape_html(text.length)} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.words") || "chars")}</span></div></div> <p class="privacy-note svelte-10wgvqg">🔒 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.privacy_note"))}</p> `);
      {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--> <button type="submit"${attr("disabled", isLoading, true)} class="svelte-10wgvqg">${escape_html(store_get($$store_subs ??= {}, "$t", t)("evaluate.submit"))}</button></form>`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--> <div class="prompt-inspector"><button class="prompt-toggle svelte-10wgvqg">${escape_html(store_get($$store_subs ??= {}, "$t", t)("taller.show_prompt"))}</button> `);
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
