import { e as escape_html, c as store_get, d as attr, n as maybe_selected, u as unsubscribe_stores, a as pop, p as push } from "../../../../../chunks/index2.js";
import { g as getLocale, t } from "../../../../../chunks/index3.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "../../../../../chunks/state.svelte.js";
import "marked";
function _page($$payload, $$props) {
  push();
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
  $$payload.out.push(`<div class="edit-page svelte-mqfs67"><div class="edit-header svelte-mqfs67"><button class="back-link svelte-mqfs67">← ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.back"))}</button> <div class="edit-meta svelte-mqfs67">`);
  if (data.writing.prompt_text) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<span class="from-prompt svelte-mqfs67">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.from_prompt"))}</span>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <span class="edit-date">${escape_html(formatDate(data.writing.created_at))}</span> <span class="word-count svelte-mqfs67">${escape_html(wordCount.toLocaleString())} words</span></div></div> <div class="editor-field svelte-mqfs67"><label for="edit-title" class="svelte-mqfs67">Title</label> <input id="edit-title" type="text"${attr("value", title)} required placeholder="Give your piece a title..." class="svelte-mqfs67"/></div> <div class="editor-toolbar svelte-mqfs67"><button type="button" class="toolbar-btn svelte-mqfs67">${escape_html("👁 Preview")}</button> <div class="toolbar-spacer svelte-mqfs67"></div> <span class="visibility-label svelte-mqfs67">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.visibility"))}:</span> <select class="svelte-mqfs67">`);
  $$payload.select_value = visibility;
  $$payload.out.push(`<option value="public"${maybe_selected($$payload, "public")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.public"))}</option><option value="private"${maybe_selected($$payload, "private")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.private"))}</option>`);
  $$payload.select_value = void 0;
  $$payload.out.push(`</select></div> <div class="editor-body svelte-mqfs67">`);
  {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<textarea${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("write.start_placeholder"))} class="editor-textarea svelte-mqfs67">`);
    const $$body = escape_html(content);
    if ($$body) {
      $$payload.out.push(`${$$body}`);
    }
    $$payload.out.push(`</textarea>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="editor-actions svelte-mqfs67">`);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <button class="btn-save svelte-mqfs67"${attr("disabled", saving, true)}>${escape_html("💾 Save Draft")}</button> <button class="btn-publish svelte-mqfs67"${attr("disabled", saving, true)}>🚀 ${escape_html(isPublished ? "Republish" : "Publish")}</button></div></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
