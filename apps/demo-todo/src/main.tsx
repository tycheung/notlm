import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { UIPILOT_CSS } from '@uipilot/react';
import { App } from './App';
import './styles.css';

function injectWaCss() {
  if (document.getElementById('uipilot-css')) return;
  const style = document.createElement('style');
  style.id = 'uipilot-css';
  style.textContent = UIPILOT_CSS;
  document.head.appendChild(style);
}

function Root() {
  useEffect(() => {
    injectWaCss();
  }, []);
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
