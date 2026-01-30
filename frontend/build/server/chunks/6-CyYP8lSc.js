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
const component = async () => component_cache ??= (await import('./_page.svelte-Bc9acPU7.js')).default;
const server_id = "src/routes/login/+page.server.ts";
const imports = ["_app/immutable/nodes/6.vUCfVtVy.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/COK2pY8o.js","_app/immutable/chunks/BbuzmxRY.js","_app/immutable/chunks/BnHnlVXU.js","_app/immutable/chunks/XgF_cVEg.js","_app/immutable/chunks/cVoOpi3M.js","_app/immutable/chunks/BwaF3Q6U.js","_app/immutable/chunks/FH1wYdD7.js","_app/immutable/chunks/Cak3-npf.js","_app/immutable/chunks/Bm_MFDQ1.js","_app/immutable/chunks/DmU9yv2g.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-CyYP8lSc.js.map
