import { lazy } from 'solid-js';
import { Router } from '@solidjs/router';

export default function App() {
  return (
    <Router>
      {[
        {
          path: '/main',
          component: lazy(() => import('./components/main/Main'))
        },
        {
          path: '/browser-bar',
          component: lazy(() => import('./components/browser/Browser'))
        },
        {
          path: '/browser-request',
          component: lazy(() => import('./components/browser/BrowserRequest'))
        },
        {
          path: '*empty',
          component: () => ''
        }
      ]}
    </Router>
  );
}
