import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.jsx';

/* Register service worker — auto-updates silently */
registerSW({
  onNeedRefresh() {
    // A new version of the app is available — auto-reload
    console.info('[PWA] New content available, reloading…');
  },
  onOfflineReady() {
    console.info('[PWA] App ready to work offline.');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
