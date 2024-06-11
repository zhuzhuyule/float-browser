import Editor from 'jsoneditor';
import 'jsoneditor/dist/jsoneditor.css';

import { createSignal, onCleanup, onMount } from 'solid-js';
import { Box, Button } from '@suid/material';

export const JSONEditor = ({ value, onChange, isJson = true }: { isJson?: boolean; value?: Object | string; onChange?: (text: string) => void }) => {
  let ref: HTMLDivElement;

  let jsoneditor: Editor;
  onMount(() => {
    jsoneditor = isJson
      ? new Editor(ref, {
          modes: ['text', 'code', 'tree', 'form', 'view'],
          mode: 'form',
          mainMenuBar: true,
          navigationBar: false,
          onChangeText: text => {
            onChange?.(text);
          },
          onModeChange: (newMode, oldMode) => {
            if (['tree', 'form', 'view'].includes(newMode)) {
              jsoneditor.expandAll();
            }
          }
        })
      : new Editor(ref, {
          modes: ['text', 'code'],
          mode: 'code',
          mainMenuBar: false,
          navigationBar: false,
          onValidate: () => [],
          onChangeText: text => {
            onChange?.(text);
          }
        });
    typeof value === 'string' ? jsoneditor.setText(value) : jsoneditor.set(value || {});
  });

  onCleanup(() => {
    jsoneditor?.destroy();
  });

  return (
    <Box sx={{ width: '100%', height: '80vh', position: 'relative' }}>
      <Box height={'100%'} ref={ref!} />
    </Box>
  );
};
