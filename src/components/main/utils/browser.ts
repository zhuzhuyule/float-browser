import { TauriEvent } from '@tauri-apps/api/event';
import { PhysicalPosition, PhysicalSize, WebviewWindow } from '@tauri-apps/api/window';
import { createSignal } from 'solid-js';
import { CONST_BROWSER_HEIGHT } from '../../../constants';

const [browsers, setBrowsers] = createSignal({});

export const createBrowser = () => {
  const key = `browser_${Object.keys(browsers()).length}`;
  setBrowsers({ ...browsers(), [key]: true });

  const browserBar = new WebviewWindow(`${key}_bar`, {
    url: '/',
    width: 800,
    height: 140,
    decorations: false,
    alwaysOnTop: true,
    resizable: false,
    transparent: true,
    minimizable: false,
    maximizable: false,
    hiddenTitle: true,
    contentProtected: true
  });
  const browserWin = new WebviewWindow(key, {
    url: '/',
    width: 800,
    height: 800,
    decorations: true,
    alwaysOnTop: true,
    hiddenTitle: true
  });

  browserBar.once(TauriEvent.WINDOW_CREATED, async function (e) {
    const pos = await browserBar.outerPosition();
    const factor = await browserBar.scaleFactor();
    browserWin
      .setPosition(new PhysicalPosition(pos.x, pos.y + CONST_BROWSER_HEIGHT * factor))
      .then(() => {
        browserBar.setFocus();
      });
  });

  browserWin.onCloseRequested(function () {
    browserBar.close();
  });

  browserBar.onMoved(async function (pos) {
    const isVisible = await browserWin.isVisible();
    if (!isVisible) {
      const factor = await browserBar.scaleFactor();
      browserWin.setPosition(
        new PhysicalPosition(pos.payload.x, pos.payload.y + CONST_BROWSER_HEIGHT * factor)
      );
    }
  });

  browserWin.onMoved(async function (pos) {
    const isVisible = await browserWin.isVisible();
    if (isVisible) {
      const factor = await browserWin.scaleFactor();
      browserBar.setPosition(
        new PhysicalPosition(pos.payload.x, pos.payload.y - CONST_BROWSER_HEIGHT * factor)
      );
    }
  });

  browserWin.onResized(async function (size) {
    const factor = await browserWin.scaleFactor();
    browserBar.setSize(new PhysicalSize(size.payload.width, CONST_BROWSER_HEIGHT * factor));
  });
};
