import { WebviewWindow } from '@tauri-apps/api/window';

export const openOnlineJs = () => {
  const key = `app-online-js`;

  const browserWin = new WebviewWindow(key, {
    url: 'https://playcode.io/new',
    width: 1200,
    height: 800,
    center: true,
    decorations: true,
    alwaysOnTop: true,
    hiddenTitle: true
  });
};
