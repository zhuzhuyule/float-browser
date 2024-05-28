import { createMemo, createSignal, onCleanup, onMount } from 'solid-js';

import { Box, Input, List, ListItem, ListItemButton, ListItemText } from '@suid/material';
import { invoke } from '@tauri-apps/api/tauri';

import { listen } from '@tauri-apps/api/event';
import { appWindow as browserBar } from '@tauri-apps/api/window';
import { CONST_BROWSER_HEIGHT } from '../../constants';
import { handleResizeBar } from './actions';

export function BrowserInput({}: {}) {
  let ref: HTMLInputElement | undefined;

  let lastestUrl = '';
  const [isShowingSuggesting, setIsShowingSuggesting] = createSignal(false);
  const [selectIndex, setSelectIndex] = createSignal(0);

  const [value, setValue] = createSignal(localStorage.getItem('browser_url') || '');
  const [history, setHistory] = createSignal<string[]>(JSON.parse(localStorage.getItem('history_urls') || '[]') || []);

  let handle = 0;
  const updateValue = (vl: string) => {
    setValue(vl);
    clearTimeout(handle);
    handle = setTimeout(() => {
      const input = document.getElementById('url-input')! as HTMLInputElement;
      input.setSelectionRange(vl.length, vl.length);
    }, 0);
  };
  onCleanup(() => clearTimeout(handle));

  const ls = listen<{ id: string; url: string }>('webview-loaded', e => {
    if (value() !== e.payload.url) {
      updateValue(e.payload.url);
    }
  });

  onMount(() => navigate());
  onMount(() => {
    const input = document.getElementById('url-input')! as HTMLInputElement;
    input.focus();
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
        onKeyDown={e => {
          switch (e.key) {
            case 'ArrowUp':
              e.preventDefault();
              if (selectIndex() === -1) {
                setSelectIndex(list().length - 1);
              } else {
                setSelectIndex(selectIndex() - 1 < 0 ? 0 : selectIndex() - 1);
              }
              break;
            case 'ArrowDown':
              e.preventDefault();
              setSelectIndex(selectIndex() + 1 < list().length ? selectIndex() + 1 : selectIndex());
              break;
            case 'Escape':
              e.preventDefault();
              if (selectIndex() === -1) {
                handleCloseSuggestion();
                updateValue(lastestUrl);
              } else {
                setSelectIndex(-1);
              }
              break;
            case 'Enter':
              e.preventDefault();
              navigate(list()[selectIndex()] || value());
              handleCloseSuggestion();
              break;
          }
        }}
        onFocus={() => handleShowSuggestion(lastestUrl !== value())}
        onBlur={e => {
          const url = (e.relatedTarget as HTMLElement)?.dataset['item-url'];
          if (url) navigate(url);
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
            {list().map((url, index) => (
              <ListItem disablePadding>
                <ListItemButton id={index === selectIndex() ? 'url-input-selected' : ''} sx={index === selectIndex() ? { backgroundColor: '#e6f7ff' } : {}} data-item-url={url}>
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
      updateValue(url);
    }
    lastestUrl = url || value();
    localStorage.setItem('browser_url', lastestUrl);
    invoke('navigate_url', { url: lastestUrl, id: browserBar.label.replace(/_bar/, '') });
  }

  function handleCloseSuggestion() {
    setSelectIndex(-1);
    setIsShowingSuggesting(false);
    handleResizeBar(false);
  }

  function handleShowSuggestion(show: boolean) {
    setSelectIndex(-1);
    setIsShowingSuggesting(show);
    handleResizeBar(show);
  }
}
