import { onCleanup, onMount } from 'solid-js';

import { platform } from '@tauri-apps/api/os';
import { invoke } from '@tauri-apps/api/tauri';

import {
  PhysicalPosition,
  PhysicalSize,
  WebviewWindow,
  appWindow as browserBar
} from '@tauri-apps/api/window';
import { CONST_BROWSER_HEIGHT } from '../../constants';

export function addShortCut() {
  onMount(() => {
    document.addEventListener('keypress', handleShortCut);
  });
  onCleanup(() => {
    document.removeEventListener('keypress', handleShortCut);
  });

  async function handleShortCut(e: KeyboardEvent) {
    let platformName = await platform();

    const cmdKey = platformName === 'darwin' ? e.metaKey : e.ctrlKey;
    if (e.altKey && cmdKey && (e.code === 'KeyI' || e.code === 'KeyJ')) {
      const id = browserBar.label.replace(/_bar/, '');
      invoke('toggle_devtools', { id });
    }

    if (e.shiftKey || e.altKey) return;
    if (cmdKey) {
      switch (e.code) {
        case 'KeyW':
          handleClose();
          break;
        case 'KeyR':
          handleRefresh();
          break;
        case 'BracketLeft':
          handleBack();
          break;
        case 'BracketRight':
          handleForward();
          break;
      }
    }
  }
}

export function handleClose() {
  WebviewWindow.getByLabel(browserBar.label.replace(/_bar/, ''))?.close();
  browserBar.close();
}

export function handleRefresh() {
  browserDirective('reload');
}

export function handleBack() {
  browserDirective('back');
}

export function handleForward() {
  browserDirective('forward');
}

function browserDirective(command: string) {
  invoke('browser_directive', { id: browserBar.label.replace(/_bar/, ''), command });
}

export async function handleResizeBar(isExpand: boolean) {
  const size = await browserBar.outerSize();
  const factor = await browserBar.scaleFactor();
  if (isExpand) {
    browserBar.setSize(new PhysicalSize(size.width, (CONST_BROWSER_HEIGHT + 500) * factor));
  } else {
    browserBar.setSize(new PhysicalSize(size.width, CONST_BROWSER_HEIGHT * factor));
  }
}

export async function handleShowBrowser(isShow: boolean) {
  const browserWin = WebviewWindow.getByLabel(browserBar.label.replace(/_bar/, ''));
  if (browserWin) {
    const size = await browserBar?.outerSize();
    const factor = await browserBar.scaleFactor();

    if (isShow) {
      browserWin?.hide();
      browserBar.setSize(new PhysicalSize(size.width, CONST_BROWSER_HEIGHT * factor));
    } else {
      const factor = await browserBar.scaleFactor();
      const pos = await browserBar.outerPosition();
      await browserWin.hide();
      await browserWin.setPosition(
        new PhysicalPosition(pos.x, pos.y + CONST_BROWSER_HEIGHT * factor)
      );
      browserWin.show();
      browserBar.setFocus();
    }
  }
}
