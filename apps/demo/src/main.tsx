import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { NOTLM_CSS } from '@notlm/react';
import { App } from './App';
import './styles.css';

function injectCss() {
  if (document.getElementById('notlm-css')) return;
  const style = document.createElement('style');
  style.id = 'notlm-css';
  style.textContent = NOTLM_CSS;
  document.head.appendChild(style);
}

function Root() {
  useEffect(() => {
    injectCss();
  }, []);
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
