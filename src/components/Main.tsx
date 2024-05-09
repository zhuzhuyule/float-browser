
import { WebviewWindow, appWindow } from '@tauri-apps/api/window';

import { Box, Button } from "@suid/material";

import AddIcon from "@suid/icons-material/Add";

  

export function Main() {
  const map = new Map();
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
      <Button variant="outlined" onClick={() => {
          const key = `browser-${map.keys.length}`
          const webview = new WebviewWindow(key, {            url: '/'  });
          webview.once('tauri://created', function () {
          // webview window successfully created
            appWindow.setAlwaysOnTop(true);
            webview.setAlwaysOnTop(true).then(console.log);
          });
          webview.once('tauri://error', function (e) {
          // an error happened creating the webview window
          });
      }}>
        <AddIcon fontSize='large' />
      </Button>
    </Box>
  );
}


