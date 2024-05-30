import { createMemo, createSignal, onCleanup, onMount } from 'solid-js';

import { Box, Input, List, ListItem, ListItemButton, ListItemText } from '@suid/material';
import { invoke } from '@tauri-apps/api/tauri';

import { listen } from '@tauri-apps/api/event';
import { WebviewWindow, appWindow as browserBar } from '@tauri-apps/api/window';
import { CONST_BROWSER_HEIGHT } from '../../constants';
import { handleResizeBar, handleSelectUrl } from './actions';
import { effect } from 'solid-js/web';
import { debounce } from '../../util';

export function BrowserInput({}: {}) {
  let ref: HTMLInputElement | undefined;

  let lastestUrl = '';
  const [isShowingSuggesting, setIsShowingSuggesting] = createSignal(false);
  const [selectIndex, setSelectIndex] = createSignal(0);

  const [value, setValue] = createSignal(localStorage.getItem('browser_url') || '');
  const [history, setHistory] = createSignal<string[]>(JSON.parse(localStorage.getItem('history_urls') || '[]') || []);

  const [autoWidthStatus, setAutoWidthStatus] = createSignal({ bar: false, input: false });

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

  browserBar.onFocusChanged(e => {
    if (!e.payload) {
      const input = document.getElementById('url-input')! as HTMLInputElement;
      input.blur();
    }
    setAutoWidthStatus({ ...autoWidthStatus(), bar: e.payload });
  });

  effect(() => {
    const status = autoWidthStatus();
    debounce(() => {
      if (status.bar && status.input) {
        startAutoWidth();
      } else if (!status.bar) {
        endAutoWidth();
      }
    })();
  });

  const ls = listen<string>('__browser__command', e => {
    try {
      const payload = JSON.parse(e.payload);
      switch (payload.command) {
        case '__browser_loaded':
          if (value() !== payload.params[0]) {
            updateValue(payload.params[0]);
          }
          console.log(payload.params);

          WebviewWindow.getByLabel(browserBar.label.replace(/_bar/, ''))?.setTitle(payload.params[1]);
          break;
        case '__browser_focus_address':
          handleSelectUrl();
          break;
        default:
          break;
      }
    } catch (error) {}
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
          setAutoWidthStatus({ ...autoWidthStatus(), input: true });
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
        onFocus={() => {
          handleShowSuggestion(lastestUrl !== value());
          setAutoWidthStatus({ ...autoWidthStatus(), input: true });
        }}
        onBlur={e => {
          const url = (e.relatedTarget as HTMLElement)?.dataset['item-url'];
          if (url) navigate(url);
          handleCloseSuggestion();
          setAutoWidthStatus({ ...autoWidthStatus(), input: false });
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

  function startAutoWidth() {
    console.log('start');

    const input = document.getElementById('url-input')! as HTMLInputElement;
    const offset = document.body.clientWidth - input.offsetWidth;
    handleResizeBar(isShowingSuggesting(), input.scrollWidth + offset);
  }
  function endAutoWidth() {
    const win = WebviewWindow.getByLabel(browserBar.label.replace(/_bar/, ''))!;
    Promise.all([win.outerSize(), win.scaleFactor()]).then(([outerSize, scaleFactor]) => {
      console.log('end');
      handleResizeBar(isShowingSuggesting(), outerSize.toLogical(scaleFactor).width);
    });
  }

  function navigate(url = '') {
    if (url) {
      const newHistory = [url, ...history().filter(v => v !== url)].slice(0, 1000);
      localStorage.setItem('history_urls', JSON.stringify(newHistory));
      setHistory(newHistory);
      updateValue(url);
    }
    lastestUrl = url || value();
    localStorage.setItem('browser_url', lastestUrl);
    invoke('browser_navigate', { url: lastestUrl, label: browserBar.label.replace(/_bar/, '') });
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
