import { createSignal } from "solid-js";


import { Box, TextField, Button } from "@suid/material";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
} from "@codesandbox/sandpack-react";

export  function Browser() {
  const [url, setUrl] = createSignal("about:blank");
  const [value, setValue] = createSignal("");

  return (
    <Box sx={{
      p:0,
      m:0,
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
    }}>
      <Box sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <TextField sx={{flex: 1}} size="small" value={value()} onChange={(e) => setValue(e.target.value)} />
        <Button onClick={() => setUrl(value())} >Go</Button>
      </Box>
      <iframe 
        src={url()}
        style={{
          width: "100%",
          flex: 1,
          border: "none",
          margin: 0,
          padding: 0
        }} 
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts allow-downloads allow-pointer-lock" 
        allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; clipboard-write;" 
         ></iframe>
    </Box>
  );
}


