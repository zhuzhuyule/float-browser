import { createMemo, createSignal, onCleanup, onMount } from 'solid-js';

import DragIndicatorIcon from '@suid/icons-material/DragIndicator';
import KeyboardDoubleArrowDownIcon from '@suid/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@suid/icons-material/KeyboardDoubleArrowUp';
import RefreshIcon from '@suid/icons-material/Refresh';
import WestIcon from '@suid/icons-material/West';
import {
  Box,
  IconButton,
  Input,
  List,
  ListItem,
  ListItemButton,
  ListItemText
} from '@suid/material';
import { listen } from '@tauri-apps/api/event';
import { platform } from '@tauri-apps/api/os';
import { invoke } from '@tauri-apps/api/tauri';

let platformName = await platform();

import {
  PhysicalPosition,
  PhysicalSize,
  WebviewWindow,
  appWindow as browserBar
} from '@tauri-apps/api/window';
import { CONST_BROWSER_HEIGHT } from '../../constants';

export function Browser() {
  let justFocused = true;
  let lastRunTime = Date.now();
  let lastFocusedTime = Date.now();
  let timeoutHandle = 0;
  let ref: HTMLElement | undefined;
  let lastestUrl = '';

  const [value, setValue] = createSignal(localStorage.getItem('browser_url') || '');
  const [history, setHistory] = createSignal<string[]>(
    JSON.parse(localStorage.getItem('history_urls') || '[]') || []
  );
  const [isExpand, setIsExpand] = createSignal(true);
  const [isShowingSuggesting, setIsShowingSuggesting] = createSignal(false);

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

  onMount(() => {
    document.addEventListener('keypress', handleShortCut);
  });
  onCleanup(() => {
    document.removeEventListener('keypress', handleShortCut);
  });

  const list = createMemo(() =>
    history()
      .filter(url =>
        url.toLowerCase().includes(
          value()
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
        )
      )
      .slice(0, 20)
  );

  const shouldShow = createMemo(() => isShowingSuggesting() && ref && !!list().length);
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        borderRadius: '4px'
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',

          height: CONST_BROWSER_HEIGHT,
          overflowY: 'visible',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          backgroundColor: '#e9e9e9',
          pl: '4px'
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
          ref={ref as any}
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
          onChange={e => {
            setValue(e.target.value);
            handleShowSuggestion(lastestUrl !== e.target.value);
          }}
          onKeyDown={e => e.key === 'Enter' && navigate(value())}
          onFocus={() => handleShowSuggestion(lastestUrl !== value())}
          onBlur={e => {
            const url = (e.relatedTarget as HTMLElement)?.dataset['item-url'];
            if (url) {
              navigate(url);
            }
            handleCloseSuggestion();
          }}
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

      {shouldShow() && (
        <Box
          sx={{
            position: 'absolute',
            left: ref!.offsetLeft,
            top: ref!.offsetHeight + 6,
            borderRadius: '4px',
            overflow: 'hidden',
            backgroundColor: 'white',
            boxShadow: '0 4px 8px #000000'
          }}
        >
          <List
            sx={{
              overflow: 'auto',
              width: ref!.offsetWidth,
              maxHeight: `calc(100vh - ${CONST_BROWSER_HEIGHT}px - 6px)`
            }}
            style={{ padding: '1px 0' }}
          >
            {list().map(url => (
              <ListItem disablePadding>
                <ListItemButton data-item-url={url}>
                  <ListItemText primary={url} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
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

  function navigate(url = '') {
    if (url) {
      const newHistory = [url, ...history().filter(v => v !== url)].slice(0, 1000);
      localStorage.setItem('history_urls', JSON.stringify(newHistory));
      setHistory(newHistory);
      setValue(url);
    }
    lastestUrl = url || value();
    localStorage.setItem('browser_url', lastestUrl);
    invoke('navigate_url', { url: lastestUrl, id: browserBar.label.replace(/_bar/, '') });
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

  async function handleCloseSuggestion() {
    setIsShowingSuggesting(false);
    const size = await browserBar.outerSize();
    const factor = await browserBar.scaleFactor();
    browserBar.setSize(new PhysicalSize(size.width, CONST_BROWSER_HEIGHT * factor));
  }

  async function handleShowSuggestion(show: boolean) {
    setIsShowingSuggesting(show);
    const size = await browserBar.outerSize();
    const factor = await browserBar.scaleFactor();
    if (show) {
      browserBar.setSize(new PhysicalSize(size.width, (CONST_BROWSER_HEIGHT + 500) * factor));
    } else {
      browserBar.setSize(new PhysicalSize(size.width, CONST_BROWSER_HEIGHT * factor));
    }
  }

  function handleShortCut(e: KeyboardEvent) {
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

  async function handleExpand() {
    const browserWin = WebviewWindow.getByLabel(browserBar.label.replace(/_bar/, ''));
    if (browserWin) {
      const size = await browserBar?.outerSize();
      const factor = await browserBar.scaleFactor();

      if (isExpand()) {
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
      setIsExpand(!isExpand());
    }
  }
}
