import { e as escape_html, b as store_get, c as attr, u as unsubscribe_stores } from "../../../../../chunks/renderer.js";
import { g as getLocale, t } from "../../../../../chunks/index3.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
import "marked";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let title = data.writing.title;
    let content = data.writing.content;
    let isPublished = data.writing.status === "published";
    let visibility = data.writing.visibility || "public";
    let wordCount = data.writing.word_count || 0;
    let saving = false;
    function formatDate(d) {
      if (!d) return "";
      const s = d.replace(" ", "T");
      const localeCode = getLocale() || "en-US";
      return new Date(s).toLocaleDateString(localeCode, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    $$renderer2.push(`<div class="edit-page svelte-mqfs67"><div class="edit-header svelte-mqfs67"><button class="back-link svelte-mqfs67">← ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.back"))}</button> <div class="edit-meta svelte-mqfs67">`);
    if (data.writing.prompt_text) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="from-prompt svelte-mqfs67">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.from_prompt"))}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <span class="edit-date">${escape_html(formatDate(data.writing.created_at))}</span> <span class="word-count svelte-mqfs67">${escape_html(wordCount.toLocaleString())} words</span></div></div> <div class="editor-field svelte-mqfs67"><label for="edit-title" class="svelte-mqfs67">Title</label> <input id="edit-title" type="text"${attr("value", title)} required="" placeholder="Give your piece a title..." class="svelte-mqfs67"/></div> <div class="editor-toolbar svelte-mqfs67"><button type="button" class="toolbar-btn svelte-mqfs67">${escape_html("👁 Preview")}</button> <div class="toolbar-spacer svelte-mqfs67"></div> <span class="visibility-label svelte-mqfs67">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.visibility"))}:</span> `);
    $$renderer2.select(
      { value: visibility, class: "" },
      ($$renderer3) => {
        $$renderer3.option({ value: "public" }, ($$renderer4) => {
          $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.public"))}`);
        });
        $$renderer3.option({ value: "private" }, ($$renderer4) => {
          $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.private"))}`);
        });
      },
      "svelte-mqfs67"
    );
    $$renderer2.push(`</div> <div class="editor-body svelte-mqfs67">`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<textarea${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("write.start_placeholder"))} class="editor-textarea svelte-mqfs67">`);
      const $$body = escape_html(content);
      if ($$body) {
        $$renderer2.push(`${$$body}`);
      }
      $$renderer2.push(`</textarea>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="editor-actions svelte-mqfs67">`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button class="btn-save svelte-mqfs67"${attr("disabled", saving, true)}>${escape_html("💾 Save Draft")}</button> <button class="btn-publish svelte-mqfs67"${attr("disabled", saving, true)}>🚀 ${escape_html(isPublished ? "Republish" : "Publish")}</button></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
