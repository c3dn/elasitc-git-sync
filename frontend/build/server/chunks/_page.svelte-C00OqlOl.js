import { ag as head, a6 as store_get, a9 as attr, ac as unsubscribe_stores, ae as sanitize_props, af as spread_props, a7 as slot } from './index2-uIxG4uRE.js';
import './exports-CA5lG8jS.js';
import './state.svelte-CP7M2K3p.js';
import { p as page } from './stores-DqNP26Rp.js';
import { K as Key_round } from './key-round-DVm24foy.js';
import { I as Icon } from './Icon-B_2sN-Er.js';
import { e as escape_html } from './context-DygQ0jT6.js';
import 'clsx';

function Triangle_alert($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.469.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    [
      "path",
      {
        "d": "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
      }
    ],
    ["path", { "d": "M12 9v4" }],
    ["path", { "d": "M12 17h.01" }]
  ];
  Icon($$renderer, spread_props([
    { name: "triangle-alert" },
    $$sanitized_props,
    {
      /**
       * @component @name TriangleAlert
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMjEuNzMgMTgtOC0xNGEyIDIgMCAwIDAtMy40OCAwbC04IDE0QTIgMiAwIDAgMCA0IDIxaDE2YTIgMiAwIDAgMCAxLjczLTMiIC8+CiAgPHBhdGggZD0iTTEyIDl2NCIgLz4KICA8cGF0aCBkPSJNMTIgMTdoLjAxIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/triangle-alert
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
    let { form } = $$props;
    let loading = false;
    head("1vlivtq", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Account - Settings - Elastic Git Sync</title>`);
      });
    });
    $$renderer2.push(`<div class="max-w-xl"><div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6"><h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Account Information</h2> <div class="text-sm text-gray-600 dark:text-gray-400"><span class="font-medium text-gray-700 dark:text-gray-300">E-Mail:</span> ${escape_html(store_get($$store_subs ??= {}, "$page", page).data.user?.email || "—")}</div></div> <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6"><div class="flex items-center gap-3 mb-6"><div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">`);
    Key_round($$renderer2, { class: "w-5 h-5 text-primary-600" });
    $$renderer2.push(`<!----></div> <div><h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Change Password</h2> <p class="text-sm text-gray-500 dark:text-gray-400">Update your account password</p></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (form?.error) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">`);
      Triangle_alert($$renderer2, { class: "w-5 h-5 text-red-600 flex-shrink-0" });
      $$renderer2.push(`<!----> <span class="text-sm text-red-700">${escape_html(form.error)}</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <form method="POST" action="?/changePassword" class="space-y-4"><div><label for="oldPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label> <input id="oldPassword" name="oldPassword" type="password" required autocomplete="current-password" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"/></div> <div><label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label> <input id="newPassword" name="newPassword" type="password" required minlength="8" autocomplete="new-password" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"/> <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">Minimum 8 characters</p></div> <div><label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label> <input id="confirmPassword" name="confirmPassword" type="password" required minlength="8" autocomplete="new-password" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"/></div> <div class="pt-2"><button type="submit"${attr("disabled", loading, true)} class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50">`);
    {
      $$renderer2.push("<!--[!-->");
      Key_round($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----> Change Password`);
    }
    $$renderer2.push(`<!--]--></button></div></form></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-C00OqlOl.js.map
