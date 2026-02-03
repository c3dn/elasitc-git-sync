import { f as fail } from './index-B2LGyy1l.js';

const actions = {
  changePassword: async ({ locals, request }) => {
    const formData = await request.formData();
    const oldPassword = formData.get("oldPassword");
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");
    if (!oldPassword || !newPassword || !confirmPassword) {
      return fail(400, { error: "All fields are required" });
    }
    if (newPassword.length < 8) {
      return fail(400, { error: "New password must be at least 8 characters" });
    }
    if (newPassword !== confirmPassword) {
      return fail(400, { error: "New passwords do not match" });
    }
    if (oldPassword === newPassword) {
      return fail(400, { error: "New password must be different from current password" });
    }
    try {
      await locals.pb.collection("users").update(locals.user.id, {
        oldPassword,
        password: newPassword,
        passwordConfirm: confirmPassword
      });
      await locals.pb.collection("users").authWithPassword(locals.user.email, newPassword);
      return { success: true };
    } catch (err) {
      console.error("Password change error:", err);
      const message = err?.response?.data?.oldPassword?.message || err?.message || "Failed to change password";
      return fail(400, { error: message });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions
});

const index = 15;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-C00OqlOl.js')).default;
const server_id = "src/routes/settings/account/+page.server.ts";
const imports = ["_app/immutable/nodes/15.DFgV1Bvk.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/C9NYA0Nw.js","_app/immutable/chunks/O7RWNxBF.js","_app/immutable/chunks/D2ldot_M.js","_app/immutable/chunks/Cs0PMOxO.js","_app/immutable/chunks/k5AYXn5z.js","_app/immutable/chunks/CZgNezH3.js","_app/immutable/chunks/DUTeUus3.js","_app/immutable/chunks/TVtqyaYP.js","_app/immutable/chunks/BVIc4OKz.js","_app/immutable/chunks/Dl2LfGm4.js","_app/immutable/chunks/z_jCEgha.js","_app/immutable/chunks/BF4Or9KR.js","_app/immutable/chunks/DYGQewJa.js","_app/immutable/chunks/Bo3rhy3K.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=15-BmHk1oXT.js.map
