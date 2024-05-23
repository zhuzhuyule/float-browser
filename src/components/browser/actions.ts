import { createSignal, onCleanup, onMount } from 'solid-js';

import { platform } from '@tauri-apps/api/os';
import { invoke } from '@tauri-apps/api/tauri';

import {
  PhysicalPosition,
  PhysicalSize,
  WebviewWindow,
  appWindow as browserBar
} from '@tauri-apps/api/window';
import { CONST_BROWSER_HEIGHT } from '../../constants';

export function useShortCut() {
  const [isExpand, setIsExpand] = createSignal(true);

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
        case 'KeyS':
          handleExpand();
          break;
        case 'BracketLeft':
          handleBack();
          break;
        case 'KeyY':
          setUseCache(true, []);
          break;
        case 'KeyN':
          setUseCache(false, []);
          break;
        case 'BracketRight':
          handleForward();
          break;
      }
    }
  }

  function handleExpand() {
    handleShowBrowser(isExpand());
    setIsExpand(!isExpand());
  }

  return {
    isExpand,
    handleExpand
  };
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

function setUseCache(isUse: boolean, list: string[] = []) {
  console.log('----cache---->', isUse);
  invoke('use_cache', {
    id: browserBar.label.replace(/_bar/, ''),
    open: `${isUse}`,
    list: JSON.stringify(list)
  });
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
