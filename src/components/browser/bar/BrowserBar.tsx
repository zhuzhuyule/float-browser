import DragIndicatorIcon from '@suid/icons-material/DragIndicator';
import KeyboardDoubleArrowDownIcon from '@suid/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@suid/icons-material/KeyboardDoubleArrowUp';
import RefreshIcon from '@suid/icons-material/Refresh';
import WestIcon from '@suid/icons-material/West';
import { Box, IconButton } from '@suid/material';
import { listen } from '@tauri-apps/api/event';

import { appWindow as browserBar } from '@tauri-apps/api/window';
import { CONST_BROWSER_HEIGHT } from '../../../constants';
import { debounce, parseURL } from '../../../util';
import { store } from '../../../util/store';
import { BrowserInput } from './BrowserInput';
import { handleBack, handleExpand, handleRefresh, handleToggleCache, isExpand, useShortCut } from './actions';

import pick from 'lodash-es/pick';
import merge from 'lodash-es/merge';

export default function BrowserBar() {
  let justFocused = true;
  let lastRunTime = Date.now();
  let lastFocusedTime = Date.now();
  let timeoutHandle = 0;

  useShortCut();

  const ls: Promise<() => void>[] = [];
  ls.push(
    listen<string>('__browser__command', async e => {
      const payload = JSON.parse(e.payload);
      switch (payload.command) {
        case '__browser_toggle_expand':
          handleExpand();
          break;
        case '__browser_toggle_cache':
          handleToggleCache(payload.params[0]);
          break;
        case '__browser_request_update':
          const request = payload.params[0] as IRequest;
          if (request.status == 0) {
            break;
          }
          const pageInfo = parseURL(payload.params[0].page);
          const urlInfo = parseURL(payload.params[0].url);

          const json = await store[pageInfo.host].get<IRequestCache>(urlInfo.noSearch);
          const urls = (await store[pageInfo.host].get<string[]>('urls')) || [];
          if (!urls.includes(request.page)) {
            urls.push(request.page);
          }
          let value = merge(json || ({} as IRequestCache), {
            method: { [request.method]: { [request.status]: { _: pick(request, ['response', 'header']) } } }
          });
          const isExist = value.pages?.find(item => urls[item.k] === request.page);
          if (!isExist) {
            value = { ...value, pages: [...(value.pages || []), { k: urls.findIndex(url => url === request.page), path: `${request.method}.${request.status}._` }] };
          }
          store[pageInfo.host].set('urls', urls);
          store[pageInfo.host].set(urlInfo.noSearch, value);

          debounce(
            () => {
              store[pageInfo.host].save();
            },
            500,
            pageInfo.host
          )();
          break;
      }
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
        <Box data-tauri-drag-region width={20} height={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <DragIndicatorIcon data-tauri-drag-region sx={{ color: 'grey', opacity: 0.5, cursor: 'grab' }} />
        </Box>
        {isExpand() && (
          <>
            <IconButton size="small" onClick={handleRefresh} onMouseEnter={onMouseEnter(handleRefresh)}>
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
}
