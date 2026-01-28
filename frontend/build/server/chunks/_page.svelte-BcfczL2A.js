import { a6 as store_get, ag as head, a9 as attr, ab as stringify, ac as unsubscribe_stores } from './index2-CmtTX9D6.js';
import { p as page } from './stores-PgECZvZE.js';
import './exports-CA5lG8jS.js';
import './state.svelte-DjXcKafv.js';
import './pocketbase-XX6GaueF.js';
import { A as Arrow_left } from './arrow-left-BNIcWq7-.js';
import { e as escape_html } from './context-CXh5FE9f.js';
import 'clsx';
import 'pocketbase';
import './index-BZCjIgoZ.js';
import './Icon-Dr91DMYN.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let projectId = store_get($$store_subs ??= {}, "$page", page).params.id;
    head("1h9ouny", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Edit ${escape_html("Project")} - Elastic Git Sync</title>`);
      });
    });
    $$renderer2.push(`<div class="max-w-3xl mx-auto space-y-6"><div><a${attr("href", `/projects/${stringify(projectId)}`)} class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">`);
    Arrow_left($$renderer2, { class: "w-4 h-4" });
    $$renderer2.push(`<!----> Back to Project</a> <h1 class="text-3xl font-bold text-gray-900">Edit Project</h1> <p class="mt-1 text-sm text-gray-500">Update project settings and environment configuration</p></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BcfczL2A.js.map
