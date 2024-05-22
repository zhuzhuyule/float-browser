import { Box, Button } from '@suid/material';

import AddIcon from '@suid/icons-material/Add';
import { onCleanup } from 'solid-js';
import { createBrowser } from './utils/browser';
import { registerShortCut, unRegisterShortCut } from './utils/shortCut';

export function Main() {
  registerShortCut();
  onCleanup(unRegisterShortCut);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'space-between',
        flexWrap: 'wrap',
        '& > :not(style)': {
          m: 1,
          width: 128,
          height: 128
        }
      }}
    >
      <Button variant="outlined" onClick={createBrowser}>
        <AddIcon fontSize="large" />
      </Button>
    </Box>
  );
}
