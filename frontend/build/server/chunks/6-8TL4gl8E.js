import { f as fail, r as redirect } from './index-B2LGyy1l.js';

const load = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, "/");
  }
  return {};
};
const actions = {
  default: async ({ locals, request }) => {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    if (!email || !password) {
      return fail(400, { error: "Email and password are required" });
    }
    try {
      await locals.pb.collection("users").authWithPassword(email, password);
    } catch (err) {
      console.error("Login error:", err);
      return fail(400, { error: "Invalid email or password" });
    }
    throw redirect(303, "/");
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 6;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-CDp7qRp4.js')).default;
const server_id = "src/routes/login/+page.server.ts";
const imports = ["_app/immutable/nodes/6.eZtErkvg.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/DBRSZtkI.js","_app/immutable/chunks/CbRa-Z4u.js","_app/immutable/chunks/CdzGu8ER.js","_app/immutable/chunks/CoDRCLiZ.js","_app/immutable/chunks/BjUZiTXz.js","_app/immutable/chunks/Bj3l4WMm.js","_app/immutable/chunks/CilZWO1z.js","_app/immutable/chunks/DZIrD1K_.js","_app/immutable/chunks/BF-NTyZp.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-8TL4gl8E.js.map
