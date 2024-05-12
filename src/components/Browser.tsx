import { createSignal } from "solid-js";

import { Box, Button, IconButton, TextField } from "@suid/material";
import { PhysicalSize, WebviewWindow, appWindow } from '@tauri-apps/api/window';

export  function Browser() {
  const [url, setUrl] = createSignal("about:blank");
  const [value, setValue] = createSignal("");

  const [isTop, setIsTop] = createSignal(true);

  return (
    <Box sx={{
      position: "relative",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
    }}>
      <Box data-tauri-drag-region sx={{ display: "flex", alignItems: "center", userSelect: 'none', height: "35px", width: '100vw' }}>
        <Box sx={{display: "flex", alignItems: "center", userSelect: 'none'}}>
          <IconButton size='small' onClick={() => appWindow.close()} sx={{color: 'red'}}>
            <img src="https://api.iconify.design/carbon:close-filled.svg" rel="external nofollow"  alt="close" />
          </IconButton>
        </Box>
        <Box data-tauri-drag-region sx={{flex: 1, textAlign: 'center', userSelect: 'none', cursor: 'default'}}>
          title
        </Box>
        <Box sx={{display: "flex", alignItems: "center", userSelect: 'none'}}>
          <IconButton size='small' onClick={async () => {
            const browserWin = WebviewWindow.getByLabel(appWindow.label.replace(/_bar/,''))
            if (browserWin) {
              const size = await appWindow?.outerSize();
              const factor = await appWindow.scaleFactor()

              if (isTop()) {
                browserWin?.hide()
                appWindow.setSize(new PhysicalSize(size.width, 30*factor))
              } else {
                browserWin.show()
                appWindow.setSize(new PhysicalSize(size.width, 70*factor))
                appWindow.setFocus()
              }
              setIsTop(!isTop());
            }
            
          }} sx={{color: 'red'}}>
            <img src="https://api.iconify.design/majesticons:pin.svg" rel="external nofollow"  alt="pin" />
          </IconButton>
        </Box>
      </Box>
      <Box sx={{
        flex: 1,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: "30px",
      }}>
        <TextField sx={{flex: 1}} size="small" value={value()} onChange={(e) => setValue(e.target.value)} />
        <Button onClick={() => setUrl(value())} >Go</Button>
      </Box>
    </Box>
  );
}


