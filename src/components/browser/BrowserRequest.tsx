import { createSignal } from 'solid-js';

import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from '@suid/material';
import { listen, once } from '@tauri-apps/api/event';

import { appWindow } from '@tauri-apps/api/window';
import { effect } from 'solid-js/web';
import { parseURL } from '../../util';
import { store } from '../../util/store';
import { invoke } from '@tauri-apps/api/tauri';

export default function BrowserRequest() {
  const [browserInfo, setBrowserInfo] = createSignal({ url: '', title: '', flag: false });
  const [list, setList] = createSignal<any[]>([]);
  const [urlInfo, setUrlInfo] = createSignal<ReturnType<typeof parseURL>>();

  invoke<{ url: string; title: string }>('get_browser_url', { label: appWindow.label.replace(/_request$/, '') }).then(e => {
    setBrowserInfo(pre => ({ url: e.url, title: e.title, flag: !pre.flag }));
  });

  const ls: Promise<() => void>[] = [];
  ls.push(
    listen<string>('__browser__command', e => {
      const payload = JSON.parse(e.payload);
      switch (payload.command) {
        case '__browser_loaded':
          setBrowserInfo(pre => ({ url: payload.params[0], title: payload.params[1], flag: !pre.flag }));
          break;
        case '__browser_request':
          setTimeout(() => {
            setBrowserInfo(pre => ({ ...pre, flag: !pre.flag }));
          }, 200);
          break;
      }
    })
  );

  effect(() => {
    const currentUrlInfo = parseURL(browserInfo().url);
    appWindow.setTitle(browserInfo().title);

    store[currentUrlInfo.hostname].entries().then(list => {
      setList(
        list
          .map(e => e[1])
          .filter(e => parseURL(e.page).noSearch === currentUrlInfo.noSearch)
          .sort((a, b) => a.url - b.url)
      );
    });
  });

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'auto',
        borderRadius: '4px'
      }}
    >
      <List>
        {list().map((e, i) => {
          const info = parseURL(e.url, urlInfo()?.origin);
          if (!e) {
            return '';
          }
          return (
            <ListItem disablePadding>
              <ListItemButton sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
                <Typography variant="subtitle1" color="grey" sx={{}}>
                  <Typography variant="subtitle2" color="#0fa52b" component={'span'}>
                    [{e.method}]
                  </Typography>
                  {decodeURIComponent(info.pathname)}
                  <Typography variant="subtitle2" color={/2\d+/.test(e.status) ? '#0fa52b' : '#d82a2a'} component={'span'}>
                    [{e.status}]
                  </Typography>
                </Typography>
                <Typography variant="subtitle2" color="#33333366" sx={{}}>
                  {decodeURIComponent(info.search)}
                </Typography>
              </ListItemButton>
              {e.responseHeader['content-type'].replace(/application\/([^;]+).*$/, '$1')}
              {/* {e.type} */}
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
