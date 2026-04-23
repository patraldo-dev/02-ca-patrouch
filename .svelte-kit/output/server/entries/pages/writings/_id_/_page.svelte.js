import { g as attr_class, e as escape_html, c as store_get, d as attr, u as unsubscribe_stores, a as pop, p as push, n as maybe_selected, f as ensure_array_like, h as stringify } from "../../../../chunks/index2.js";
import { t, g as getLocale } from "../../../../chunks/index3.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "../../../../chunks/state.svelte.js";
import { p as page } from "../../../../chunks/stores.js";
import "marked";
import { h as html } from "../../../../chunks/html.js";
function CommentItem($$payload, $$props) {
  push();
  var $$store_subs;
  let {
    comment,
    user,
    writingAuthorId,
    isAdmin = false
  } = $$props;
  let reported = false;
  let renderedContent = "";
  let userRole = user?.role || "user";
  function canDelete() {
    return user && (comment.user_id === user.id || comment.user_id === writingAuthorId || isAdmin);
  }
  function canReply() {
    return user && (userRole === "member" || userRole === "admin");
  }
  function formatTimestamp(d) {
    if (!d) return "";
    try {
      const s = d.replace(" ", "T");
      return new Date(s).toLocaleDateString(void 0, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return d;
    }
  }
  let avatar = (comment.username || "?")[0].toUpperCase();
  {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${attr_class("comment-item svelte-4fz57e", void 0, { "is-featured": comment.is_featured })}><div class="comment-avatar svelte-4fz57e">${escape_html(avatar)}</div> <div class="comment-body svelte-4fz57e"><div class="comment-header svelte-4fz57e"><span class="comment-username svelte-4fz57e">${escape_html(comment.username)}</span> `);
    if (comment.parent_username) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<span class="reply-indicator svelte-4fz57e">↳ ${escape_html(store_get($$store_subs ??= {}, "$t", t)("comments.reply_to"))} @${escape_html(comment.parent_username)}</span>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> `);
    if (comment.is_featured) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<span class="featured-badge svelte-4fz57e">${escape_html(store_get($$store_subs ??= {}, "$t", t)("comments.picks_badge"))}</span>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> <span class="comment-time svelte-4fz57e">${escape_html(formatTimestamp(comment.created_at))}</span></div> <div class="comment-content svelte-4fz57e">${html(renderedContent)}</div> <div class="comment-actions svelte-4fz57e"><button${attr_class("action-btn like-btn svelte-4fz57e", void 0, { "liked": comment.liked })}${attr("title", store_get($$store_subs ??= {}, "$t", t)("comments.like"))}><svg width="14" height="14" viewBox="0 0 24 24"${attr("fill", comment.liked ? "currentColor" : "none")} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> <span>${escape_html(comment.likes_count || "")}</span></button> `);
    if (canReply()) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<button class="action-btn svelte-4fz57e"${attr("title", store_get($$store_subs ??= {}, "$t", t)("comments.reply"))}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></button>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> `);
    if (user && comment.user_id !== user.id) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<button${attr_class("action-btn svelte-4fz57e", void 0, { "reported": reported })}${attr("disabled", reported, true)}${attr("title", store_get($$store_subs ??= {}, "$t", t)("comments.report"))}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> `);
      {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--></button>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> `);
    if (canDelete()) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<button class="action-btn delete-btn svelte-4fz57e"${attr("title", store_get($$store_subs ??= {}, "$t", t)("comments.delete"))}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> `);
    if (isAdmin) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<button${attr_class("action-btn pick-btn svelte-4fz57e", void 0, { "picked": comment.is_featured })}${attr("title", store_get($$store_subs ??= {}, "$t", t)("comments.picks_badge"))}><svg width="14" height="14" viewBox="0 0 24 24"${attr("fill", comment.is_featured ? "currentColor" : "none")} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></button>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div> `);
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]-->`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
function CommentSection($$payload, $$props) {
  push();
  var $$store_subs;
  let {
    writingAuthorId,
    allowComments = 1,
    user,
    isAdmin = false,
    isAuthor = false
  } = $$props;
  let comments = [];
  let total = 0;
  let sort = "newest";
  let commentText = "";
  let submitting = false;
  let loading = false;
  let commentsEnabled = allowComments === 1;
  const MAX_CHARS = 1500;
  let usernameMap = (() => {
    const m = {};
    for (const c of comments) {
      m[c.id] = c.username;
    }
    return m;
  })();
  let enrichedComments = comments.map((c) => ({
    ...c,
    parent_username: c.parent_id ? usernameMap[c.parent_id] : null
  }));
  let hasMore = comments.length < total;
  user?.role || "user";
  $$payload.out.push(`<section class="comment-section svelte-g4brq8"><div class="comment-header svelte-g4brq8"><h3 class="svelte-g4brq8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("comments.title"))} <span class="comment-count svelte-g4brq8">(${escape_html(total)})</span></h3> <div class="comment-controls svelte-g4brq8"><select class="sort-select svelte-g4brq8">`);
  $$payload.select_value = sort;
  $$payload.out.push(`<option value="newest"${maybe_selected($$payload, "newest")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("comments.sort_newest"))}</option><option value="oldest"${maybe_selected($$payload, "oldest")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("comments.sort_oldest"))}</option><option value="liked"${maybe_selected($$payload, "liked")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("comments.sort_liked"))}</option><option value="picks"${maybe_selected($$payload, "picks")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("comments.sort_picks"))}</option>`);
  $$payload.select_value = void 0;
  $$payload.out.push(`</select> `);
  if (isAuthor || isAdmin) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<button class="toggle-btn svelte-g4brq8">${escape_html(commentsEnabled ? store_get($$store_subs ??= {}, "$t", t)("comments.comments_off") : store_get($$store_subs ??= {}, "$t", t)("comments.toggle_comments"))}</button>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div></div> `);
  if (user && commentsEnabled) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="comment-form svelte-g4brq8">`);
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> <textarea${attr("maxlength", MAX_CHARS)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("comments.placeholder"))} rows="3" class="comment-textarea svelte-g4brq8">`);
    const $$body = escape_html(commentText);
    if ($$body) {
      $$payload.out.push(`${$$body}`);
    }
    $$payload.out.push(`</textarea> <div class="form-footer svelte-g4brq8"><span${attr_class("char-count svelte-g4brq8", void 0, { "over": commentText.length > MAX_CHARS })}>${escape_html(commentText.length)}/1500</span> <button class="btn-submit-comment svelte-g4brq8"${attr("disabled", !commentText.trim() || submitting, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("comments.submit"))}</button></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (!user) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="login-prompt svelte-g4brq8"><a href="/auth/login" class="svelte-g4brq8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("comments.login_required"))}</a></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
      if (!commentsEnabled) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<div class="comments-disabled svelte-g4brq8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("comments.comments_off"))}</div>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--> <div class="comment-list svelte-g4brq8">`);
  {
    $$payload.out.push("<!--[!-->");
    if (comments.length === 0) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="no-comments svelte-g4brq8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("comments.no_comments"))}</div>`);
    } else {
      $$payload.out.push("<!--[!-->");
      const each_array = ensure_array_like(enrichedComments);
      $$payload.out.push(`<!--[-->`);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let comment = each_array[$$index];
        CommentItem($$payload, {
          comment,
          user,
          writingAuthorId,
          isAdmin
        });
      }
      $$payload.out.push(`<!--]--> `);
      if (hasMore) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<button class="load-more svelte-g4brq8"${attr("disabled", loading, true)}>${escape_html("Load more")}</button>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div></section>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  let w = data.writing;
  let isEvaluating = false;
  let isAudioLoading = false;
  let renderedContent = "";
  let isPublishing = false;
  let gameMode = store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("game") === "1";
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
  function wordCountDisplay(n) {
    return n != null ? n.toLocaleString() : "0";
  }
  $$payload.out.push(`<div class="view-page svelte-4xfc6m"><a${attr("href", gameMode ? "/agora?author=both" : "/write")} class="back-link svelte-4xfc6m">← ${escape_html(gameMode ? store_get($$store_subs ??= {}, "$t", t)("agora.game.back_to_agora") : store_get($$store_subs ??= {}, "$t", t)("write.editor.back"))}</a> <article class="writing-view svelte-4xfc6m">`);
  if (w.status === "published") {
    $$payload.out.push("<!--[-->");
    CommentSection($$payload, {
      writingId: w.id,
      writingAuthorId: w.user_id,
      allowComments: w.allow_comments,
      user: data.user,
      isAdmin: data.user?.role === "admin",
      isAuthor: data.user?.id === w.user_id
    });
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <header class="writing-header svelte-4xfc6m"><h1 class="svelte-4xfc6m">${escape_html(w.title)}</h1> <div class="writing-meta svelte-4xfc6m">`);
  if (gameMode && true) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<span class="meta-author mystery svelte-4xfc6m">?</span>`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (w.show_profile) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<a${attr("href", `/write/${stringify(w.username)}`)} class="meta-author-link svelte-4xfc6m">${escape_html(w.username)}</a>`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<span class="meta-author svelte-4xfc6m">${escape_html(w.username)}</span>`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--> <span class="meta-date">${escape_html(formatDate(w.created_at))}</span> <span class="meta-words">${escape_html(wordCountDisplay(w.word_count))} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.dashboard.words_word"))}</span> `);
  if (gameMode && true) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="guess-container-view svelte-4xfc6m"><span class="reveal-spot-view svelte-4xfc6m" role="button" tabindex="0">?</span> `);
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--> `);
  if (w.status === "draft") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<span class="status-draft svelte-4xfc6m">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.status_draft"))}</span>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<span class="status-published svelte-4xfc6m">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.status_published"))}</span>`);
  }
  $$payload.out.push(`<!--]--></div> `);
  if (w.prompt_text) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="prompt-ref svelte-4xfc6m"><span class="prompt-tag svelte-4xfc6m">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.from_prompt"))}</span> <p class="svelte-4xfc6m">${escape_html(w.prompt_text)}</p></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (w.visual_prompt_text) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="prompt-ref visual-prompt-ref svelte-4xfc6m">`);
    if (w.visual_artwork_url) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<img${attr("src", w.visual_artwork_url)} alt="Visual prompt artwork" class="visual-prompt-thumb svelte-4xfc6m"/>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> <div><span class="prompt-tag svelte-4xfc6m">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.from_visual_prompt"))}</span> <p class="svelte-4xfc6m">${escape_html(w.visual_prompt_text)}</p></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></header> <div class="writing-content svelte-4xfc6m">`);
  {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`${html(renderedContent)}`);
  }
  $$payload.out.push(`<!--]--></div> `);
  if (data.user?.id === w.user_id && w.status === "published") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="writing-pipeline svelte-4xfc6m"><button class="btn-pipeline svelte-4xfc6m"${attr("disabled", isEvaluating, true)}>✦ ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.evaluate"))}</button> <button class="btn-pipeline svelte-4xfc6m"${attr("disabled", isAudioLoading, true)}>♪ ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.audio"))}</button> <button class="btn-pipeline svelte-4xfc6m">✦ ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.refine"))}</button> `);
    {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<button class="btn-pipeline btn-keyword svelte-4xfc6m">🔑 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.choose_keyword"))}</button>`);
    }
    $$payload.out.push(`<!--]--></div> `);
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> `);
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <footer class="writing-footer svelte-4xfc6m"><div class="footer-actions svelte-4xfc6m">`);
  if (w.status === "published") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<a${attr("href", `/card/${stringify(w.id)}`)} class="btn-share svelte-4xfc6m" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> Share</a>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (data.user?.id === w.user_id) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<a${attr("href", `/writings/${stringify(w.id)}/edit`)} class="btn-glass svelte-4xfc6m">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.edit"))}</a> `);
    if (w.status === "draft") {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<button class="btn-publish svelte-4xfc6m"${attr("disabled", isPublishing, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.publish"))}</button>`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<button class="btn-unpublish svelte-4xfc6m"${attr("disabled", isPublishing, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.view.unpublish"))}</button>`);
    }
    $$payload.out.push(`<!--]--> <button class="btn-icon-delete svelte-4xfc6m"${attr("aria-label", store_get($$store_subs ??= {}, "$t", t)("write.view.delete"))}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div></footer> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></article></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
