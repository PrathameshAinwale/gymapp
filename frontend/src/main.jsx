import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import './index.css'
import App from './App.jsx'

// Automatically handle and recover from stale/outdated chunks following a new production deployment
const recoverStaleChunk = () => {
  try {
    const lastReload = sessionStorage.getItem('chunk_reload_ts');
    const now = Date.now();
    if (!lastReload || (now - parseInt(lastReload, 10)) > 10000) {
      sessionStorage.setItem('chunk_reload_ts', String(now));
      const url = new URL(window.location.href);
      url.searchParams.set('_cv', String(now));
      window.location.replace(url.toString());
    }
  } catch (_) {
    window.location.reload();
  }
};

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  recoverStaleChunk();
});

window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (
    msg.includes('Failed to load module script') ||
    msg.includes('Expected a JavaScript-or-Wasm module script') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module')
  ) {
    recoverStaleChunk();
  }
});

// Prevent mouse wheel from unintentionally increasing/decreasing number inputs
document.addEventListener('wheel', () => {
  if (document.activeElement && document.activeElement.type === 'number') {
    document.activeElement.blur();
  }
}, { passive: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
