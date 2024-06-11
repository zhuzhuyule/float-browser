import { ListItem, Box, ListItemButton, Typography, Chip, Button, ToggleButtonGroup, ToggleButton, Select, MenuItem } from '@suid/material';
import { parseURL } from '../../../util';
import { createMemo, createSignal } from 'solid-js';
import { JSONEditor } from './JSONEditor';

export const APIItem = (props: { index: number; item: { url: string; method: string; status: Record<string, any> }; active: boolean; onClick: (index: number | null) => void }) => {
  const [text, setText] = createSignal('');
  const api = parseURL(props.item.url);

  const statuses = createMemo(() => Object.keys(props.item.status).sort());
  const [status, setStatus] = createSignal(statuses()[0]);

  const names = createMemo(() => Object.keys(props.item.status[status()]).sort());
  const [selectName, setSelectName] = createSignal(names()[0]);

  const ty = props.item.status[status()]?.[selectName()]?.header?.['content-type']?.replace(/application\/([^;]+).*$/, '$1') || '';
  return (
    <ListItem disablePadding sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start', background: props.active ? '#33333322' : 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', paddingRight: '12px', boxSizing: 'border-box' }}>
        <ListItemButton
          sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'start' }}
          onClick={() => {
            if (props.active) {
              props.onClick(null);
            } else {
              props.onClick(props.index);
            }
          }}
        >
          <Typography variant="subtitle1" color="grey" sx={{}}>
            <Typography variant="subtitle2" color="#0fa52b" component={'span'}>
              [{props.item.method}]
            </Typography>
            {decodeURIComponent(api.pathname)}
            <Typography variant="subtitle2" color={/2\d+/.test(status()) ? '#0fa52b' : '#d82a2a'} component={'span'}>
              [{status()}]
            </Typography>
          </Typography>
          <Typography variant="subtitle2" color="#33333366" sx={{}}>
            {decodeURIComponent(api.search)}
          </Typography>
        </ListItemButton>
        <Chip size="small" label={ty} />
      </Box>
      {props.active && (
        <>
          <Box sx={{ display: 'flex', gap: '6px', p: '6px', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
            <Box sx={{ display: 'flex', gap: '6px' }}>
              <ToggleButtonGroup
                color="primary"
                size="small"
                value={status()}
                exclusive
                onChange={(event, newAlignment) => {
                  if (newAlignment) setStatus(newAlignment);
                }}
              >
                {statuses().map(status => (
                  <ToggleButton value={status}>{status}</ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Select value={selectName()} onChange={val => setSelectName(val.target.value)} size="small">
                {names().map(name => (
                  <MenuItem value={name}>{name === '_' ? 'default' : name}</MenuItem>
                ))}
              </Select>
            </Box>
            <Box>
              {text() && (
                <Button variant="contained" size="small" onClick={() => {}}>
                  修改
                </Button>
              )}
              <Button variant="outlined" size="small" sx={{ ml: '6px', background: 'white' }} onClick={() => props.onClick(null)}>
                取消
              </Button>
            </Box>
          </Box>
          <JSONEditor value={props.item.status?.[status()]?.[selectName()]?.response || {}} isJson={ty.toLowerCase() === 'json'} onChange={txt => setText(txt)} />
        </>
      )}
    </ListItem>
  );
};
