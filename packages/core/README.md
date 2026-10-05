# @notlm/core

Portable NotLM runtime: pack types, utterance dispatch, FAQ/catalog NLU,
miss/conversation logging, and optional Laya/LLM decision fallback.

## Install

```bash
npm install @notlm/core
```

## Entry points

| Import | Use when |
|--------|----------|
| `@notlm/core` | Browser / SPA runtime (dispatch, types, miss log, fallback helpers) |
| `@notlm/core/loadFolder` | Node-only FS loader for `.notlm/` homes |
| `@notlm/core/internal` | Advanced shards — prefer not to depend on these from hosts |

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

Pack JSON is **host-owned**. For React chrome, use [`@notlm/react`](https://www.npmjs.com/package/@notlm/react).
Pack authoring guide (repo): [PACK_COOKBOOK.md](https://github.com/tycheung/notlm/blob/main/docs/PACK_COOKBOOK.md).

## License

MIT
