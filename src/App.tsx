
import { appWindow } from '@tauri-apps/api/window';
import { Browser } from './components/Browser';
import { Main } from './components/Main';
import { listen } from '@tauri-apps/api/event';


export default function App() {

  listen('webview-loaded', console.log)

  if (appWindow.label === 'main') {
    return <Main />;
  }

  if (appWindow.label.endsWith('_bar')) {
    return <Browser />;
  }

  return  null;
}


