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
const component = async () => component_cache ??= (await import('./_layout.svelte-zJMux3m2.js')).default;
const server_id = "src/routes/+layout.server.ts";
const imports = ["_app/immutable/nodes/0.BvK2UZGk.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVSZYhH1.js","_app/immutable/chunks/Dwc5JcvW.js","_app/immutable/chunks/BCkVnCXK.js","_app/immutable/chunks/BGM91MK6.js","_app/immutable/chunks/uIwwuFdP.js","_app/immutable/chunks/De-PL9gO.js","_app/immutable/chunks/7ALa_3WU.js","_app/immutable/chunks/CV6U0ayt.js","_app/immutable/chunks/DrRDPxfg.js","_app/immutable/chunks/BuOzBW1Z.js","_app/immutable/chunks/DpGrMqwg.js","_app/immutable/chunks/B-Qd3df5.js"];
const stylesheets = ["_app/immutable/assets/0.Bl76p0-8.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=0-BgVmdXsi.js.map
