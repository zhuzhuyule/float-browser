import { createSignal } from "solid-js";

import { Box, IconButton, Input } from "@suid/material";
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import { PhysicalPosition, PhysicalSize, WebviewWindow, appWindow, appWindow as browserBar } from '@tauri-apps/api/window';

const DRAG_ICON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1em' height='1em' viewBox='0 0 16 16'%3E%3Cpath fill='%23000' fill-rule='evenodd' d='M7.375 3.67c0-.645-.56-1.17-1.25-1.17s-1.25.525-1.25 1.17c0 .646.56 1.17 1.25 1.17s1.25-.524 1.25-1.17m0 8.66c0-.646-.56-1.17-1.25-1.17s-1.25.524-1.25 1.17c0 .645.56 1.17 1.25 1.17s1.25-.525 1.25-1.17m-1.25-5.5c.69 0 1.25.525 1.25 1.17c0 .645-.56 1.17-1.25 1.17S4.875 8.645 4.875 8c0-.645.56-1.17 1.25-1.17m5-3.16c0-.645-.56-1.17-1.25-1.17s-1.25.525-1.25 1.17c0 .646.56 1.17 1.25 1.17s1.25-.524 1.25-1.17m-1.25 7.49c.69 0 1.25.524 1.25 1.17c0 .645-.56 1.17-1.25 1.17s-1.25-.525-1.25-1.17c0-.646.56-1.17 1.25-1.17M11.125 8c0-.645-.56-1.17-1.25-1.17s-1.25.525-1.25 1.17c0 .645.56 1.17 1.25 1.17s1.25-.525 1.25-1.17'/%3E%3C/svg%3E")`

export  function Browser() {
  const [value, setValue] = createSignal("");

  const [isExpand, setIsExpand] = createSignal(true);

  const ls = listen<{ id: string, url: string}>('webview-loaded', (e) => {
    if (value() !== e.payload.url) {
      setValue(e.payload.url)
    }
  })
  appWindow.onCloseRequested(async () => {
    (await ls)()
  })

  return (
    <Box sx={{
      flex: 1,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: '8px',

      position: "relative",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#e9e9e9",
    }}>
      <IconButton size='small' sx={{marginLeft: '8px'}} onClick={() => {
        invoke('browser_reload', {id: browserBar.label.replace(/_bar/,'')})
      }}>
        <img src={`https://api.iconify.design/oi:reload.svg`} rel="external nofollow"  alt="refresh" />
      </IconButton>
      <IconButton size='small' onClick={() => {
        invoke('browser_back', {id: browserBar.label.replace(/_bar/,'')})
      }}>
        <img src={`https://api.iconify.design/fluent-mdl2:chrome-back.svg`} rel="external nofollow"  alt="refresh" />
      </IconButton>

      <Input
        sx={{flex: 1, '&:before,&:after': {border: 'none !important'}, background: 'white', p: '0 4px',borderRadius: '4px', alignItems: 'center'}} size="small"
        value={value()}
        onChange={(e) => setValue(e.target.value)}
        style={{border: 'none'}}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            navigate()
          }
        }}
      />
      
      <IconButton size='small' onClick={navigate}>Go</IconButton>
      <IconButton size='small' onClick={async () => {
          const browserWin = WebviewWindow.getByLabel(browserBar.label.replace(/_bar/,''))
          if (browserWin) {
            const size = await browserBar?.outerSize();
            const factor = await browserBar.scaleFactor();

            if (isExpand()) {
              browserWin?.hide()
              browserBar.setSize(new PhysicalSize(size.width, 40*factor))
            } else {
              const factor = await browserBar.scaleFactor()
              const pos = await browserBar.outerPosition()
              await browserWin.hide()
              await browserWin.setPosition(new PhysicalPosition(pos.x, pos.y + 40 * factor))
              browserWin.show()
              browserBar.setFocus()
            }
            setIsExpand(!isExpand());
          }
        }} sx={{color: 'red'}}>
          <img src={`https://api.iconify.design/ooui:${ isExpand() ?  'collapse':'expand' }.svg`} rel="external nofollow"  alt="collapse" />
      </IconButton>
      <Box data-tauri-drag-region width={20} height={1} sx={{backgroundImage: DRAG_ICON, backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundSize: "contain", cursor: "grab", alignItems: 'stretch'}} >
      </Box>
    </Box>
  );

  function navigate() {
    invoke('navigate_url', {url: value(), id: browserBar.label.replace(/_bar/,'')})
  }
}


