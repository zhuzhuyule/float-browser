import { createMemo, createSignal, onCleanup, onMount } from 'solid-js';

import { Box, Input, List, ListItem, ListItemButton, ListItemText } from '@suid/material';
import { invoke } from '@tauri-apps/api/tauri';

import { listen } from '@tauri-apps/api/event';
import { appWindow as browserBar } from '@tauri-apps/api/window';
import { CONST_BROWSER_HEIGHT } from '../../constants';
import { handleResizeBar } from './actions';

export function BrowserInput({}: {}) {
  let ref: HTMLElement | undefined;
  let lastestUrl = '';
  const [isShowingSuggesting, setIsShowingSuggesting] = createSignal(false);

  const [value, setValue] = createSignal(localStorage.getItem('browser_url') || '');
  const [history, setHistory] = createSignal<string[]>(
    JSON.parse(localStorage.getItem('history_urls') || '[]') || []
  );

  const ls = listen<{ id: string; url: string }>('webview-loaded', e => {
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
  });

  onMount(() => navigate());
  onMount(() => {
    const input = document.getElementById('url-input')! as HTMLInputElement;
    input.focus();
    setTimeout(() => input.select(), 100);
  });

  onCleanup(() => ls.then(cb => cb()));

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
    <>
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
      {shouldShow() && (
        <Box
          sx={{
            position: 'absolute',
            left: ref!.offsetLeft,
            top: ref!.offsetHeight + 6,
            borderRadius: '4px',
            overflow: 'hidden',
            backgroundColor: 'white',
            boxShadow: '0 4px 8px #000000',
            '& *': {
              overscrollBehavior: 'none'
            }
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
    </>
  );

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

  function handleCloseSuggestion() {
    setIsShowingSuggesting(false);
    handleResizeBar(false);
  }

  function handleShowSuggestion(show: boolean) {
    setIsShowingSuggesting(show);
    handleResizeBar(show);
  }
}
