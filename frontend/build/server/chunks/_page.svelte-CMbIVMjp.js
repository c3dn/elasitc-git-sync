import { ag as head, a8 as ensure_array_like, aa as attr_class, ab as stringify } from './index2-uIxG4uRE.js';
import './pocketbase-BTGVdFZ0.js';
import { P as Plus } from './plus-CLucjoZf.js';
import { C as Circle_check_big, a as Circle_x, R as Refresh_cw, P as Pencil, T as Trash_2 } from './trash-2-C2gj2xqR.js';
import { e as escape_html } from './context-DygQ0jT6.js';
import 'clsx';
import 'pocketbase';
import './index-BJm3v_Zq.js';
import './Icon-B_2sN-Er.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let repositories = [];
    head("xtvn8n", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Git Repositories - Settings</title>`);
      });
    });
    $$renderer2.push(`<div class="space-y-6">`);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">`);
      Plus($$renderer2, { class: "w-5 h-5" });
      $$renderer2.push(`<!----> Add Git Repository</button>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
      if (repositories.length === 0 && true) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center"><p class="text-gray-500 dark:text-gray-400">No Git repositories configured yet.</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="space-y-4"><!--[-->`);
        const each_array = ensure_array_like(repositories);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let repo = each_array[$$index];
          $$renderer2.push(`<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"><div class="flex items-start justify-between"><div class="flex-1"><div class="flex items-center gap-3 mb-2"><h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">${escape_html(repo.name)}</h3> `);
          if (repo.connection_status === "success") {
            $$renderer2.push("<!--[-->");
            Circle_check_big($$renderer2, { class: "w-5 h-5 text-green-600" });
          } else {
            $$renderer2.push("<!--[!-->");
            if (repo.connection_status === "failed") {
              $$renderer2.push("<!--[-->");
              Circle_x($$renderer2, { class: "w-5 h-5 text-red-600" });
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]--> <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">${escape_html(repo.provider)}</span></div> <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">${escape_html(repo.url)}</p> <p class="text-xs text-gray-500 dark:text-gray-400">Branch: ${escape_html(repo.default_branch)} `);
          if (repo.base_path) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`• Path: ${escape_html(repo.base_path)}`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--></p></div> <div class="flex items-center gap-2"><span${attr_class(`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stringify(repo.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200")}`)}>${escape_html(repo.is_active ? "Active" : "Inactive")}</span></div></div> <div class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"><button class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm">`);
          Refresh_cw($$renderer2, { class: "w-4 h-4" });
          $$renderer2.push(`<!----> Test Connection</button> <button class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm">`);
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
//# sourceMappingURL=_page.svelte-CMbIVMjp.js.map
