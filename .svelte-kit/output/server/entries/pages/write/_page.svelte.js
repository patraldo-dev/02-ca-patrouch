import { f as ensure_array_like, e as escape_html, b as store_get, a as attr_class, c as attr, i as stringify, u as unsubscribe_stores, d as derived } from "../../../chunks/renderer.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
import { t } from "../../../chunks/index3.js";
/* empty css                                                            */
import "../../../chunks/WriterOfTheWeek.svelte_svelte_type_style_lang.js";
import "../../../chunks/OnboardingFlow.svelte_svelte_type_style_lang.js";
import { h as html } from "../../../chunks/html.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let quotes = data.tickerQuotes || [];
    let prompt = data.prompt || null;
    let promptSource = data.promptSource || "community";
    let userAction = data.userAction || null;
    let promptId = data.acceptedPromptId || null;
    let passesRemaining = data.passesRemaining || 3;
    data.passesUsed || 0;
    let isPassing = false;
    let isAccepting = false;
    let editorTitle = data.latestDraft?.title || "";
    let editorContent = data.latestDraft?.content || "";
    let editorWordCount = derived(() => editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0);
    let editorVisibility = "public";
    let editorAiAssisted = false;
    let editorSaving = false;
    let stats = data.stats || null;
    let promptMode = "text";
    function catLabel(key) {
      const k = "write.category." + key;
      const label = store_get($$store_subs ??= {}, "$t", t)(k);
      return label !== k ? label : key.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    let acceptedToday = derived(() => userAction === "accepted");
    let completedToday = derived(() => userAction === "completed");
    let exhaustedPasses = derived(() => passesRemaining <= 0 && !acceptedToday());
    function fmtNum(n) {
      return n != null ? n.toLocaleString() : "0";
    }
    function formatDate(d) {
      if (!d) return "";
      const s = d.replace(" ", "T");
      return new Date(s).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    $$renderer2.push(`<div class="write-page svelte-x5qlc8"><div class="inspiration-tape svelte-x5qlc8" role="status" aria-label="Writing inspiration"><div class="ticker-marquee svelte-x5qlc8"><div class="ticker-track svelte-x5qlc8"><!--[-->`);
    const each_array = ensure_array_like([...quotes, ...quotes]);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let quote = each_array[$$index];
      $$renderer2.push(`<span class="ticker-item svelte-x5qlc8">✍️ ${escape_html(quote)}</span><span class="ticker-divider svelte-x5qlc8">🌿</span>`);
    }
    $$renderer2.push(`<!--]--></div></div></div> `);
    if (!data.user) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="write-cta svelte-x5qlc8"><h1 class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.title"))}</h1> <p class="cta-subtitle svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.cta_subtitle"))}</p> <a href="/login" class="btn-accent svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.sign_in"))}</a></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="write-layout svelte-x5qlc8"><div class="write-main svelte-x5qlc8"><h1 class="write-heading svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.today_prompt"))}</h1> `);
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="prompt-mode-toggle svelte-x5qlc8"><button${attr_class("mode-btn svelte-x5qlc8", void 0, { "active": promptMode === "text" })}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-x5qlc8"><path d="M4 7V4h16v3M9 20h6M12 4v16" class="svelte-x5qlc8"></path></svg> ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.art.mode_text"))}</button> <button${attr_class("mode-btn svelte-x5qlc8", void 0, { "active": promptMode === "visual" })}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-x5qlc8"><rect x="3" y="3" width="18" height="18" rx="2" class="svelte-x5qlc8"></rect><circle cx="8.5" cy="8.5" r="1.5" class="svelte-x5qlc8"></circle><path d="M21 15l-5-5L5 21" class="svelte-x5qlc8"></path></svg> ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.art.mode_visual"))}</button></div> `);
        if (prompt) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="prompt-card svelte-x5qlc8"><div class="prompt-header svelte-x5qlc8"><span class="prompt-category svelte-x5qlc8">${escape_html(catLabel(prompt.category))}</span> `);
          if (promptSource === "personal") {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<span class="prompt-source-tag personal svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.personal_prompt"))}</span>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]--> `);
          if (acceptedToday()) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<span class="accepted-badge svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.accepted"))}</span>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]--></div> <p class="prompt-text svelte-x5qlc8">${escape_html(prompt.prompt_text)}</p> `);
          if (!acceptedToday() && !completedToday()) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<div class="prompt-actions svelte-x5qlc8"><button class="btn-accept svelte-x5qlc8"${attr("disabled", isAccepting, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.accept"))}</button> `);
            if (!exhaustedPasses()) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<button class="btn-pass svelte-x5qlc8"${attr("disabled", isPassing, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.pass"))}</button> <span class="passes-remaining svelte-x5qlc8">${escape_html(passesRemaining === 1 ? store_get($$store_subs ??= {}, "$t", t)("write.dashboard.passes_remaining_one").replace("{count}", passesRemaining) : store_get($$store_subs ??= {}, "$t", t)("write.dashboard.passes_remaining").replace("{count}", passesRemaining))}</span>`);
            } else {
              $$renderer2.push("<!--[-1-->");
              $$renderer2.push(`<p class="passes-exhausted svelte-x5qlc8">${html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.passes_exhausted"))}</p>`);
            }
            $$renderer2.push(`<!--]--></div>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]--></div>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> `);
        {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--> <div class="inline-editor svelte-x5qlc8"><h2 class="editor-heading svelte-x5qlc8">${escape_html(editorContent ? store_get($$store_subs ??= {}, "$t", t)("write.editor.heading_continue") : store_get($$store_subs ??= {}, "$t", t)("write.editor.heading"))}</h2> `);
      if (prompt && promptId && promptMode === "text") {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="editor-prompt-ref svelte-x5qlc8"><span class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.from_prompt"))}:</span> ${escape_html(prompt.prompt_text?.slice(0, 80))}${escape_html(prompt.prompt_text?.length > 80 ? "…" : "")}</div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <form class="svelte-x5qlc8"><input type="hidden" name="promptId"${attr("value", promptId || "")} class="svelte-x5qlc8"/> <div class="editor-field svelte-x5qlc8"><label class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.title"))}</label> <input type="text"${attr("value", editorTitle)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("write.editor.title_placeholder"))} required="" class="svelte-x5qlc8"/></div> <div class="editor-field full svelte-x5qlc8" style="position:relative;"><label class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.content"))} <span class="word-count svelte-x5qlc8">${escape_html(editorWordCount())} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.words"))}</span></label> <textarea${attr("lang", data.serverLocale || "en")} spellcheck="true"${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("write.editor.content_placeholder"))} rows="16" required="" class="svelte-x5qlc8">`);
      const $$body = escape_html(editorContent);
      if ($$body) {
        $$renderer2.push(`${$$body}`);
      }
      $$renderer2.push(`</textarea> <button${attr_class(`mic-btn ${stringify("")}`, "svelte-x5qlc8")} title="Dictate" aria-label="Voice dictation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-x5qlc8"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" class="svelte-x5qlc8"></path><path d="M19 10v2a7 7 0 01-14 0v-2" class="svelte-x5qlc8"></path><line x1="12" y1="19" x2="12" y2="23" class="svelte-x5qlc8"></line><line x1="8" y1="23" x2="16" y2="23" class="svelte-x5qlc8"></line></svg></button> <button class="copy-inline svelte-x5qlc8" title="Copy"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-x5qlc8"><rect x="9" y="9" width="13" height="13" rx="2" class="svelte-x5qlc8"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" class="svelte-x5qlc8"></path></svg></button></div> <div class="editor-options svelte-x5qlc8"><div class="option-group svelte-x5qlc8"><label class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.visibility"))}</label> `);
      $$renderer2.select(
        { value: editorVisibility, class: "" },
        ($$renderer3) => {
          $$renderer3.option(
            { value: "private", class: "" },
            ($$renderer4) => {
              $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.private"))}`);
            },
            "svelte-x5qlc8"
          );
          $$renderer3.option(
            { value: "public", class: "" },
            ($$renderer4) => {
              $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.public"))}`);
            },
            "svelte-x5qlc8"
          );
        },
        "svelte-x5qlc8"
      );
      $$renderer2.push(`</div> <label class="toggle-label svelte-x5qlc8"><input type="checkbox"${attr("checked", editorAiAssisted, true)} class="svelte-x5qlc8"/> <span class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.ai_assisted"))}</span> <span class="info-icon svelte-x5qlc8"${attr("title", store_get($$store_subs ??= {}, "$t", t)("write.editor.ai_tooltip"))}>ⓘ</span></label></div> `);
      {
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
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<button class="btn-timer svelte-x5qlc8">⏱ ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.timer.start_btn"))}</button>`);
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div class="editor-actions svelte-x5qlc8"><button type="button" class="btn-save svelte-x5qlc8"${attr("disabled", editorSaving, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.save_draft"))}</button> `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<label class="disclosure-check svelte-x5qlc8"><input type="checkbox" checked="" class="svelte-x5qlc8"/> <span class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("disclosure.publish_consent"))}</span></label>`);
      }
      $$renderer2.push(`<!--]--> <button type="submit" class="btn-accent svelte-x5qlc8"${attr("disabled", editorSaving, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.editor.publish"))}</button></div></form></div> `);
      if (exhaustedPasses() && !acceptedToday()) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="free-write-card svelte-x5qlc8"><h3 class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.free_writing"))}</h3> <p class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.free_writing_desc"))}</p> <a href="/write/new" class="btn-glass svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.start_free_writing"))}</a></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> <aside class="write-sidebar svelte-x5qlc8">`);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<button class="tour-link svelte-x5qlc8"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-x5qlc8"><circle cx="12" cy="12" r="10" class="svelte-x5qlc8"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" class="svelte-x5qlc8"></path><line x1="12" y1="17" x2="12.01" y2="17" class="svelte-x5qlc8"></line></svg> Show tour</button> <a href="/stats" class="sidebar-stats-link svelte-x5qlc8">📊 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("nav.stats"))}</a>`);
      }
      $$renderer2.push(`<!--]--> `);
      if (stats) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="stats-card svelte-x5qlc8"><h3 class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.your_stats"))}</h3> <div class="stat-grid svelte-x5qlc8"><div class="stat-item svelte-x5qlc8"><span class="stat-value svelte-x5qlc8">${escape_html(fmtNum(stats.total_writings))}</span> <span class="stat-label svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.writings"))}</span></div> <div class="stat-item svelte-x5qlc8"><span class="stat-value svelte-x5qlc8">${escape_html(fmtNum(stats.total_words))}</span> <span class="stat-label svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.words"))}</span></div> <div class="stat-item svelte-x5qlc8"><span class="stat-value svelte-x5qlc8">${escape_html(fmtNum(stats.current_streak))}</span> <span class="stat-label svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.day_streak"))}</span></div> <div class="stat-item svelte-x5qlc8"><span class="stat-value svelte-x5qlc8">${escape_html(fmtNum(stats.prompts_accepted))}</span> <span class="stat-label svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.accepted_label"))}</span></div></div> `);
        if (stats.longest_streak > 0) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<p class="stat-note svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.longest_streak").replace("{count}", stats.longest_streak))}</p>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div> <button class="milestones-btn svelte-x5qlc8"><span class="svelte-x5qlc8">📊</span> <span class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.milestones_title"))}</span></button> <button class="sidebar-action-btn svelte-x5qlc8"><span class="svelte-x5qlc8">🔥</span> <span class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.show_heatmap"))}</span></button> <button class="sidebar-action-btn svelte-x5qlc8"><span class="svelte-x5qlc8">🏅</span> <span class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.show_badges"))}</span></button>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (data.recentWritings?.length > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="recent-card svelte-x5qlc8"><h3 class="svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.recent_writings"))}</h3> <ul class="recent-list svelte-x5qlc8"><!--[-->`);
        const each_array_1 = ensure_array_like(data.recentWritings);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let w = each_array_1[$$index_1];
          $$renderer2.push(`<li class="svelte-x5qlc8"><a${attr("href", `/writings/${stringify(w.id)}`)} class="recent-link svelte-x5qlc8" sveltekit:prefetch=""><span class="recent-title svelte-x5qlc8">${escape_html(w.title)}</span> <span class="recent-meta svelte-x5qlc8">${escape_html(formatDate(w.created_at))} · ${escape_html(w.word_count)} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.words_word"))} `);
          if (w.status === "draft") {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<span class="draft-tag svelte-x5qlc8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.status_draft"))}</span>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]--></span></a></li>`);
        }
        $$renderer2.push(`<!--]--></ul></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></aside></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
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
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
