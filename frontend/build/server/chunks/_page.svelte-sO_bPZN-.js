import { ag as head, a8 as ensure_array_like, aa as attr_class, a9 as attr, ae as sanitize_props, af as spread_props, a7 as slot, ab as stringify } from './index2-CmtTX9D6.js';
import './exports-CA5lG8jS.js';
import './state.svelte-DjXcKafv.js';
import './pocketbase-XX6GaueF.js';
import { A as Arrow_left } from './arrow-left-BNIcWq7-.js';
import { I as Icon } from './Icon-Dr91DMYN.js';
import { e as escape_html } from './context-CXh5FE9f.js';
import 'clsx';
import 'pocketbase';
import './index-BZCjIgoZ.js';

function Arrow_right($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.469.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "M5 12h14" }],
    ["path", { "d": "m12 5 7 7-7 7" }]
  ];
  Icon($$renderer, spread_props([
    { name: "arrow-right" },
    $$sanitized_props,
    {
      /**
       * @component @name ArrowRight
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSAxMmgxNCIgLz4KICA8cGF0aCBkPSJtMTIgNSA3IDctNyA3IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/arrow-right
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
function Check($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.469.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [["path", { "d": "M20 6 9 17l-5-5" }]];
  Icon($$renderer, spread_props([
    { name: "check" },
    $$sanitized_props,
    {
      /**
       * @component @name Check
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgNiA5IDE3bC01LTUiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/check
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
    let step = 1;
    const totalSteps = 4;
    const stepNames = [
      "Project Info",
      "Connections",
      "Test Environment",
      "Prod Environment"
    ];
    let name = "";
    let description = "";
    let elasticInstanceId = "";
    let testSpace = "";
    let prodSpace = "";
    let canProceedStep1 = name.trim().length > 0;
    let canProceedStep2 = elasticInstanceId !== "";
    let canProceedStep3 = testSpace !== "";
    let canProceedStep4 = prodSpace !== "";
    function canProceed(currentStep) {
      switch (currentStep) {
        case 1:
          return canProceedStep1;
        case 2:
          return canProceedStep2;
        case 3:
          return canProceedStep3;
        case 4:
          return canProceedStep4;
        default:
          return false;
      }
    }
    head("1ytgd2c", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>New Project - Elastic Git Sync</title>`);
      });
    });
    $$renderer2.push(`<div class="max-w-3xl mx-auto space-y-6"><div><a href="/projects" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">`);
    Arrow_left($$renderer2, { class: "w-4 h-4" });
    $$renderer2.push(`<!----> Back to Projects</a> <h1 class="text-3xl font-bold text-gray-900">Create New Project</h1> <p class="mt-1 text-sm text-gray-500">Configure Test and Production environments for your detection rules</p></div> <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><div class="flex items-center justify-between mb-8"><!--[-->`);
    const each_array = ensure_array_like(Array(totalSteps));
    for (let i = 0, $$length = each_array.length; i < $$length; i++) {
      each_array[i];
      $$renderer2.push(`<div class="flex items-center flex-1"><div class="flex flex-col items-center"><div${attr_class(`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${stringify(step > i + 1 ? "bg-blue-600 border-blue-600" : step === i + 1 ? "border-blue-600 text-blue-600" : "border-gray-300 text-gray-400")}`)}>`);
      if (step > i + 1) {
        $$renderer2.push("<!--[-->");
        Check($$renderer2, { class: "w-5 h-5 text-white" });
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<span class="text-sm font-semibold">${escape_html(i + 1)}</span>`);
      }
      $$renderer2.push(`<!--]--></div> <span${attr_class(`mt-2 text-xs font-medium text-center ${stringify(step >= i + 1 ? "text-blue-600" : "text-gray-400")}`)}>${escape_html(stepNames[i])}</span></div> `);
      if (i < totalSteps - 1) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div${attr_class(`flex-1 h-1 mx-4 rounded -mt-6 ${stringify(step > i + 1 ? "bg-blue-600" : "bg-gray-200")}`)}></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="space-y-4"><h2 class="text-xl font-semibold text-gray-900">Basic Information</h2> <div><label for="name" class="block text-sm font-medium text-gray-700 mb-2">Project Name *</label> <input id="name" type="text"${attr("value", name)} placeholder="My Security Rules Project" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"/></div> <div><label for="description" class="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label> <textarea id="description" placeholder="Describe this project..." rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent">`);
      const $$body = escape_html(description);
      if ($$body) {
        $$renderer2.push(`${$$body}`);
      }
      $$renderer2.push(`</textarea></div></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex items-center justify-between mt-8 pt-6 border-t border-gray-200"><button${attr("disabled", step === 1, true)} class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">`);
    Arrow_left($$renderer2, { class: "w-4 h-4" });
    $$renderer2.push(`<!----> Previous</button> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button${attr("disabled", !canProceed(step), true)} class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next `);
      Arrow_right($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----></button>`);
    }
    $$renderer2.push(`<!--]--></div></div></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-sO_bPZN-.js.map
