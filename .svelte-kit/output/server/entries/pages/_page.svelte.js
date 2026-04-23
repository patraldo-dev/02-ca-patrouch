import { f as ensure_array_like, k as head, e as escape_html, d as attr, c as store_get, g as attr_class, u as unsubscribe_stores, a as pop, p as push } from "../../chunks/index2.js";
import { t } from "../../chunks/index3.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "../../chunks/state.svelte.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  const exploreGroups = [
    {
      key: "genres",
      icon: "📚",
      items: [
        { key: "fiction", href: "/agora?category=fiction" },
        { key: "poetry", href: "/agora?category=poetry" },
        { key: "memoir", href: "/agora?category=memoir" },
        { key: "sci-fi", href: "/agora?category=sci-fi" },
        { key: "mystery", href: "/agora?category=mystery" },
        { key: "romance", href: "/agora?category=romance" },
        { key: "fantasy", href: "/agora?category=fantasy" },
        {
          key: "creative-nonfiction",
          href: "/agora?category=creative-non-fiction"
        }
      ]
    },
    {
      key: "games",
      icon: "🎮",
      items: [
        {
          key: "find_the_ai",
          href: "/agora?author=both" + (data.serverLocale ? "&locale=" + data.serverLocale : ""),
          active: true
        },
        { key: "bottle_quest", href: "/games/booty", active: true },
        { key: "challenges", href: "/write", active: false },
        { key: "weekly_challenge", href: "/write", active: false }
      ]
    },
    {
      key: "community",
      icon: "🤝",
      items: [
        { key: "writer_of_week", href: "/agora", active: false },
        { key: "sprints", href: "/agora", active: false },
        { key: "badges", href: "/profile", active: true }
      ]
    }
  ];
  typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  let currentPrompt = 0;
  let carouselDirection = "next";
  const each_array_2 = ensure_array_like(exploreGroups);
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.title"))}</title>`;
  });
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <section class="hero svelte-1uha8ag"><div class="hero-glow svelte-1uha8ag"></div> <div class="container hero-content svelte-1uha8ag"><p class="hero-label svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.hero.label"))}</p> <h1 class="hero-name svelte-1uha8ag"><span class="hero-first svelte-1uha8ag">Christophe R</span> <span class="hero-last svelte-1uha8ag">Patraldo</span></h1> <p class="hero-tagline svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.hero.tagline"))}</p> <a${attr("href", data.pastPrompts?.length > 0 ? "#prompt-teaser" : "#portfolio")} class="hero-scroll svelte-1uha8ag" aria-label="Scroll to content"><div class="scroll-line svelte-1uha8ag"></div></a></div></section> `);
  if (data.pastPrompts?.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(data.pastPrompts);
    const each_array_1 = ensure_array_like(data.pastPrompts);
    $$payload.out.push(`<section id="prompt-teaser" class="prompt-teaser svelte-1uha8ag"><div class="container svelte-1uha8ag"><span class="teaser-label svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.prompt.label"))}</span> <div class="carousel-container svelte-1uha8ag"><button class="carousel-arrow carousel-arrow-left svelte-1uha8ag" aria-label="Previous prompt"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-1uha8ag"><path d="M15 18l-6-6 6-6" class="svelte-1uha8ag"></path></svg></button> <div class="carousel-viewport svelte-1uha8ag"><!--[-->`);
    for (let i = 0, $$length = each_array.length; i < $$length; i++) {
      let prompt = each_array[i];
      if (i === currentPrompt) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<blockquote${attr_class("carousel-slide svelte-1uha8ag", void 0, {
          "slide-in-right": carouselDirection === "next",
          "slide-in-left": carouselDirection === "prev"
        })}><span class="slide-date svelte-1uha8ag">${escape_html(prompt.dateLabel)}</span> <p class="svelte-1uha8ag">${escape_html(prompt.prompt_text)}</p></blockquote>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]--></div> <button class="carousel-arrow carousel-arrow-right svelte-1uha8ag" aria-label="Next prompt"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-1uha8ag"><path d="M9 18l6-6-6-6" class="svelte-1uha8ag"></path></svg></button></div> <div class="carousel-dots svelte-1uha8ag"><!--[-->`);
    for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
      each_array_1[i];
      $$payload.out.push(`<span${attr_class("dot svelte-1uha8ag", void 0, { "active": i === currentPrompt })}></span>`);
    }
    $$payload.out.push(`<!--]--></div> `);
    if (data.user) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<a href="/write" class="teaser-cta svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.prompt.start_writing"))}</a>`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<a href="/signup" class="teaser-cta svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.prompt.cta_guest"))}</a>`);
    }
    $$payload.out.push(`<!--]--></div></section>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <section id="portfolio" class="section works-section svelte-1uha8ag"><div class="container svelte-1uha8ag"><div class="section-label fade-in svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.works.label"))}</div> <h2 class="fade-in svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.works.heading"))}</h2> <p class="section-desc fade-in svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.works.description"))}</p> <div class="works-grid svelte-1uha8ag"><a href="/write" class="glass-card svelte-1uha8ag"><span class="card-icon svelte-1uha8ag">✨</span> <h3 class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.works.prompts"))}</h3> <p class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.works.prompts.desc"))}</p></a> <a href="/agora" class="glass-card svelte-1uha8ag"><span class="card-icon svelte-1uha8ag">🏛️</span> <h3 class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.works.agora"))}</h3> <p class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.works.agora.desc"))}</p></a> <a href="/profile" class="glass-card svelte-1uha8ag"><span class="card-icon svelte-1uha8ag">📊</span> <h3 class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.works.stats"))}</h3> <p class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.works.stats.desc"))}</p></a> <a href="/games" class="glass-card svelte-1uha8ag"><span class="card-icon svelte-1uha8ag">🎮</span> <h3 class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.works.games"))}</h3> <p class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.works.games.desc"))}</p></a></div></div></section> <section class="section about-section svelte-1uha8ag"><div class="container svelte-1uha8ag"><div class="section-label fade-in svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.about.label"))}</div> <h2 class="fade-in svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.about.heading"))}</h2> <div class="about-content fade-in svelte-1uha8ag"><p class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.about.paragraph1"))}</p> <p class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.about.paragraph2"))}</p></div></div></section> <section class="section explore-section svelte-1uha8ag"><div class="container svelte-1uha8ag"><div class="section-label fade-in svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.explore.label"))}</div> <h2 class="fade-in svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.home.explore.heading"))}</h2> <div class="explore-grid fade-in svelte-1uha8ag"><!--[-->`);
  for (let $$index_3 = 0, $$length = each_array_2.length; $$index_3 < $$length; $$index_3++) {
    let group = each_array_2[$$index_3];
    const each_array_3 = ensure_array_like(group.items);
    $$payload.out.push(`<div class="explore-group svelte-1uha8ag"><h3 class="explore-group-title svelte-1uha8ag"><span class="explore-group-icon svelte-1uha8ag">${escape_html(group.icon)}</span> ${escape_html(store_get($$store_subs ??= {}, "$t", t)(`pages.home.explore.${group.key}`))}</h3> <div class="explore-tags svelte-1uha8ag"><!--[-->`);
    for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
      let item = each_array_3[$$index_2];
      $$payload.out.push(`<a${attr("href", item.href)}${attr_class("explore-tag svelte-1uha8ag", void 0, { "muted": !item.active })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)(`pages.home.explore.${item.key}`))}</a>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--></div></div></section>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
