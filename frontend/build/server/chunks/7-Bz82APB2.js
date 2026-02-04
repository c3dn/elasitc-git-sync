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

const index = 7;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-B72nmLQw.js')).default;
const server_id = "src/routes/login/+page.server.ts";
const imports = ["_app/immutable/nodes/7.C7ee1YV0.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/Dl2LfGm4.js","_app/immutable/chunks/C9NYA0Nw.js","_app/immutable/chunks/O7RWNxBF.js","_app/immutable/chunks/D2ldot_M.js","_app/immutable/chunks/Cs0PMOxO.js","_app/immutable/chunks/k5AYXn5z.js","_app/immutable/chunks/Ckju6ck1.js","_app/immutable/chunks/B3he7Zqs.js","_app/immutable/chunks/z_jCEgha.js","_app/immutable/chunks/DpP0kgc1.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=7-Bz82APB2.js.map
