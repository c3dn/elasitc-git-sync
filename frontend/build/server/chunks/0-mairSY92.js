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
const component = async () => component_cache ??= (await import('./_layout.svelte-BpFqT1Vh.js')).default;
const server_id = "src/routes/+layout.server.ts";
const imports = ["_app/immutable/nodes/0.BXbuhNMD.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/Dl2LfGm4.js","_app/immutable/chunks/C9NYA0Nw.js","_app/immutable/chunks/O7RWNxBF.js","_app/immutable/chunks/D2ldot_M.js","_app/immutable/chunks/Cs0PMOxO.js","_app/immutable/chunks/z_jCEgha.js","_app/immutable/chunks/CqRNeN1-.js","_app/immutable/chunks/COnXchxR.js","_app/immutable/chunks/CCHst_1G.js","_app/immutable/chunks/BUCyip3L.js","_app/immutable/chunks/CKXfGMm1.js","_app/immutable/chunks/CWlArps7.js","_app/immutable/chunks/CXXYYhpC.js","_app/immutable/chunks/c4E_ZoYs.js","_app/immutable/chunks/D3EV4tGk.js","_app/immutable/chunks/DYGQewJa.js","_app/immutable/chunks/CpK8W6VH.js","_app/immutable/chunks/By_2fN8G.js","_app/immutable/chunks/DNWbSeQY.js","_app/immutable/chunks/DWdZ-gWd.js"];
const stylesheets = ["_app/immutable/assets/0.CtDbtRqm.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=0-mairSY92.js.map
