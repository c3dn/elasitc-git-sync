import { r as redirect } from './index-B2LGyy1l.js';

const load = async ({ locals, url }) => {
  if (url.pathname === "/login") {
    return {
      user: null
    };
  }
  if (!locals.user) {
    throw redirect(303, "/login");
  }
  return {
    user: locals.user
  };
};

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-CoVv-iuv.js')).default;
const server_id = "src/routes/+layout.server.ts";
const imports = ["_app/immutable/nodes/0.wSSZbYc3.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/COK2pY8o.js","_app/immutable/chunks/BbuzmxRY.js","_app/immutable/chunks/BnHnlVXU.js","_app/immutable/chunks/XgF_cVEg.js","_app/immutable/chunks/cVoOpi3M.js","_app/immutable/chunks/Bm_MFDQ1.js","_app/immutable/chunks/CnEfqjts.js","_app/immutable/chunks/C4oicLII.js","_app/immutable/chunks/Cak3-npf.js","_app/immutable/chunks/B52AFOGJ.js","_app/immutable/chunks/CiF83QCe.js"];
const stylesheets = ["_app/immutable/assets/0.DLlc7HL5.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=0-CXdnB0AI.js.map
