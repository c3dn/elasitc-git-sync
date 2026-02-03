import PocketBase from 'pocketbase';
import { w as writable } from './index-BJm3v_Zq.js';

const pbUrl = "http://pocketbase:8090";
const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);
const currentUser = writable(pb.authStore.model);
pb.authStore.onChange((token, model) => {
  currentUser.set(model);
});
//# sourceMappingURL=pocketbase-BTGVdFZ0.js.map
