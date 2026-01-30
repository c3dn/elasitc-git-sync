import { a8 as ensure_array_like, a9 as attr, aa as attr_class, ab as stringify, a6 as store_get, a7 as slot, ac as unsubscribe_stores, ae as sanitize_props, af as spread_props } from './index2-DXgNDLRr.js';
import { p as page } from './stores-BortbJPb.js';
import { I as Icon } from './Icon-BPQyULtO.js';
import { F as Folder_git_2 } from './folder-git-2-C3k16tBE.js';
import { e as escape_html } from './context-lGCB6Tgm.js';
import 'clsx';
import './exports-CA5lG8jS.js';
import './state.svelte-S-o2qkm0.js';

function Server($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.469.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    [
      "rect",
      {
        "width": "20",
        "height": "8",
        "x": "2",
        "y": "2",
        "rx": "2",
        "ry": "2"
      }
    ],
    [
      "rect",
      {
        "width": "20",
        "height": "8",
        "x": "2",
        "y": "14",
        "rx": "2",
        "ry": "2"
      }
    ],
    ["line", { "x1": "6", "x2": "6.01", "y1": "6", "y2": "6" }],
    ["line", { "x1": "6", "x2": "6.01", "y1": "18", "y2": "18" }]
  ];
  Icon($$renderer, spread_props([
    { name: "server" },
    $$sanitized_props,
    {
      /**
       * @component @name Server
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iOCIgeD0iMiIgeT0iMiIgcng9IjIiIHJ5PSIyIiAvPgogIDxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSI4IiB4PSIyIiB5PSIxNCIgcng9IjIiIHJ5PSIyIiAvPgogIDxsaW5lIHgxPSI2IiB4Mj0iNi4wMSIgeTE9IjYiIHkyPSI2IiAvPgogIDxsaW5lIHgxPSI2IiB4Mj0iNi4wMSIgeTE9IjE4IiB5Mj0iMTgiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/server
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
function User_cog($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.469.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["circle", { "cx": "18", "cy": "15", "r": "3" }],
    ["circle", { "cx": "9", "cy": "7", "r": "4" }],
    ["path", { "d": "M10 15H6a4 4 0 0 0-4 4v2" }],
    ["path", { "d": "m21.7 16.4-.9-.3" }],
    ["path", { "d": "m15.2 13.9-.9-.3" }],
    ["path", { "d": "m16.6 18.7.3-.9" }],
    ["path", { "d": "m19.1 12.2.3-.9" }],
    ["path", { "d": "m19.6 18.7-.4-1" }],
    ["path", { "d": "m16.8 12.3-.4-1" }],
    ["path", { "d": "m14.3 16.6 1-.4" }],
    ["path", { "d": "m20.7 13.8 1-.4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "user-cog" },
    $$sanitized_props,
    {
      /**
       * @component @name UserCog
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxOCIgY3k9IjE1IiByPSIzIiAvPgogIDxjaXJjbGUgY3g9IjkiIGN5PSI3IiByPSI0IiAvPgogIDxwYXRoIGQ9Ik0xMCAxNUg2YTQgNCAwIDAgMC00IDR2MiIgLz4KICA8cGF0aCBkPSJtMjEuNyAxNi40LS45LS4zIiAvPgogIDxwYXRoIGQ9Im0xNS4yIDEzLjktLjktLjMiIC8+CiAgPHBhdGggZD0ibTE2LjYgMTguNy4zLS45IiAvPgogIDxwYXRoIGQ9Im0xOS4xIDEyLjIuMy0uOSIgLz4KICA8cGF0aCBkPSJtMTkuNiAxOC43LS40LTEiIC8+CiAgPHBhdGggZD0ibTE2LjggMTIuMy0uNC0xIiAvPgogIDxwYXRoIGQ9Im0xNC4zIDE2LjYgMS0uNCIgLz4KICA8cGF0aCBkPSJtMjAuNyAxMy44IDEtLjQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/user-cog
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
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const tabs = [
      {
        name: "Elastic Instances",
        href: "/settings/elastic",
        icon: Server
      },
      {
        name: "Git Repositories",
        href: "/settings/git",
        icon: Folder_git_2
      },
      { name: "Account", href: "/settings/account", icon: User_cog }
    ];
    $$renderer2.push(`<div class="space-y-6"><div><h1 class="text-3xl font-bold text-gray-900">Settings</h1> <p class="mt-1 text-sm text-gray-500">Configure Elastic instances, Git repositories, and your account</p></div> <div class="border-b border-gray-200"><nav class="flex gap-8"><!--[-->`);
    const each_array = ensure_array_like(tabs);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let tab = each_array[$$index];
      $$renderer2.push(`<a${attr("href", tab.href)}${attr_class(`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname === tab.href ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")}`)}><!---->`);
      tab.icon?.($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----> ${escape_html(tab.name)}</a>`);
    }
    $$renderer2.push(`<!--]--></nav></div> <!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-BVNxsrdD.js.map
