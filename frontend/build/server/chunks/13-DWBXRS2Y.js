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

const index = 13;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BqY_-R53.js')).default;
const server_id = "src/routes/settings/account/+page.server.ts";
const imports = ["_app/immutable/nodes/13.iXYhFGac.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/BbuzmxRY.js","_app/immutable/chunks/BnHnlVXU.js","_app/immutable/chunks/XgF_cVEg.js","_app/immutable/chunks/cVoOpi3M.js","_app/immutable/chunks/BwaF3Q6U.js","_app/immutable/chunks/FH1wYdD7.js","_app/immutable/chunks/Cak3-npf.js","_app/immutable/chunks/C4oicLII.js","_app/immutable/chunks/BprPN9g1.js","_app/immutable/chunks/COK2pY8o.js","_app/immutable/chunks/Bm_MFDQ1.js","_app/immutable/chunks/C4YxXooL.js","_app/immutable/chunks/WFeWt-3y.js","_app/immutable/chunks/Cr7rThFx.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=13-DWBXRS2Y.js.map
