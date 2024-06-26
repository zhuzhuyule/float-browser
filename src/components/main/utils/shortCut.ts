import { register, unregisterAll } from '@tauri-apps/api/globalShortcut';
// import { WebviewWindow } from '@tauri-apps/api/window';
import { createBrowser } from './browser';
import { openOnlineJs } from './onlineJs';

export const registerShortCut = () => {
  // register('Command+Control+S', () => {
  //   WebviewWindow.getFocusedWindow().then(window => {
  //     if (window?.label.startsWith('browser_')) {
  //       const id = `${window.label.replace(/_bar/, '')}_bar`;
  //       const win = WebviewWindow.getByLabel(id);
  //       win?.emit('__browser__command', JSON.stringify({ command: '__browser_toggle_expand' }));
  //     }
  //   });
  // });

  register('Command+Control+B', createBrowser);

  register('Command+Control+J', openOnlineJs);
};

export const unRegisterShortCut = unregisterAll;
