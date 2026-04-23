import { h as head, e as escape_html, c as ensure_array_like, b as attr, f as stringify, i as attr_style } from "../../../../chunks/renderer.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let analytics = {
      overview: {},
      byType: [],
      countries: [],
      devices: [],
      daily: [],
      topWritings: []
    };
    let days = 30;
    let loading = true;
    let error = null;
    async function loadAnalytics() {
      loading = true;
      error = null;
      try {
        const res = await fetch(`/api/analytics?days=${days}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        analytics = {
          overview: data.overview || {},
          byType: data.byType || [],
          countries: data.countries || [],
          devices: data.devices || [],
          daily: data.daily || [],
          topWritings: data.topWritings || []
        };
      } catch (e) {
        error = e.message;
      } finally {
        loading = false;
      }
    }
    function handleDaysChange(e) {
      days = parseInt(e.target.value);
      loadAnalytics();
    }
    function getCountryFlag(code) {
      if (code === "unknown") return "🌍";
      return String.fromCodePoint(...code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0)));
    }
    function friendlyEvent(type) {
      const labels = {
        page_view: "Page View",
        view_writing: "View Writing",
        accept_prompt: "Accept Prompt",
        pass_prompt: "Pass Prompt"
      };
      return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    function fmtNum(n) {
      return n != null ? n.toLocaleString() : "0";
    }
    function getMaxVisitors() {
      if (!analytics.daily || analytics.daily.length === 0) return 1;
      const max = Math.max(...analytics.daily.map((d) => d.visitors || 0));
      return max > 0 ? max : 1;
    }
    head("h1vjnr", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Analytics — patrouch.ca</title>`);
      });
    });
    $$renderer2.push(`<div class="analytics-dashboard svelte-h1vjnr"><header class="svelte-h1vjnr"><h1 class="svelte-h1vjnr">Analytics</h1> <div class="controls svelte-h1vjnr"><label for="days" class="svelte-h1vjnr">Period:</label> `);
    $$renderer2.select(
      {
        id: "days",
        value: days,
        onchange: handleDaysChange,
        class: ""
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "7" }, ($$renderer4) => {
          $$renderer4.push(`Last 7 days`);
        });
        $$renderer3.option({ value: "30" }, ($$renderer4) => {
          $$renderer4.push(`Last 30 days`);
        });
        $$renderer3.option({ value: "90" }, ($$renderer4) => {
          $$renderer4.push(`Last 90 days`);
        });
        $$renderer3.option({ value: "365" }, ($$renderer4) => {
          $$renderer4.push(`Last year`);
        });
      },
      "svelte-h1vjnr"
    );
    $$renderer2.push(`</div></header> `);
    if (error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="error svelte-h1vjnr">${escape_html(error)}</div>`);
    } else if (loading) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="loading svelte-h1vjnr">Loading analytics...</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<section class="stats-overview svelte-h1vjnr"><div class="stat-card svelte-h1vjnr"><h3 class="svelte-h1vjnr">Total Events</h3> <p class="big-number svelte-h1vjnr">${escape_html(fmtNum(analytics.overview?.total_events))}</p></div> <div class="stat-card svelte-h1vjnr"><h3 class="svelte-h1vjnr">Unique Visitors</h3> <p class="big-number svelte-h1vjnr">${escape_html(fmtNum(analytics.overview?.unique_visitors))}</p></div> <div class="stat-card svelte-h1vjnr"><h3 class="svelte-h1vjnr">Active Days</h3> <p class="big-number svelte-h1vjnr">${escape_html(fmtNum(analytics.overview?.active_days))}</p></div> <div class="stat-card svelte-h1vjnr"><h3 class="svelte-h1vjnr">Countries</h3> <p class="big-number svelte-h1vjnr">${escape_html(fmtNum(analytics.countries?.length))}</p></div></section> <section class="data-section svelte-h1vjnr"><h2 class="svelte-h1vjnr">Events by Type</h2> `);
      if (analytics.byType?.length > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<table class="svelte-h1vjnr"><thead><tr><th class="svelte-h1vjnr">Event</th><th class="svelte-h1vjnr">Count</th><th class="svelte-h1vjnr">Unique Visitors</th></tr></thead><tbody><!--[-->`);
        const each_array = ensure_array_like(analytics.byType);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let row = each_array[$$index];
          $$renderer2.push(`<tr><td class="svelte-h1vjnr">${escape_html(friendlyEvent(row.event_type))}</td><td class="svelte-h1vjnr">${escape_html(fmtNum(row.count))}</td><td class="svelte-h1vjnr">${escape_html(fmtNum(row.unique_visitors))}</td></tr>`);
        }
        $$renderer2.push(`<!--]--></tbody></table>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<p class="empty svelte-h1vjnr">No event data yet</p>`);
      }
      $$renderer2.push(`<!--]--></section> <div class="two-col svelte-h1vjnr"><section class="data-section svelte-h1vjnr"><h2 class="svelte-h1vjnr">Countries</h2> `);
      if (analytics.countries?.length > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<ul class="country-list svelte-h1vjnr"><!--[-->`);
        const each_array_1 = ensure_array_like(analytics.countries);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let row = each_array_1[$$index_1];
          $$renderer2.push(`<li class="svelte-h1vjnr"><span class="flag svelte-h1vjnr">${escape_html(getCountryFlag(row.country))}</span> <span class="name svelte-h1vjnr">${escape_html(row.country)}</span> <span class="count svelte-h1vjnr">${escape_html(fmtNum(row.visitors))}</span></li>`);
        }
        $$renderer2.push(`<!--]--></ul>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<p class="empty svelte-h1vjnr">No geographic data yet</p>`);
      }
      $$renderer2.push(`<!--]--></section> <section class="data-section svelte-h1vjnr"><h2 class="svelte-h1vjnr">Devices</h2> `);
      if (analytics.devices?.length > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<ul class="device-list svelte-h1vjnr"><!--[-->`);
        const each_array_2 = ensure_array_like(analytics.devices);
        for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
          let row = each_array_2[$$index_2];
          $$renderer2.push(`<li class="svelte-h1vjnr"><span class="device-icon svelte-h1vjnr">${escape_html(row.device === "mobile" ? "📱" : row.device === "tablet" ? "📱" : "🖥️")}</span> <span class="name svelte-h1vjnr">${escape_html(row.device)}</span> <span class="count svelte-h1vjnr">${escape_html(fmtNum(row.count))}</span></li>`);
        }
        $$renderer2.push(`<!--]--></ul>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<p class="empty svelte-h1vjnr">No device data yet</p>`);
      }
      $$renderer2.push(`<!--]--></section></div> <section class="data-section svelte-h1vjnr"><h2 class="svelte-h1vjnr">Daily Trend</h2> `);
      if (analytics.daily?.length > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="trend-chart svelte-h1vjnr"><!--[-->`);
        const each_array_3 = ensure_array_like(analytics.daily);
        for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
          let row = each_array_3[$$index_3];
          $$renderer2.push(`<div class="trend-bar-container svelte-h1vjnr"${attr("title", `${stringify(row.date)}: ${stringify(fmtNum(row.visitors))} visitors, ${stringify(fmtNum(row.events))} events`)}><div class="trend-bar svelte-h1vjnr"${attr_style(`height: ${stringify(Math.max(4, (row.visitors || 0) / getMaxVisitors() * 100))}%`)}></div> <span class="trend-label svelte-h1vjnr">${escape_html(row.date.slice(5))}</span></div>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<p class="empty svelte-h1vjnr">No daily data yet</p>`);
      }
      $$renderer2.push(`<!--]--></section> <section class="data-section svelte-h1vjnr"><h2 class="svelte-h1vjnr">Top Viewed Writings</h2> `);
      if (analytics.topWritings?.length > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<table class="svelte-h1vjnr"><thead><tr><th class="svelte-h1vjnr">Title</th><th class="svelte-h1vjnr">Views</th><th class="svelte-h1vjnr">Unique Visitors</th></tr></thead><tbody><!--[-->`);
        const each_array_4 = ensure_array_like(analytics.topWritings);
        for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
          let row = each_array_4[$$index_4];
          $$renderer2.push(`<tr><td class="svelte-h1vjnr"><a${attr("href", `/writings/${stringify(row.entity_id)}`)} class="svelte-h1vjnr">${escape_html(row.title || row.entity_id)}</a></td><td class="svelte-h1vjnr">${escape_html(fmtNum(row.views))}</td><td class="svelte-h1vjnr">${escape_html(fmtNum(row.unique_visitors))}</td></tr>`);
        }
        $$renderer2.push(`<!--]--></tbody></table>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<p class="empty svelte-h1vjnr">No writing view data yet</p>`);
      }
      $$renderer2.push(`<!--]--></section>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
