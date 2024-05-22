import { register, unregisterAll } from '@tauri-apps/api/globalShortcut';
import { WebviewWindow } from '@tauri-apps/api/window';
import { createBrowser } from './browser';

export const registerShortCut = () => {
  register('CommandOrControl+Shift+S', () => {
    WebviewWindow.getFocusedWindow().then(window => {
      if (window?.label.startsWith('browser_')) {
        const id = `${window.label.replace(/_bar/, '')}_bar`;
        const win = WebviewWindow.getByLabel(id);
        win?.emit('toggle-expand');
      }
    });
  });

  register('Command+Control+B', createBrowser);
};

export const unRegisterShortCut = unregisterAll;
