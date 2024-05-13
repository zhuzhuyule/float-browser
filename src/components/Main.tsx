
import { PhysicalPosition, PhysicalSize, WebviewWindow, appWindow } from '@tauri-apps/api/window';

import { Box, Button } from "@suid/material";

import AddIcon from "@suid/icons-material/Add";
import { TauriEvent } from '@tauri-apps/api/event';
import { createSignal } from 'solid-js';

  

export function Main() {

  const [browsers, setBrowsers] = createSignal({});

  return (
    <Box sx={{
      display: "flex",
      alignItems: "space-between",
      flexWrap: "wrap",
      "& > :not(style)": {
        m: 1,
        width: 128,
        height: 128,
      },
    }}>
      <Button variant="outlined" onClick={async () => {
          const key = `browser_${Object.keys(browsers()).length}`
          setBrowsers({...browsers(), [key]: true})

          const browserBar = new WebviewWindow(`${key}_bar`, { url: '/',width:800,height:40,decorations:false, alwaysOnTop: true, resizable: false, minimizable: false, maximizable: false, hiddenTitle: true, contentProtected: true});
          const browserWin = new WebviewWindow(key, { url: '/',width:800,height:800, decorations:true, alwaysOnTop: true, hiddenTitle: true});
          
          browserBar.once(TauriEvent.WINDOW_CREATED, async function () {
            const pos = await browserBar.outerPosition()
            const factor = await browserBar.scaleFactor()
            browserWin.setPosition(new PhysicalPosition(pos.x, pos.y + 40 * factor))
          });

          browserWin.onCloseRequested( function() {browserBar.close()});

          browserBar.onMoved(async function(pos) {
            const isVisible = await  browserWin.isVisible()
            if (!isVisible) {
              const factor = await browserBar.scaleFactor()
              browserWin.setPosition(new PhysicalPosition(pos.payload.x, pos.payload.y + 40 * factor))
            }
          });
          browserWin.onMoved(async function(pos) {
            const isVisible =await  browserWin.isVisible()
            if (isVisible) {
              const factor = await browserWin.scaleFactor()
              browserBar.setPosition(new PhysicalPosition(pos.payload.x, pos.payload.y - 40 * factor))
            }
          });

          browserWin.onResized(async function(size) {
            const factor = await browserWin.scaleFactor()
            browserBar.setSize(new PhysicalSize(size.payload.width, 40*factor))
          });
      }}>
        <AddIcon fontSize='large' />
      </Button>
    </Box>
  );
}


