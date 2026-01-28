import { ag as head, a8 as ensure_array_like, aa as attr_class, ab as stringify } from './index2-CmtTX9D6.js';
import './pocketbase-XX6GaueF.js';
import { P as Plus } from './plus-PY0yxc3Z.js';
import { C as Circle_check_big, a as Circle_x, R as Refresh_cw, P as Pencil, T as Trash_2 } from './trash-2-Bp9JOPvz.js';
import { e as escape_html } from './context-CXh5FE9f.js';
import 'clsx';
import 'pocketbase';
import './index-BZCjIgoZ.js';
import './Icon-Dr91DMYN.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let instances = [];
    head("21ec2", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Elastic Instances - Settings</title>`);
      });
    });
    $$renderer2.push(`<div class="space-y-6">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">`);
      Plus($$renderer2, { class: "w-5 h-5" });
      $$renderer2.push(`<!----> Add Elastic Instance</button>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
      if (instances.length === 0 && true) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center"><p class="text-gray-500">No Elastic instances configured yet.</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="space-y-4"><!--[-->`);
        const each_array = ensure_array_like(instances);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let instance = each_array[$$index];
          $$renderer2.push(`<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><div class="flex items-start justify-between"><div class="flex-1"><div class="flex items-center gap-3 mb-2"><h3 class="text-lg font-semibold text-gray-900">${escape_html(instance.name)}</h3> `);
          if (instance.connection_status === "success") {
            $$renderer2.push("<!--[-->");
            Circle_check_big($$renderer2, { class: "w-5 h-5 text-green-600" });
          } else {
            $$renderer2.push("<!--[!-->");
            if (instance.connection_status === "failed") {
              $$renderer2.push("<!--[-->");
              Circle_x($$renderer2, { class: "w-5 h-5 text-red-600" });
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]--></div> <p class="text-sm text-gray-600 mb-2">${escape_html(instance.url)}</p> `);
          if (instance.spaces && instance.spaces.length > 0) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<p class="text-xs text-gray-500">Spaces: ${escape_html(instance.spaces.join(", "))}</p>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--></div> <div class="flex items-center gap-2"><span${attr_class(`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stringify(instance.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800")}`)}>${escape_html(instance.is_active ? "Active" : "Inactive")}</span></div></div> <div class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200"><button class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">`);
          Refresh_cw($$renderer2, { class: "w-4 h-4" });
          $$renderer2.push(`<!----> Test Connection</button> <button class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">`);
          Pencil($$renderer2, { class: "w-4 h-4" });
          $$renderer2.push(`<!----> Edit</button> <button class="ml-auto inline-flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm">`);
          Trash_2($$renderer2, { class: "w-4 h-4" });
          $$renderer2.push(`<!----> Delete</button></div></div>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-C6XdO8J2.js.map
