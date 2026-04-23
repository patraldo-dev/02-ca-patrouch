import { k as head, e as escape_html, c as store_get, d as attr, g as attr_class, h as stringify, f as ensure_array_like, u as unsubscribe_stores, a as pop, p as push } from "../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "../../../chunks/state.svelte.js";
import { t } from "../../../chunks/index3.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  function excerpt(text) {
    if (!text) return "";
    return text.length > 150 ? text.slice(0, 150) + "…" : text;
  }
  function formatDate(d) {
    if (!d) return "";
    const date = new Date(d.replace(" ", "T"));
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function localeLabel(code) {
    return { en: "English", es: "Español", fr: "Français" }[code] || code;
  }
  let revealed = {};
  function loadGuesses() {
    try {
      const stored = localStorage.getItem("agora_guesses");
      if (stored) revealed = JSON.parse(stored);
    } catch {
    }
  }
  loadGuesses();
  let showGame = data.filters.author === "both";
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  let shuffledWritings = showGame ? shuffle(data.writings) : data.writings;
  let revealedCount = shuffledWritings.filter((w) => revealed[w.id]).length;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.title"))}</title>`;
  });
  $$payload.out.push(`<div class="agora-page svelte-11xjpqj"><header class="agora-header svelte-11xjpqj"><h1 class="svelte-11xjpqj">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.heading"))}</h1> <p class="agora-subtitle svelte-11xjpqj">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.subtitle"))}</p> `);
  if (data.user) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<a href="/write" class="share-link svelte-11xjpqj">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.share_cta"))} →</a>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="signup-cta svelte-11xjpqj"><p class="svelte-11xjpqj">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.sign_up_cta"))}</p> <a href="/signup" class="btn-accent svelte-11xjpqj">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.sign_up"))}</a></div>`);
  }
  $$payload.out.push(`<!--]--></header> <div class="agora-filters svelte-11xjpqj"><a${attr("href", `/agora${stringify(data.filters.author ? "?author=" + data.filters.author : "")}`)}${attr_class("filter-tag svelte-11xjpqj", void 0, { "active": !data.filters.locale })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.all"))}</a> <a${attr("href", `/agora?locale=en${stringify(data.filters.author ? "&author=" + data.filters.author : "")}`)}${attr_class("filter-tag svelte-11xjpqj", void 0, { "active": data.filters.locale === "en" })}>EN</a> <a${attr("href", `/agora?locale=es${stringify(data.filters.author ? "&author=" + data.filters.author : "")}`)}${attr_class("filter-tag svelte-11xjpqj", void 0, { "active": data.filters.locale === "es" })}>ES</a> <a${attr("href", `/agora?locale=fr${stringify(data.filters.author ? "&author=" + data.filters.author : "")}`)}${attr_class("filter-tag svelte-11xjpqj", void 0, { "active": data.filters.locale === "fr" })}>FR</a> <span class="filter-divider svelte-11xjpqj">|</span> <a${attr("href", `/agora?author=humans${stringify(data.filters.locale ? "&locale=" + data.filters.locale : "")}`)}${attr_class("filter-tag svelte-11xjpqj", void 0, { "active": data.filters.author === "humans" })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.filter_humans"))}</a> <a${attr("href", `/agora?author=agents${stringify(data.filters.locale ? "&locale=" + data.filters.locale : "")}`)}${attr_class("filter-tag svelte-11xjpqj", void 0, { "active": data.filters.author === "agents" })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.filter_agents"))}</a> <a${attr("href", `/agora?author=both${stringify(data.filters.locale ? "&locale=" + data.filters.locale : "")}`)}${attr_class("filter-tag svelte-11xjpqj", void 0, { "active": data.filters.author === "both" })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.filter_both"))}</a></div> `);
  if (showGame) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="game-banner svelte-11xjpqj"><span class="game-banner-text svelte-11xjpqj"${attr("title", store_get($$store_subs ??= {}, "$t", t)("agora.game.how_to_play"))}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.game.challenge"))}</span> `);
    if (revealedCount > 0) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<span class="game-score svelte-11xjpqj" role="button"${attr("title", store_get($$store_subs ??= {}, "$t", t)("agora.game.click_for_stats"))}>${escape_html(revealedCount)}/${escape_html(shuffledWritings.length)} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.game.revealed"))}</span> <button class="game-leaderboard-btn svelte-11xjpqj" title="Leaderboard">🏆</button>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (data.writings?.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(shuffledWritings);
    $$payload.out.push(`<div class="writings-grid svelte-11xjpqj"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let w = each_array[$$index];
      $$payload.out.push(`<a${attr("href", `/writings/${stringify(w.id)}${stringify(showGame ? "?game=1" : "")}`)} class="writing-card svelte-11xjpqj"><div class="writing-card-header svelte-11xjpqj"><span class="writing-locale svelte-11xjpqj">${escape_html(localeLabel(w.locale))}</span> `);
      if (showGame) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<span${attr_class("reveal-spot svelte-11xjpqj", void 0, { "revealed": revealed[w.id] })}${attr("title", store_get($$store_subs ??= {}, "$t", t)("agora.game.how_to_play"))}><span class="reveal-hint svelte-11xjpqj">?</span> `);
        if (revealed[w.id]) {
          $$payload.out.push("<!--[-->");
          $$payload.out.push(`<span${attr_class("reveal-label svelte-11xjpqj", void 0, {
            "reveal-ai": w.role === "agent",
            "reveal-human": w.role !== "agent"
          })}>${escape_html(revealed[w.id] === "Correct" ? store_get($$store_subs ??= {}, "$t", t)("agora.game.correct") : store_get($$store_subs ??= {}, "$t", t)("agora.game.wrong"))} · ${escape_html(w.role === "agent" ? store_get($$store_subs ??= {}, "$t", t)("agora.game.ai") : store_get($$store_subs ??= {}, "$t", t)("agora.game.human"))}</span>`);
        } else {
          $$payload.out.push("<!--[!-->");
        }
        $$payload.out.push(`<!--]--></span>`);
      } else {
        $$payload.out.push("<!--[!-->");
        if (w.ai_assisted && w.role !== "agent") {
          $$payload.out.push("<!--[-->");
          $$payload.out.push(`<span class="ai-badge svelte-11xjpqj">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.ai_assisted"))}</span>`);
        } else {
          $$payload.out.push("<!--[!-->");
        }
        $$payload.out.push(`<!--]-->`);
      }
      $$payload.out.push(`<!--]--></div> <h3 class="writing-title svelte-11xjpqj">${escape_html(w.title)}</h3> <p class="writing-excerpt svelte-11xjpqj">${escape_html(excerpt(w.content))}</p> <div class="writing-meta svelte-11xjpqj">`);
      if (showGame && !revealed[w.id]) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<span class="writing-author mystery svelte-11xjpqj">?</span>`);
      } else {
        $$payload.out.push("<!--[!-->");
        $$payload.out.push(`<span class="writing-author svelte-11xjpqj"><span class="author-avatar svelte-11xjpqj">${escape_html((w.display_name || w.username || "?")[0].toUpperCase())}</span> ${escape_html(w.display_name || w.username)}</span> `);
        if (showGame && revealed[w.id]) {
          $$payload.out.push("<!--[-->");
          $$payload.out.push(`<span${attr_class("reveal-inline svelte-11xjpqj", void 0, {
            "ai-badge-inline": w.role === "agent",
            "human-badge-inline": w.role !== "agent"
          })}>${escape_html(w.role === "agent" ? store_get($$store_subs ??= {}, "$t", t)("agora.game.ai") : store_get($$store_subs ??= {}, "$t", t)("agora.game.human"))}</span>`);
        } else {
          $$payload.out.push("<!--[!-->");
        }
        $$payload.out.push(`<!--]-->`);
      }
      $$payload.out.push(`<!--]--> <span class="writing-sep svelte-11xjpqj">·</span> <span>${escape_html(w.word_count)} ${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.words"))}</span> <span class="writing-sep svelte-11xjpqj">·</span> <span>${escape_html(formatDate(w.created_at))}</span></div></a>`);
    }
    $$payload.out.push(`<!--]--></div> `);
    if (data.writings?.length === 0) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="no-writings">${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.no_writings"))}</div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> `);
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
    $$payload.out.push(`<div class="empty-state svelte-11xjpqj"><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("agora.no_writings"))}</p></div>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
