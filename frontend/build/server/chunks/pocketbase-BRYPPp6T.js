import PocketBase from 'pocketbase';
import { w as writable } from './index-BGd6R47q.js';

const pbUrl = "http://pocketbase:8090";
const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);
const currentUser = writable(pb.authStore.model);
pb.authStore.onChange((token, model) => {
  currentUser.set(model);
});
//# sourceMappingURL=pocketbase-BRYPPp6T.js.map
