import { createSignal } from 'solid-js';

import DragIndicatorIcon from '@suid/icons-material/DragIndicator';
import KeyboardDoubleArrowDownIcon from '@suid/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@suid/icons-material/KeyboardDoubleArrowUp';
import RefreshIcon from '@suid/icons-material/Refresh';
import WestIcon from '@suid/icons-material/West';
import { Box, IconButton } from '@suid/material';
import { listen } from '@tauri-apps/api/event';

import { appWindow as browserBar } from '@tauri-apps/api/window';
import { CONST_BROWSER_HEIGHT } from '../../constants';
import { BrowserInput } from './BrowserInput';
import { addShortCut, handleBack, handleRefresh, handleShowBrowser } from './actions';

export function Browser() {
  let justFocused = true;
  let lastRunTime = Date.now();
  let lastFocusedTime = Date.now();
  let timeoutHandle = 0;

  const [isExpand, setIsExpand] = createSignal(true);

  addShortCut();

  const ls: Promise<() => void>[] = [];
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
          borderRadius: '4px',
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

        <BrowserInput />

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

  async function handleExpand() {
    handleShowBrowser(isExpand());
    setIsExpand(!isExpand());
  }
}
