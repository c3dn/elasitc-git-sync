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
const imports = ["_app/immutable/nodes/0.BqXmPMme.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/Dl2LfGm4.js","_app/immutable/chunks/C9NYA0Nw.js","_app/immutable/chunks/O7RWNxBF.js","_app/immutable/chunks/D2ldot_M.js","_app/immutable/chunks/Cs0PMOxO.js","_app/immutable/chunks/rMS1oNTx.js","_app/immutable/chunks/CqRNeN1-.js","_app/immutable/chunks/2Ejqapzg.js","_app/immutable/chunks/--SkU8XW.js","_app/immutable/chunks/BUCyip3L.js","_app/immutable/chunks/BMJP2EhQ.js","_app/immutable/chunks/CWlArps7.js","_app/immutable/chunks/CXXYYhpC.js","_app/immutable/chunks/DXfXwPrm.js","_app/immutable/chunks/DJoU24lj.js","_app/immutable/chunks/DVBk0H5N.js","_app/immutable/chunks/BlCS-srp.js","_app/immutable/chunks/5hk0u3Zq.js","_app/immutable/chunks/Cot_wfMu.js","_app/immutable/chunks/Ckivt0rV.js"];
const stylesheets = ["_app/immutable/assets/0.CtDbtRqm.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=0-CdTWowm1.js.map
