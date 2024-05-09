
import { appWindow } from '@tauri-apps/api/window';
import { Browser } from './components/Browser';
import { Main } from './components/Main';


export default function App() {
  return appWindow.label === 'main' ? <Main /> : <Browser />;
}


