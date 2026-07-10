import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';

window.addEventListener('error', (e) => {
  document.body.innerHTML = `<div style="color:red;padding:20px;font-family:sans-serif;"><h1>Runtime Error</h1><pre>${e.error?.stack || e.message}</pre></div>`;
});
window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML = `<div style="color:red;padding:20px;font-family:sans-serif;"><h1>Promise Rejection</h1><pre>${e.reason?.stack || e.reason}</pre></div>`;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
