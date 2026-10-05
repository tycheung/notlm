# React host guide

## Install

```bash
npm install @notlm/react @notlm/core
```

In this monorepo, consume via workspaces / `file:` links until packages are published.

## Host vs Provider

Use **`NotLMHost`** — it wraps `NotLMProvider` and mounts FAB / palette /
checklist / spotlight. Do not nest both.

```tsx
import { NotLMHost, NOTLM_CSS } from '@notlm/react';

// Inject NOTLM_CSS once at app boot (see package README).
```

Headless (no chrome):

```ts
import { NotLMProvider, useNotLM } from '@notlm/react/headless';
```

Styles only:

```ts
import { NOTLM_CSS, appearanceToCssVars } from '@notlm/react/styles';
```

## Theming

1. Global CSS overrides on `.notlm-*` classes
2. `appearance` / CSS vars (`scheme: 'light' | 'dark' | 'auto'`)
3. `classNames` + `components` slots

Route chrome copy through `labels` (`thinking`, `composerPlaceholder`,
`checklistTitle`, …).

## Streaming host adapter

```ts
fallbackLlm: async function* ({ text }) {
  yield 'Thinking about: ';
  yield text.slice(0, 20);
  yield { text: `Echo: ${text}`, proposed: { type: 'refuse' } };
}
```

Or return a plain `{ reply, proposed }` for non-stream Laya proxies.

## a11y checklist

- Chat panel: `role="dialog"` + `aria-modal` + focus trap + Escape closes
- Live region announces thinking / streaming / final assistant text
- Composer disables Send while `fallbackBusy`; Cancel aborts

See also [`PACK_COOKBOOK.md`](PACK_COOKBOOK.md) for pack + host wiring.
