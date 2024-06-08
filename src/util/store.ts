import { Store } from 'tauri-plugin-store-api';

export const store = new Proxy({} as Record<string, Store>, {
  get(target, host) {
    if (typeof host === 'string') {
      if (!target[host]) {
        target[host] = new Store(`request/${host}.json`);
      }
      return target[host];
    }
  },
  set() {
    return true;
  }
});
