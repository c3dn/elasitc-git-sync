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
const component = async () => component_cache ??= (await import('./_layout.svelte-Ci0OmuoT.js')).default;
const server_id = "src/routes/+layout.server.ts";
const imports = ["_app/immutable/nodes/0.CMx246lZ.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/DBRSZtkI.js","_app/immutable/chunks/CbRa-Z4u.js","_app/immutable/chunks/CdzGu8ER.js","_app/immutable/chunks/CoDRCLiZ.js","_app/immutable/chunks/BjUZiTXz.js","_app/immutable/chunks/DZIrD1K_.js","_app/immutable/chunks/MJCC_PoB.js","_app/immutable/chunks/HGTMDPNe.js","_app/immutable/chunks/CilZWO1z.js","_app/immutable/chunks/CP95Nm2x.js","_app/immutable/chunks/DSPhBg84.js"];
const stylesheets = ["_app/immutable/assets/0.C165U_HG.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=0-BqlbtDTP.js.map
