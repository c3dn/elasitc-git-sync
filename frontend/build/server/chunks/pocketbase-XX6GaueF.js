import PocketBase from 'pocketbase';
import { w as writable } from './index-BZCjIgoZ.js';

const pbUrl = "http://pocketbase:8090";
const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);
const currentUser = writable(pb.authStore.model);
pb.authStore.onChange((token, model) => {
  currentUser.set(model);
});
//# sourceMappingURL=pocketbase-XX6GaueF.js.map
