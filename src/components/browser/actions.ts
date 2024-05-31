import { createSignal, onCleanup, onMount } from 'solid-js';

import { platform } from '@tauri-apps/api/os';
import { invoke } from '@tauri-apps/api/tauri';

import { PhysicalPosition, PhysicalSize, WebviewWindow, appWindow, appWindow as browserBar } from '@tauri-apps/api/window';
import { CONST_BROWSER_HEIGHT } from '../../constants';
import { value } from './BrowserInput';

const [isExpand, setIsExpand] = createSignal(true);
const [isUseingCache, setIsUseingCache] = createSignal(false);
export function useShortCut() {
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
      const label = browserBar.label.replace(/_bar/, '');
      invoke('browser_toggle_devtools', { label });
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
        case 'KeyP':
          handleShowRequest();
          break;
        case 'KeyS':
          handleExpand();
          break;
        case 'BracketLeft':
          handleBack();
          break;
        case 'KeyL':
          handleSelectUrl();
          break;
        case 'KeyY':
          handleToggleCache(true);
          break;
        case 'KeyN':
          handleToggleCache(false);
          break;
        case 'BracketRight':
          handleForward();
          break;
      }
    }
  }
}

export { isExpand };

export function handleExpand() {
  handleShowBrowser(isExpand());
  setIsExpand(!isExpand());
}

export function handleToggleCache(isUse = !isUseingCache(), list: string[] = []) {
  setIsUseingCache(isUse);
  invoke('browser_update_cache', {
    label: browserBar.label.replace(/_bar/, ''),
    open: `${isUse}`,
    list: JSON.stringify(list)
  });
}

export function handleClose() {
  WebviewWindow.getByLabel(browserBar.label.replace(/_bar/, ''))?.close();
  browserBar.close();
}

export function handleRefresh() {
  browserExecuteAction('reload');
}

export async function handleShowRequest() {
  const label = browserBar.label.replace(/_bar/, '_request');
  const browserRequest =
    WebviewWindow.getByLabel(label) ||
    new WebviewWindow(label, {
      url: '/browser-request',
      width: 800,
      height: 800,
      title: await appWindow.title(),
      decorations: true
    });
  browserRequest.setFocus();
}

export function handleBack() {
  browserExecuteAction('back');
}

export function handleForward() {
  browserExecuteAction('forward');
}

function browserExecuteAction(action: string) {
  invoke('browser_execute_action', { label: browserBar.label.replace(/_bar/, ''), action });
}

export function handleSelectUrl() {
  browserBar.setFocus().then(() => {
    const input = document.getElementById('url-input')! as HTMLInputElement;
    input.focus();
    input.select();
  });
}

export async function handleResizeBar(isExpand: boolean, width = 0) {
  const size = await browserBar.outerSize();
  const factor = await browserBar.scaleFactor();
  if (isExpand) {
    browserBar.setSize(new PhysicalSize(width * factor || size.width, (CONST_BROWSER_HEIGHT + 500) * factor));
  } else {
    browserBar.setSize(new PhysicalSize(width * factor || size.width, CONST_BROWSER_HEIGHT * factor));
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
      await browserWin.setPosition(new PhysicalPosition(pos.x, pos.y + CONST_BROWSER_HEIGHT * factor));
      browserWin.show();
      browserBar.setFocus();
    }
  }
}
