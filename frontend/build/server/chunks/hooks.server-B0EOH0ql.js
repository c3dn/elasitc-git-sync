import PocketBase from 'pocketbase';

const handle = async ({ event, resolve }) => {
  const pb = new PocketBase("http://pocketbase:8090");
  const cookie = event.request.headers.get("cookie") || "";
  pb.authStore.loadFromCookie(cookie);
  event.locals.pb = pb;
  event.locals.user = pb.authStore.model;
  const response = await resolve(event);
  const setCookie = pb.authStore.exportToCookie({ httpOnly: false });
  response.headers.append("set-cookie", setCookie);
  return response;
};

export { handle };
//# sourceMappingURL=hooks.server-B0EOH0ql.js.map
