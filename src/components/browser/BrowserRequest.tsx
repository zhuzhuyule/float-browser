import { createSignal } from 'solid-js';

import { Box, Chip, List, ListItem, ListItemButton, Typography } from '@suid/material';
import { listen } from '@tauri-apps/api/event';

import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';
import { effect } from 'solid-js/web';
import { parseURL } from '../../util';
import { store } from '../../util/store';
import { JSONEditor } from './JSONEditor';

export default function BrowserRequest() {
  const [browserInfo, setBrowserInfo] = createSignal({ url: '', title: '', hostname: '' });
  const [list, setList] = createSignal<any[]>([]);
  const [activeIndex, setActiveIndex] = createSignal<number>();

  invoke<{ url: string; title: string }>('get_browser_url', { label: appWindow.label.replace(/_request$/, '') }).then(e => {
    setBrowserInfo(pre => ({ url: e.url, title: e.title, hostname: parseURL(e.url).hostname }));
  });

  const ls: Promise<() => void>[] = [];
  ls.push(
    listen<string>('__browser__command', e => {
      const payload = JSON.parse(e.payload);
      switch (payload.command) {
        case '__browser_loaded':
          setBrowserInfo(pre => ({ url: payload.params[0], title: payload.params[1], hostname: parseURL(payload.params[0]).hostname }));
          break;
      }
    })
  );

  function updateList(urlInfo: ReturnType<typeof parseURL>) {
    store[urlInfo.hostname].entries<{ page: string }>().then(list => {
      setList(list.map(e => e[1]).filter(e => parseURL(e.page).noSearch === urlInfo.noSearch));
    });
  }

  let unListen: () => void;
  effect(preHostname => {
    const currentUrlInfo = parseURL(browserInfo().url);
    appWindow.setTitle(browserInfo().title);

    if (preHostname !== currentUrlInfo.hostname) {
      unListen && unListen();
      if (!list().length) {
        updateList(currentUrlInfo);
      }
      store[currentUrlInfo.hostname]
        .onChange((key, value) => {
          updateList(currentUrlInfo);
        })
        .then(fn => (unListen = fn));
    }
    return currentUrlInfo.hostname;
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
          const info = parseURL(e.url, browserInfo()?.url);
          if (!e) return '';

          const ty = e.responseHeader['content-type'].replace(/application\/([^;]+).*$/, '$1');
          const isActive = i === activeIndex();
          return (
            <ListItem disablePadding sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start', background: isActive ? '#33333322' : 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', paddingRight: '12px', boxSizing: 'border-box' }}>
                <ListItemButton
                  sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'start' }}
                  onClick={() => {
                    if (isActive) {
                      setActiveIndex(undefined);
                    } else {
                      setActiveIndex(i);
                    }
                  }}
                >
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
                <Chip size="small" label={ty} />
              </Box>
              {i === activeIndex() && ty.toLowerCase() === 'json' && (
                <JSONEditor
                  json={e.response}
                  onCancel={() => setActiveIndex()}
                  onSave={text => {
                    // store[parseURL(browserInfo().url).hostname].set('');
                  }}
                />
              )}
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
