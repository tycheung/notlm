# React host guide

## Install (when published)

```bash
npm install @notlm/react @notlm/core
```

Until public publish, consume from this monorepo workspaces / `file:` links.

## Host vs Provider

Use **`NotLMHost`** — it wraps `NotLMProvider` and mounts FAB / palette /
checklist / spotlight. Do not nest both.

```tsx
import { NotLMHost, NOTLM_CSS } from '@notlm/react';

// inject CSS once
```

Headless (no chrome):

```ts
import { NotLMProvider, useNotLM } from '@notlm/react/headless';
```

Styles only:

```ts
import { NOTLM_CSS, appearanceToCssVars } from '@notlm/react/styles';
```

## Theming (ADR-007)

1. Global CSS overrides on `.notlm-*` classes  
2. `appearance` / CSS vars (`scheme: 'light' | 'dark' | 'auto'`)  
3. `classNames` + `components` slots  

All chrome copy should go through `labels` (`thinking`, `composerPlaceholder`,
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

## Threads

Default on (`features.threads !== false`). `newThread` / `selectThread` swap
in-memory transcripts keyed by conversation id.
