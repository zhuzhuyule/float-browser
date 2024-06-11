import { createSignal } from 'solid-js';

import { Box, Button, List, Typography } from '@suid/material';
import { listen } from '@tauri-apps/api/event';

import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';
import { effect } from 'solid-js/web';
import { parseURL } from '../../../util';
import { store } from '../../../util/store';
import { APIItem } from './APIItem';

export default function Network() {
  const [browserInfo, setBrowserInfo] = createSignal({ url: '', title: '', host: '' });
  const [list, setList] = createSignal<any[]>([]);
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);

  invoke<{ url: string; title: string }>('get_browser_url', { label: appWindow.label.replace(/_request$/, '') }).then(e => {
    setBrowserInfo({ url: e.url, title: e.title, host: parseURL(e.url).host });
  });

  const ls: Promise<() => void>[] = [];
  ls.push(
    listen<string>('__browser__command', e => {
      const payload = JSON.parse(e.payload);
      switch (payload.command) {
        case '__browser_loaded':
          setBrowserInfo({ url: payload.params[0], title: payload.params[1], host: parseURL(payload.params[0]).host });
          break;
      }
    })
  );

  function updateList(urlInfo: ReturnType<typeof parseURL>) {
    store[urlInfo.host].get<string[]>('urls').then(urls => {
      if (urls) {
        store[urlInfo.host].entries<{ method: { [method: string]: { [status: string]: Record<string, any> } }; pages: { k: number; path: string }[] }>().then(list => {
          setList(
            list
              .flatMap(([key, value]) => {
                const item = value?.pages?.find(page => {
                  return parseURL(urls[page.k]).noSearch === urlInfo.noSearch;
                });
                if (item) {
                  return Object.entries(value.method).map(([method, status]) => {
                    return {
                      url: key,
                      method,
                      select: item.path,
                      content: status
                    };
                  });
                }
                return null;
              }, 2)
              .filter(item => !!item)
          );
        });
      }
    });
  }

  let unListen: undefined | (() => void);
  effect(preUrl => {
    if (browserInfo().url && browserInfo().url !== preUrl) {
      const currentUrlInfo = parseURL(browserInfo().url);
      appWindow.setTitle(browserInfo().title);

      unListen && unListen();
      unListen = undefined;
      updateList(currentUrlInfo);
      store[currentUrlInfo.host]
        .onChange((key, value) => {
          updateList(currentUrlInfo);
        })
        .then(fn => (unListen = fn));
    }
    return browserInfo().url;
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
      <Box sx={{ display: 'flex', alignItems: 'center', padding: '4px 8px' }}>
        <Typography variant="subtitle2" color="#0fa52b" component={'span'}>
          [类型]
        </Typography>
        PathName
        <Typography variant="subtitle2" color="#0fa52b" component={'span'}>
          [status]
        </Typography>
        <Box flex="1">
          <Button onClick={() => store[parseURL(browserInfo().url).host].clear()}>清除缓存</Button>
        </Box>
        <Box>返回类型</Box>
      </Box>
      <List>
        {list().map((item, i) => {
          if (!item) return '';
          return (
            <APIItem
              index={i}
              item={item}
              active={i === activeIndex()}
              onClick={index => {
                setActiveIndex(index);
              }}
            />
          );
        })}
      </List>
    </Box>
  );
}
