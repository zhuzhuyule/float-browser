
import { PhysicalPosition, WebviewWindow, appWindow } from '@tauri-apps/api/window';

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

          const webviewBar = new WebviewWindow(`${key}_bar`, { url: '/',width:800,height:70,decorations:false, alwaysOnTop: true });
          const webview = new WebviewWindow(key, { url: '/',width:800,height:800, decorations:false, alwaysOnTop: true});
          
          webviewBar.once(TauriEvent.WINDOW_CREATED, async function () {
            const pos = await webviewBar.outerPosition()
            const factor = await appWindow.scaleFactor()
            webview.setPosition(new PhysicalPosition(pos.x, pos.y + 70 * factor))
          });
          webviewBar.once(TauriEvent.WINDOW_DESTROYED, function() {webview.close()});
      }}>
        <AddIcon fontSize='large' />
      </Button>
    </Box>
  );
}


