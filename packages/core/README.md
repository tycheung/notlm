# @notlm/core

Portable NotLM runtime: pack types, utterance dispatch, FAQ/catalog NLU, miss/conversation logging, and optional Laya/LLM decision fallback.

## Install

```bash
npm install @notlm/core
```

## Entry points

| Import | Use when |
|--------|----------|
| `@notlm/core` | Browser / SPA runtime (dispatch, types, miss log, fallback helpers) |
| `@notlm/core/loadFolder` | Node-only FS loader for `.notlm/` homes |
| `@notlm/core/internal` | Advanced shards (dispatchParsed, heuristicsDefaults) — prefer not to depend on these from hosts |

## Quick start

```ts
import { dispatchUserUtterance, loadPack } from '@notlm/core';

const pack = loadPack(packJson);
dispatchUserUtterance({
  text: 'open settings',
  pack,
  session,
  ctx: { pathname: '/', data: {} },
  pushAssistant,
  executeStep,
  setSession,
});
```

Pack JSON is host-owned. See the repo [`docs/PACK_COOKBOOK.md`](../../docs/PACK_COOKBOOK.md).

## License

MIT
