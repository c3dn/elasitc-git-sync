import { a6 as store_get, ag as head, ac as unsubscribe_stores } from './index2-DXgNDLRr.js';
import { p as page } from './stores-BortbJPb.js';
import './exports-CA5lG8jS.js';
import { e as escape_html } from './context-lGCB6Tgm.js';
import 'clsx';
import './state.svelte-S-o2qkm0.js';
import './pocketbase-BRYPPp6T.js';
import { A as Arrow_left } from './arrow-left-De6qTuwr.js';
import 'pocketbase';
import './index-BGd6R47q.js';
import './Icon-BPQyULtO.js';

function RuleSelectionModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let rules = [];
    let selected = /* @__PURE__ */ new Set();
    let severityFilter = "all";
    let filteredRules = rules.filter((r) => {
      const matchesSeverity = severityFilter === "all";
      return matchesSeverity;
    });
    selected.size;
    filteredRules.length > 0 && filteredRules.every((r) => selected.has(r.rule_id));
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let environments = [];
    store_get($$store_subs ??= {}, "$page", page).params.id;
    let testEnv = environments.find((e) => e.name === "test");
    environments.find((e) => e.name === "production");
    head("ffmenf", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html("Project")} - Elastic Git Sync</title>`);
      });
    });
    $$renderer2.push(`<div class="space-y-6"><div class="flex items-center justify-between animate-fade-in"><div><a href="/projects" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2 transition-colors duration-200">`);
    Arrow_left($$renderer2, {
      class: "w-4 h-4 transition-transform duration-200 hover:-translate-x-1"
    });
    $$renderer2.push(`<!----> Back to Projects</a> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<h1 class="text-3xl font-bold text-gray-900">Loading...</h1>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
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
    $$renderer2.push(`<!--]--></div> `);
    if (testEnv) {
      $$renderer2.push("<!--[-->");
      RuleSelectionModal($$renderer2, {
        space: testEnv.elastic_space,
        branch: testEnv.git_branch
      });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DmGQ1JwS.js.map
