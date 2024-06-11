import { ListItem, Box, ListItemButton, Typography, Chip } from '@suid/material';
import { parseURL } from '../../../util';
import { createMemo } from 'solid-js';
import { JSONEditor } from './JSONEditor';

export const APIItem = (props: { index: number; item: { url: string; method: string; content: Record<string, any> }; active: boolean; onClick: (index: number | null) => void }) => {
  const active = createMemo(() => props.active);

  const info = parseURL(props.item.url);
  const statuses = Object.keys(props.item.content).sort();

  const status = statuses[0];

  const res = props.item.content[status]._;

  console.log(active(), res);

  const ty = res?.header?.['content-type']?.replace(/application\/([^;]+).*$/, '$1') || '';
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
            {decodeURIComponent(info.pathname)}
            <Typography variant="subtitle2" color={/2\d+/.test(status) ? '#0fa52b' : '#d82a2a'} component={'span'}>
              [{status}]
            </Typography>
          </Typography>
          <Typography variant="subtitle2" color="#33333366" sx={{}}>
            {decodeURIComponent(info.search)}
          </Typography>
        </ListItemButton>
        <Chip size="small" label={ty} />
      </Box>
      {props.active && (
        <JSONEditor
          value={res.response || {}}
          isJson={ty.toLowerCase() === 'json'}
          onCancel={() => props.onClick(null)}
          onSave={text => {
            // store[parseURL(browserInfo().url).host].set('');
          }}
        />
      )}
    </ListItem>
  );
};
