import Editor from 'jsoneditor';
import 'jsoneditor/dist/jsoneditor.css';

import { createSignal, onCleanup, onMount } from 'solid-js';
import { Box, Button } from '@suid/material';

export const JSONEditor = ({ value, onSave, onCancel, isJson = true }: { isJson?: boolean; value?: Object | string; onCancel?: () => void; onSave?: (text: string) => void }) => {
  const [text, setText] = createSignal('');
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
            setText(text);
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
            setText(text);
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
      <Box sx={{ position: 'absolute', top: 40, right: 18, display: 'flex', gap: '6px' }}>
        {text() && (
          <Button variant="contained" size="small" onClick={() => onSave?.(text())}>
            修改
          </Button>
        )}
        <Button variant="outlined" size="small" sx={{ background: 'white' }} onClick={onCancel}>
          取消
        </Button>
      </Box>
    </Box>
  );
};
