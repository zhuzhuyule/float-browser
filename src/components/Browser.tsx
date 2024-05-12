import { createSignal } from "solid-js";

import { Box, Button, IconButton, TextField } from "@suid/material";
import { PhysicalSize, WebviewWindow, appWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/tauri';

export  function Browser() {
  const [value, setValue] = createSignal("");

  const [isTop, setIsTop] = createSignal(true);

  return (
    <Box sx={{
      position: "relative",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
    }}>
      {/* <Box data-tauri-drag-region sx={{ display: "flex", alignItems: "center", userSelect: 'none', height: "35px", width: '100vw' }}>
      </Box> */}
      <Box sx={{
        flex: 1,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <TextField sx={{flex: 1}} size="small" value={value()} onChange={(e) => setValue(e.target.value)} />
        <Button onClick={() => {
            invoke('navigate_url', {url: value(), id: appWindow.label.replace(/_bar/,'')})
        }} >Go</Button>
        <IconButton size='small' onClick={async () => {
            const browserWin = WebviewWindow.getByLabel(appWindow.label.replace(/_bar/,''))
            if (browserWin) {
              const size = await appWindow?.outerSize();
              const factor = await appWindow.scaleFactor()

              if (isTop()) {
                browserWin?.hide()
                appWindow.setSize(new PhysicalSize(size.width, 40*factor))
              } else {
                browserWin.show()
                appWindow.setSize(new PhysicalSize(size.width, 40*factor))
                appWindow.setFocus()
              }
              setIsTop(!isTop());
            }
          }} sx={{color: 'red'}}>
            <img src="https://api.iconify.design/majesticons:pin.svg" rel="external nofollow"  alt="pin" />
          </IconButton>
      </Box>
    </Box>
  );
}


