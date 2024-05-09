import { createSignal, onCleanup, onMount } from "solid-js";

import { PhysicalPosition, WebviewWindow, appWindow } from '@tauri-apps/api/window';

import { Box, IconButton,Button, Paper } from "@suid/material";

import AddCircleOutlineOutlined from "@suid/icons-material/AddCircleOutlineOutlined";
// const pos = await appWindow.outerPosition()
// const webview = new WebviewWindow('my-label', {
//   url: 'https://tauri.app/zh-cn/v1/api/js/window#webviewwindow',
//   // decorations: false,
//   x: pos.x,
//   y: pos.y + 100,
// });
// webview.once('tauri://created', function () {
// // webview window successfully created
// appWindow.setAlwaysOnTop(true);
// webview.setAlwaysOnTop(true).then(console.log);

// });
// webview.once('tauri://error', function (e) {
// // an error happened creating the webview window
// });

// webview.listen('content-loaded', function (e) {
//   console.log('content-loaded', e);
// })
  

function App() {
  const [greetMsg, setGreetMsg] = createSignal("");
  const [name, setName] = createSignal("");

  // appWindow.startDragging().then(console.log);

  // const unlisten =  appWindow.onMoved(({ payload: position }) => {
  //   webview.setPosition(new PhysicalPosition(position.x, position.y + 50));
  //  });

  //  onCleanup(async () => {
  //   (await unlisten)()
  //  })


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
      <Paper >

      <IconButton aria-label="delete"  color="primary">
        <AddCircleOutlineOutlined />
      </IconButton>
      </Paper>
    </Box>
  );
}

export default App;
