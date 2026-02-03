import { ag as head, a9 as attr, ae as sanitize_props, af as spread_props, a7 as slot } from './index2-uIxG4uRE.js';
import './pocketbase-BTGVdFZ0.js';
import { I as Icon } from './Icon-B_2sN-Er.js';
import { e as escape_html } from './context-DygQ0jT6.js';
import 'clsx';
import 'pocketbase';
import './index-BJm3v_Zq.js';

function Filter($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.469.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    [
      "polygon",
      { "points": "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "filter" },
    $$sanitized_props,
    {
      /**
       * @component @name Filter
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cG9seWdvbiBwb2ludHM9IjIyIDMgMiAzIDEwIDEyLjQ2IDEwIDE5IDE0IDIxIDE0IDEyLjQ2IDIyIDMiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/filter
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let total = 0;
    let actionFilter = "";
    let userFilter = "";
    head("1qyu7y8", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Audit Log - Elastic Git Sync</title>`);
      });
    });
    $$renderer2.push(`<div class="space-y-6"><div class="animate-fade-in"><h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Audit Log</h1> <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Track who did what and when across your projects</p></div> <div class="card p-4 animate-fade-in" style="animation-delay: 50ms; opacity: 0;"><div class="flex items-center gap-4 flex-wrap"><div class="flex items-center gap-2">`);
    Filter($$renderer2, { class: "w-4 h-4 text-gray-400" });
    $$renderer2.push(`<!----> <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span></div> `);
    $$renderer2.select(
      {
        value: actionFilter,
        class: "px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "" }, ($$renderer4) => {
          $$renderer4.push(`All Actions`);
        });
        $$renderer3.option({ value: "sync_triggered" }, ($$renderer4) => {
          $$renderer4.push(`Sync Triggered`);
        });
        $$renderer3.option({ value: "rule_approved" }, ($$renderer4) => {
          $$renderer4.push(`Rule Approved`);
        });
        $$renderer3.option({ value: "rule_rejected" }, ($$renderer4) => {
          $$renderer4.push(`Rule Rejected`);
        });
        $$renderer3.option({ value: "bulk_approved" }, ($$renderer4) => {
          $$renderer4.push(`Bulk Approved`);
        });
        $$renderer3.option({ value: "bulk_rejected" }, ($$renderer4) => {
          $$renderer4.push(`Bulk Rejected`);
        });
        $$renderer3.option({ value: "mr_created" }, ($$renderer4) => {
          $$renderer4.push(`MR Created`);
        });
        $$renderer3.option({ value: "baseline_initialized" }, ($$renderer4) => {
          $$renderer4.push(`Baseline Init`);
        });
        $$renderer3.option({ value: "change_detected" }, ($$renderer4) => {
          $$renderer4.push(`Change Detected`);
        });
      }
    );
    $$renderer2.push(` <input type="text"${attr("value", userFilter)} placeholder="Filter by user..." class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-48"/> <button class="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Apply</button> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="ml-auto text-xs text-gray-500 dark:text-gray-400">${escape_html(total)} ${escape_html("entries")}</div></div></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CL0uhnM4.js.map
