import { createSignal, onMount } from 'solid-js';

import RefreshIcon from '@suid/icons-material/Refresh';
import WestIcon from '@suid/icons-material/West';
import DragIndicatorIcon from '@suid/icons-material/DragIndicator';
import KeyboardDoubleArrowDownIcon from '@suid/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@suid/icons-material/KeyboardDoubleArrowUp';
import { Box, IconButton, Input } from '@suid/material';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import { platform } from '@tauri-apps/api/os';

let platformName = await platform();

import {
  PhysicalPosition,
  PhysicalSize,
  WebviewWindow,
  appWindow as browserBar
} from '@tauri-apps/api/window';

export function Browser() {
  let justFocused = true;
  let lastRunTime = Date.now();
  let lastFocusedTime = Date.now();
  let timeoutHandle = 0;

  const [value, setValue] = createSignal(localStorage.getItem('browser_url') || '');
  const [isExpand, setIsExpand] = createSignal(true);

  const ls: Promise<() => void>[] = [];
  ls.push(
    listen<{ id: string; url: string }>('webview-loaded', e => {
      if (value() !== e.payload.url) {
        setValue(e.payload.url);
        browserBar.isFocused().then(focused => {
          if (focused && document.activeElement?.id === 'url-input') {
            setTimeout(() => {
              const input = document.getElementById('url-input')! as HTMLInputElement;
              input.select();
            }, 100);
          }
        });
      }
    })
  );

  ls.push(
    listen<{ id: string }>('toggle-expand', _e => {
      handleExpand();
    })
  );

  browserBar.onCloseRequested(() => {
    clearTimeout(timeoutHandle);
    ls.forEach(async l => (await l)());
  });

  browserBar.onFocusChanged(({ payload: focused }) => {
    if (focused && lastFocusedTime + 1000 < Date.now()) {
      justFocused = true;
    } else {
      lastFocusedTime = Date.now();
      justFocused = false;
    }
  });

  onMount(() => navigate());
  onMount(() => {
    const input = document.getElementById('url-input')! as HTMLInputElement;
    input.focus();
    setTimeout(() => input.select(), 100);
  });

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',

        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        boxSizing: 'border-box',
        borderRadius: '4px',
        backgroundColor: '#e9e9e9',
        pl: '4px'
      }}
      onKeyPress={e => {
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
      }}
      onMouseEnter={handleBrowserFocusedAndFirstMouseEnter}
    >
      {isExpand() && (
        <>
          <IconButton
            size="small"
            onClick={handleRefresh}
            onMouseEnter={onMouseEnter(handleRefresh)}
          >
            <RefreshIcon />
          </IconButton>
          <IconButton size="small" onClick={handleBack} onMouseEnter={onMouseEnter(handleBack)}>
            <WestIcon />
          </IconButton>
        </>
      )}
      <Input
        id="url-input"
        sx={{
          flex: 1,
          '&:before,&:after': { border: 'none !important' },
          background: 'white',
          p: '0 4px',
          pt: '4px',
          borderRadius: '4px',
          alignItems: 'center'
        }}
        size="small"
        style={{ border: 'none' }}
        value={value()}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && navigate()}
      />
      <IconButton size="small" onClick={handleExpand} onMouseEnter={onMouseEnter(handleExpand)}>
        {isExpand() ? <KeyboardDoubleArrowUpIcon /> : <KeyboardDoubleArrowDownIcon />}
      </IconButton>
      <Box
        data-tauri-drag-region
        width={20}
        height={1}
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <DragIndicatorIcon
          data-tauri-drag-region
          sx={{ color: 'grey', opacity: 0.5, cursor: 'grab' }}
        />
      </Box>
    </Box>
  );

  function handleBrowserFocusedAndFirstMouseEnter() {
    if (justFocused) {
      clearTimeout(timeoutHandle);
      timeoutHandle = setTimeout(() => {
        justFocused = false;
      }, 10);
    }
  }

  function onMouseEnter(cb: () => void) {
    return () => {
      if (justFocused && Date.now() - lastRunTime > 1000) {
        lastRunTime = Date.now();
        cb();
      }
    };
  }

  function navigate() {
    localStorage.setItem('browser_url', value());
    invoke('navigate_url', { url: value(), id: browserBar.label.replace(/_bar/, '') });
  }

  function handleClose() {
    WebviewWindow.getByLabel(browserBar.label.replace(/_bar/, ''))?.close();
    browserBar.close();
  }

  function handleRefresh() {
    browserDirective('reload');
  }

  function handleBack() {
    browserDirective('back');
  }

  function handleForward() {
    browserDirective('forward');
  }

  function browserDirective(command: string) {
    invoke('browser_directive', { id: browserBar.label.replace(/_bar/, ''), command });
  }

  async function handleExpand() {
    const browserWin = WebviewWindow.getByLabel(browserBar.label.replace(/_bar/, ''));
    if (browserWin) {
      const size = await browserBar?.outerSize();
      const factor = await browserBar.scaleFactor();

      if (isExpand()) {
        browserWin?.hide();
        browserBar.setSize(new PhysicalSize(size.width, 40 * factor));
      } else {
        const factor = await browserBar.scaleFactor();
        const pos = await browserBar.outerPosition();
        await browserWin.hide();
        await browserWin.setPosition(new PhysicalPosition(pos.x, pos.y + 40 * factor));
        browserWin.show();
        browserBar.setFocus();
      }
      setIsExpand(!isExpand());
    }
  }
}
