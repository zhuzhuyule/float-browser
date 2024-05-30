import { createSignal } from 'solid-js';

import DragIndicatorIcon from '@suid/icons-material/DragIndicator';
import KeyboardDoubleArrowDownIcon from '@suid/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@suid/icons-material/KeyboardDoubleArrowUp';
import RefreshIcon from '@suid/icons-material/Refresh';
import WestIcon from '@suid/icons-material/West';
import { Box, IconButton } from '@suid/material';
import { listen, once } from '@tauri-apps/api/event';

import { appWindow, appWindow as browserBar } from '@tauri-apps/api/window';
import { CONST_BROWSER_HEIGHT } from '../../constants';
import { BrowserInput } from './BrowserInput';
import { useShortCut, handleBack, handleRefresh, handleExpand, handleToggleCache, isExpand } from './actions';
import { store } from '../../util/store';
import { parseURL } from '../../util';
import { effect } from 'solid-js/web';

const [title, setTitle] = createSignal('');
export { title };

export default function BrowserRequest() {
  const [list, setList] = createSignal<any[]>([]);
  const [urlInfo, setUrlInfo] = createSignal<ReturnType<typeof parseURL>>();

  const ls: Promise<() => void>[] = [];
  ls.push(
    listen<string>('__browser__command', e => {
      const payload = JSON.parse(e.payload);
      switch (payload.command) {
        case '__browser_loaded':
          setUrlInfo(parseURL(payload.params[0]));
          const title = payload.params[1];
          setTitle(title);
          appWindow.setTitle(title);
          break;
        case '__browser_request':
          const urlInfo = parseURL(payload.params[0].page);
          setTimeout(() => {
            store[urlInfo.hostname].entries().then(list => {
              setList(list.map(e => e[1]));
            });
          }, 200);
          break;
      }
    })
  );
  once<string>('__request-info', e => {
    setUrlInfo(parseURL(e.payload));
  });

  effect(() => {
    if (urlInfo()) {
      store[urlInfo()!.hostname].entries().then(list => {
        setList(
          list
            .map(e => e[1])
            .filter(e => e.url.includes(urlInfo()!.pathname))
            .sort((a, b) => a.i - b.i)
        );
      });
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
      {list().map((e, i) => (
        <Box sx={{ display: 'felx' }}>
          <Box>{e.url}</Box>
          {/* <Box>{e.response}</Box> */}
        </Box>
      ))}
    </Box>
  );
}
