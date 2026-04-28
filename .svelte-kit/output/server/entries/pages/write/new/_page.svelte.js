import { e as escape_html, b as store_get, c as attr, u as unsubscribe_stores, d as derived } from "../../../../chunks/renderer.js";
import { t } from "../../../../chunks/index3.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let title = "";
    let content = "";
    let visibility = "public";
    let aiAssisted = false;
    let wordCount = derived(() => content.trim() ? content.trim().split(/\s+/).length : 0);
    function catLabel(key) {
      return `write.category.${key}`;
    }
    $$renderer2.push(`<div class="editor-page svelte-p7m09"><button class="back-link svelte-p7m09">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.back"))}</button> <h1 class="editor-heading svelte-p7m09">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.heading"))}</h1> `);
    if (data.prompt) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="prompt-context svelte-p7m09"><span class="prompt-tag svelte-p7m09">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.from_prompt"))}</span> <p class="prompt-text svelte-p7m09">${escape_html(data.prompt.prompt_text)}</p> <span class="prompt-cat svelte-p7m09">${escape_html(store_get($$store_subs ??= {}, "$t", t)(catLabel(data.prompt.category)))}</span></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="editor-field svelte-p7m09"><label class="svelte-p7m09">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.title"))}</label> <input type="text"${attr("value", title)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("write.editor.title_placeholder"))} required="" class="svelte-p7m09"/></div> <div class="editor-field full svelte-p7m09"><label class="svelte-p7m09">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.content"))} <span class="word-count svelte-p7m09">${escape_html(wordCount())} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.words"))}</span></label> <div style="position:relative;"><textarea${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("write.editor.content_placeholder"))} rows="16" required="" class="svelte-p7m09">`);
    const $$body = escape_html(content);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea> <button class="copy-inline" title="Copy"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg></button></div></div> <div class="editor-options svelte-p7m09"><div class="option-group svelte-p7m09"><label class="svelte-p7m09">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.visibility"))}</label> `);
    $$renderer2.select({ value: visibility }, ($$renderer3) => {
      $$renderer3.option({ value: "private" }, ($$renderer4) => {
        $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.private"))}`);
      });
      $$renderer3.option({ value: "public" }, ($$renderer4) => {
        $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.public"))}`);
      });
    });
    $$renderer2.push(`</div> <label class="toggle-label svelte-p7m09"${attr("title", store_get($$store_subs ??= {}, "$t", t)("write.editor.ai_tooltip"))}><input type="checkbox"${attr("checked", aiAssisted, true)} class="svelte-p7m09"/> <span>${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.ai_assisted"))} <span class="info-icon"${attr("title", store_get($$store_subs ??= {}, "$t", t)("write.editor.ai_tooltip"))}>ⓘ</span></span></label></div> <div class="editor-actions svelte-p7m09"><button class="btn-glass svelte-p7m09"${attr("disabled", !title.trim() || !content.trim(), true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.save_draft"))}</button> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<label class="disclosure-check svelte-p7m09"><input type="checkbox" checked="" class="svelte-p7m09"/> <span>${escape_html(store_get($$store_subs ??= {}, "$t", t)("disclosure.publish_consent"))}</span></label>`);
    }
    $$renderer2.push(`<!--]--> <button class="btn-accent svelte-p7m09"${attr("disabled", !title.trim() || !content.trim(), true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.publish"))}</button></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
