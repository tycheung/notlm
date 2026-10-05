# @notlm/react

React host chrome for NotLM: provider, FAB chat, command palette, checklist, spotlight, and optional headless entry.

Pack NLU stays the default (sync replies). When you wire `fallbackLlm`, the UI supports thinking / streaming / threads (see hybrid docs).

## Install

```bash
npm install @notlm/react @notlm/core
# peer: react >= 18, react-dom >= 18
```

## Recommended: `NotLMHost`

`NotLMHost` already wraps `NotLMProvider` and mounts chrome. Do **not** nest both.

```tsx
import { NotLMHost, NOTLM_CSS } from '@notlm/react';

// once at app boot
if (typeof document !== 'undefined' && !document.getElementById('notlm-css')) {
  const el = document.createElement('style');
  el.id = 'notlm-css';
  el.textContent = NOTLM_CSS;
  document.head.appendChild(el);
}

<NotLMHost
  pack={pack}
  getContext={getContext}
  navigate={navigate}
  features={{ chat: true, palette: true, spotlight: true }}
>
  <App />
</NotLMHost>
```

## Headless (no FAB)

```ts
import { NotLMProvider, useNotLM } from '@notlm/react/headless';
```

## Styles

```ts
import { NOTLM_CSS, appearanceToCssVars } from '@notlm/react/styles';
// or from '@notlm/react'
```

Theming: CSS variables (`--notlm-*`), `appearance` prop, optional `classNames` / `components` slots (ADR-007).

## License

MIT
