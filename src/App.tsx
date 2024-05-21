import { appWindow } from '@tauri-apps/api/window';
import { Browser } from './components/Browser';
import { Main } from './components/Main';

export default function App() {
  if (appWindow.label === 'main') {
    return <Main />;
  }

  if (appWindow.label.endsWith('_bar')) {
    return <Browser />;
  }

  return null;
}
