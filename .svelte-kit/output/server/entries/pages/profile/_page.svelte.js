import { p as push, f as ensure_array_like, e as escape_html, c as store_get, g as attr_class, d as attr, h as stringify, u as unsubscribe_stores, a as pop, l as attr_style, k as head } from "../../../chunks/index2.js";
import { t } from "../../../chunks/index3.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "../../../chunks/state.svelte.js";
/* empty css                                                            */
import { g as get } from "../../../chunks/index.js";
function WritingHeatmap($$payload, $$props) {
  push();
  var $$store_subs;
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  let weeks = [];
  let selectedDay = null;
  function getLevel(count) {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    return 4;
  }
  function getMonthLabel(weekIndex) {
    const week = weeks[weekIndex];
    if (!week) return "";
    if (weekIndex === 0) return MONTHS[week[0].month];
    const prevWeek = weeks[weekIndex - 1];
    if (week[0].month !== prevWeek[0].month) {
      return MONTHS[week[0].month];
    }
    return "";
  }
  const each_array = ensure_array_like(weeks);
  const each_array_1 = ensure_array_like(weeks);
  $$payload.out.push(`<div class="heatmap-container svelte-od1c5o"><div class="heatmap-header svelte-od1c5o"><span class="heatmap-title svelte-od1c5o">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.heatmap_title"))}</span> <div class="legend svelte-od1c5o"><span class="label svelte-od1c5o">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.heatmap_less"))}</span> <span class="cell level-0 svelte-od1c5o"></span> <span class="cell level-1 svelte-od1c5o"></span> <span class="cell level-2 svelte-od1c5o"></span> <span class="cell level-3 svelte-od1c5o"></span> <span class="cell level-4 svelte-od1c5o"></span> <span class="label svelte-od1c5o">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.heatmap_more"))}</span></div></div> <div class="heatmap-grid svelte-od1c5o"><div class="month-labels svelte-od1c5o"><!--[-->`);
  for (let i = 0, $$length = each_array.length; i < $$length; i++) {
    each_array[i];
    $$payload.out.push(`<span class="month-label svelte-od1c5o">${escape_html(getMonthLabel(i))}</span>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="cells svelte-od1c5o"><!--[-->`);
  for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
    let week = each_array_1[$$index_2];
    const each_array_2 = ensure_array_like(week);
    $$payload.out.push(`<div class="week-col svelte-od1c5o"><!--[-->`);
    for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
      let day = each_array_2[$$index_1];
      $$payload.out.push(`<button${attr_class(`cell level-${stringify(getLevel(day.count))}`, "svelte-od1c5o", { "active": selectedDay?.date === day.date })}${attr("title", `${stringify(day.date)}: ${stringify(day.count)} writing${stringify(day.count !== 1 ? "s" : "")}, ${stringify(day.words)} words`)}${attr("disabled", day.isFuture, true)}></button>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  }
  $$payload.out.push(`<!--]--></div></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
function WordMilestones($$payload, $$props) {
  push();
  var $$store_subs;
  let { stats = {} } = $$props;
  const totalWords = stats.total_words || 0;
  const totalWritings = stats.total_writings || 0;
  const currentStreak = stats.current_streak || 0;
  const wordMilestones = [
    { value: 1e3, label: "1K", icon: "📝" },
    { value: 5e3, label: "5K", icon: "📝" },
    { value: 1e4, label: "10K", icon: "📖" },
    { value: 25e3, label: "25K", icon: "📖" },
    { value: 5e4, label: "50K", icon: "📚" },
    { value: 1e5, label: "100K", icon: "📚" }
  ];
  const writingMilestones = [
    { value: 1, label: "1", icon: "✍️" },
    { value: 5, label: "5", icon: "✍️" },
    { value: 10, label: "10", icon: "🖊️" },
    { value: 25, label: "25", icon: "🖊️" },
    { value: 50, label: "50", icon: "🏆" },
    { value: 100, label: "100", icon: "🏆" }
  ];
  const streakMilestones = [
    { value: 3, label: "3", icon: "🔥" },
    { value: 7, label: "7", icon: "🔥" },
    { value: 14, label: "14", icon: "🔥" },
    { value: 30, label: "30", icon: "💫" },
    { value: 60, label: "60", icon: "💫" },
    { value: 100, label: "100", icon: "⭐" }
  ];
  function getProgress(current, target) {
    return Math.min(100, current / target * 100);
  }
  function getNextMilestone(milestones, current) {
    return milestones.find((m) => current < m.value) || null;
  }
  const nextWordMilestone = getNextMilestone(wordMilestones, totalWords);
  const nextWritingMilestone = getNextMilestone(writingMilestones, totalWritings);
  const nextStreakMilestone = getNextMilestone(streakMilestones, currentStreak);
  $$payload.out.push(`<div class="milestones-popup svelte-1x91t21"><h3 class="svelte-1x91t21">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.milestones_title"))}</h3> <section class="milestone-group svelte-1x91t21"><h4 class="svelte-1x91t21">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.milestones_words"))} ${escape_html(totalWords.toLocaleString())}</h4> `);
  if (nextWordMilestone) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(wordMilestones);
    $$payload.out.push(`<div class="milestone-track svelte-1x91t21"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let m = each_array[$$index];
      $$payload.out.push(`<div${attr_class("milestone-dot svelte-1x91t21", void 0, { "achieved": totalWords >= m.value })}><span class="dot svelte-1x91t21">${escape_html(totalWords >= m.value ? m.icon : "○")}</span> <span class="label svelte-1x91t21">${escape_html(m.label)}</span></div>`);
    }
    $$payload.out.push(`<!--]--></div> <div class="progress-bar svelte-1x91t21"><div class="progress-fill svelte-1x91t21"${attr_style(`width: ${stringify(getProgress(totalWords, nextWordMilestone.value))}%`)}></div></div> <p class="next-milestone svelte-1x91t21">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.milestones_next"))}: ${escape_html(nextWordMilestone.label)} (${escape_html((nextWordMilestone.value - totalWords).toLocaleString())})</p>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="all-complete svelte-1x91t21">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.milestones_all_done"))}</p>`);
  }
  $$payload.out.push(`<!--]--></section> <section class="milestone-group svelte-1x91t21"><h4 class="svelte-1x91t21">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.milestones_writings"))} ${escape_html(totalWritings)}</h4> `);
  if (nextWritingMilestone) {
    $$payload.out.push("<!--[-->");
    const each_array_1 = ensure_array_like(writingMilestones);
    $$payload.out.push(`<div class="milestone-track svelte-1x91t21"><!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let m = each_array_1[$$index_1];
      $$payload.out.push(`<div${attr_class("milestone-dot svelte-1x91t21", void 0, { "achieved": totalWritings >= m.value })}><span class="dot svelte-1x91t21">${escape_html(totalWritings >= m.value ? m.icon : "○")}</span> <span class="label svelte-1x91t21">${escape_html(m.label)}</span></div>`);
    }
    $$payload.out.push(`<!--]--></div> <div class="progress-bar svelte-1x91t21"><div class="progress-fill svelte-1x91t21"${attr_style(`width: ${stringify(getProgress(totalWritings, nextWritingMilestone.value))}%`)}></div></div> <p class="next-milestone svelte-1x91t21">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.milestones_next"))}: ${escape_html(nextWritingMilestone.label)} (${escape_html(nextWritingMilestone.value - totalWritings)})</p>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="all-complete svelte-1x91t21">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.milestones_all_done"))}</p>`);
  }
  $$payload.out.push(`<!--]--></section> <section class="milestone-group svelte-1x91t21"><h4 class="svelte-1x91t21">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.milestones_streak"))} ${escape_html(currentStreak)}</h4> `);
  if (nextStreakMilestone) {
    $$payload.out.push("<!--[-->");
    const each_array_2 = ensure_array_like(streakMilestones);
    $$payload.out.push(`<div class="milestone-track svelte-1x91t21"><!--[-->`);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let m = each_array_2[$$index_2];
      $$payload.out.push(`<div${attr_class("milestone-dot svelte-1x91t21", void 0, { "achieved": currentStreak >= m.value })}><span class="dot svelte-1x91t21">${escape_html(currentStreak >= m.value ? m.icon : "○")}</span> <span class="label svelte-1x91t21">${escape_html(m.label)}</span></div>`);
    }
    $$payload.out.push(`<!--]--></div> <div class="progress-bar svelte-1x91t21"><div class="progress-fill svelte-1x91t21"${attr_style(`width: ${stringify(getProgress(currentStreak, nextStreakMilestone.value))}%`)}></div></div> <p class="next-milestone svelte-1x91t21">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.milestones_next"))}: ${escape_html(nextStreakMilestone.label)} (${escape_html(nextStreakMilestone.value - currentStreak)})</p>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="all-complete svelte-1x91t21">${escape_html(store_get($$store_subs ??= {}, "$t", t)("write.milestones_all_done"))}</p>`);
  }
  $$payload.out.push(`<!--]--></section></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
function BadgeTrophyCase($$payload, $$props) {
  push();
  var $$store_subs;
  let { badges = [] } = $$props;
  let filter = "all";
  const categories = [
    "all",
    "streak",
    "words",
    "agora",
    "social",
    "challenge",
    "milestone"
  ];
  const categoryLabelKeys = {
    all: "badges.all",
    streak: "badges.streaks",
    words: "badges.words",
    agora: "badges.agora",
    social: "badges.social",
    challenge: "badges.challenges",
    milestone: "badges.milestones"
  };
  const rarityOrder = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
  let sortedBadges = [...badges].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return b.unlocked - a.unlocked;
    return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
  });
  let filteredBadges = sortedBadges;
  let unlockedCount = badges.filter((b) => b.unlocked).length;
  let totalCount = badges.length;
  function translate(key) {
    return get(t)(key);
  }
  function badgeName(badge) {
    const key = "badges." + badge.id + "_name";
    return translate(key) || badge.name;
  }
  const each_array = ensure_array_like(categories);
  const each_array_1 = ensure_array_like(filteredBadges);
  $$payload.out.push(`<div class="trophy-case svelte-lcxdtd"><div class="trophy-header svelte-lcxdtd"><h3 class="svelte-lcxdtd">${escape_html(store_get($$store_subs ??= {}, "$t", t)("badges.title"))}</h3> <span class="count svelte-lcxdtd">${escape_html(store_get($$store_subs ??= {}, "$t", t)("badges.unlocked").replace("{unlocked}", unlockedCount).replace("{total}", totalCount))}</span></div> <div class="progress-bar svelte-lcxdtd"><div class="progress-fill svelte-lcxdtd"${attr_style(`width: ${stringify(totalCount > 0 ? unlockedCount / totalCount * 100 : 0)}%`)}></div></div> <div class="filters svelte-lcxdtd"><!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let cat = each_array[$$index];
    $$payload.out.push(`<button${attr_class("filter-btn svelte-lcxdtd", void 0, { "active": filter === cat })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)(categoryLabelKeys[cat]))}</button>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="badge-grid svelte-lcxdtd"><!--[-->`);
  for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
    let badge = each_array_1[$$index_1];
    $$payload.out.push(`<button${attr_class("badge-card svelte-lcxdtd", void 0, { "unlocked": badge.unlocked, "locked": !badge.unlocked })}><span class="badge-icon svelte-lcxdtd">${escape_html(badge.unlocked ? badge.icon : "🔒")}</span> <span class="badge-name svelte-lcxdtd">${escape_html(badge.unlocked ? badgeName(badge) : "???")}</span> <span${attr_class(`badge-rarity ${stringify(badge.rarity)}`, "svelte-lcxdtd")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("badges.rarity_" + badge.rarity))}</span></button>`);
  }
  $$payload.out.push(`<!--]--></div></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
function WriterOfTheWeek($$payload, $$props) {
  push();
  let { writer = null } = $$props;
  let dateStr = (() => {
    if (!writer?.week_start) return "";
    return new Date(writer.week_start.replace(" ", "T")).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  })();
  let endDateStr = (() => {
    if (!writer?.week_end) return "";
    return new Date(writer.week_end.replace(" ", "T")).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  })();
  if (writer) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="writer-of-week svelte-1r57pth"><div class="wotw-badge svelte-1r57pth">⭐ Writer of the Week</div> <div class="wotw-content svelte-1r57pth"><div class="wotw-avatar svelte-1r57pth"><span class="avatar-letter svelte-1r57pth">${escape_html(writer.username?.[0]?.toUpperCase() || "?")}</span></div> <div class="wotw-info svelte-1r57pth"><h3 class="svelte-1r57pth">${escape_html(writer.username)}</h3> <p class="wotw-reason svelte-1r57pth">${escape_html(writer.reason)}</p> <div class="wotw-stats svelte-1r57pth"><span class="stat svelte-1r57pth">${escape_html(writer.words_written?.toLocaleString())} words</span> <span class="stat svelte-1r57pth">${escape_html(writer.writings_count)} writings</span></div> <span class="wotw-dates svelte-1r57pth">${escape_html(dateStr)} — ${escape_html(endDateStr)}</span></div></div> `);
    if (writer.featured_writing_id) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<a${attr("href", `/writings/${stringify(writer.featured_writing_id)}`)} class="wotw-cta svelte-1r57pth">Read featured writing →</a>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  let isAdmin = data.user?.role === "admin";
  let activeTab = "user-profile";
  data.profiles || [];
  data.showProfile ?? 1;
  data.bootyOptIn ?? 0;
  let userDisplayName = data.profile?.display_name || "";
  let userBio = data.profile?.bio || "";
  let savingProfile = false;
  let memberSince = () => {
    const d = data.profile?.created_at;
    if (!d) return "";
    return new Date(d.replace ? d.replace(" ", "T") : d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.title"))}</title>`;
  });
  $$payload.out.push(`<div class="profile-page svelte-maq4gq"><h1 class="svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.title"))}</h1> <p class="profile-subtitle svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.subtitle"))}</p> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="tab-bar svelte-maq4gq"><button${attr_class("tab-btn svelte-maq4gq", void 0, { "active": activeTab === "user-profile" })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.user.tab"))}</button> `);
  if (isAdmin) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<button${attr_class("tab-btn svelte-maq4gq", void 0, { "active": activeTab === "profile" })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.tab_profile"))}</button> <button${attr_class("tab-btn svelte-maq4gq", void 0, { "active": activeTab === "stats" })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.tab_stats"))}</button>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<section class="user-profile-section svelte-maq4gq"><div class="user-profile-avatar-large svelte-maq4gq">${escape_html((userDisplayName || data.user?.username || "?")[0].toUpperCase())}</div> <p class="user-profile-avatar-label svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.user.avatar_label"))}</p> <div class="user-profile-form svelte-maq4gq"><div class="form-group svelte-maq4gq"><label class="svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.user.display_name"))}</label> <input${attr("value", userDisplayName)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("profile.user.display_name_placeholder"))} maxlength="50" class="svelte-maq4gq"/></div> <div class="form-group svelte-maq4gq"><label class="svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.user.bio"))}</label> <textarea${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("profile.user.bio_placeholder"))} maxlength="500" rows="4" class="svelte-maq4gq">`);
    const $$body = escape_html(userBio);
    if ($$body) {
      $$payload.out.push(`${$$body}`);
    }
    $$payload.out.push(`</textarea> <span class="bio-counter svelte-maq4gq">${escape_html(userBio.length)}/500</span></div> <div class="member-since svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.user.member_since"))} ${escape_html(memberSince)}</div> <button class="btn-save-user svelte-maq4gq"${attr("disabled", savingProfile, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.user.save"))}</button></div></section>`);
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (isAdmin && activeTab === "stats") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="stats-tab svelte-maq4gq">`);
    if (data.stats) {
      $$payload.out.push("<!--[-->");
      WritingHeatmap($$payload, { heatmapData: data.heatmapData || {} });
      $$payload.out.push(`<!----> `);
      BadgeTrophyCase($$payload, { badges: data.userBadges || [] });
      $$payload.out.push(`<!----> `);
      if (data.writerOfTheWeek) {
        $$payload.out.push("<!--[-->");
        WriterOfTheWeek($$payload, { writer: data.writerOfTheWeek });
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--> `);
      WordMilestones($$payload, { stats: data.stats });
      $$payload.out.push(`<!---->`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<p class="stats-empty svelte-maq4gq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("profile.stats_empty"))}</p>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
