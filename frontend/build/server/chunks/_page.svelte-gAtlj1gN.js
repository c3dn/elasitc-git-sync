import { a6 as store_get, ag as head, a9 as attr, ac as unsubscribe_stores, ae as sanitize_props, af as spread_props, a7 as slot } from './index2-uIxG4uRE.js';
import { p as page } from './stores-DqNP26Rp.js';
import './pocketbase-BTGVdFZ0.js';
import { I as Icon } from './Icon-B_2sN-Er.js';
import './context-DygQ0jT6.js';
import 'clsx';
import './exports-CA5lG8jS.js';
import './state.svelte-CP7M2K3p.js';
import 'pocketbase';
import './index-BJm3v_Zq.js';

function Search($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.469.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["circle", { "cx": "11", "cy": "11", "r": "8" }],
    ["path", { "d": "m21 21-4.3-4.3" }]
  ];
  Icon($$renderer, spread_props([
    { name: "search" },
    $$sanitized_props,
    {
      /**
       * @component @name Search
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMSIgY3k9IjExIiByPSI4IiAvPgogIDxwYXRoIGQ9Im0yMSAyMS00LjMtNC4zIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/search
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
    var $$store_subs;
    let filteredChanges;
    let changes = [];
    let filterStatus = "pending";
    let searchQuery = "";
    function groupByBatch(items) {
      const groups = {};
      for (const item of items) {
        const batch = item.detection_batch || "unknown";
        if (!groups[batch]) groups[batch] = [];
        groups[batch].push(item);
      }
      return groups;
    }
    store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("batch") || "";
    filteredChanges = changes.filter((c) => {
      return true;
    });
    groupByBatch(filteredChanges);
    head("1mr7uv1", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Review Changes - Elastic Git Sync</title>`);
      });
    });
    $$renderer2.push(`<div class="space-y-6"><div class="flex items-center justify-between animate-fade-in"><div><h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Review Changes</h1> <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Review detected rule changes before they are synced to Git</p></div> <div class="flex items-center gap-3">`);
    $$renderer2.select(
      {
        value: filterStatus,
        class: "px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "pending" }, ($$renderer4) => {
          $$renderer4.push(`Pending`);
        });
        $$renderer3.option({ value: "approved" }, ($$renderer4) => {
          $$renderer4.push(`Approved`);
        });
        $$renderer3.option({ value: "rejected" }, ($$renderer4) => {
          $$renderer4.push(`Rejected`);
        });
      }
    );
    $$renderer2.push(`</div></div> <div class="relative">`);
    Search($$renderer2, {
      class: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
    });
    $$renderer2.push(`<!----> <input type="text"${attr("value", searchQuery)} placeholder="Search by rule name or ID..." class="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-gAtlj1gN.js.map
