import { appWindow } from '@tauri-apps/api/window';
import { Browser } from './components/browser/Browser';
import { Main } from './components/main/Main';

export default function App() {
  if (appWindow.label === 'main') {
    return <Main />;
  }

  if (appWindow.label.endsWith('_bar')) {
    return <Browser />;
  }

  return null;
}
