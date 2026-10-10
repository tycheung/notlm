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

## Semantic retrieve

Hashed char n-gram index over pack FAQ/query texts (no cloud). High similarity +
token-overlap bar auto-answers; otherwise top‑k ids constrain Laya/LLM.

| Artifact | Who writes | Overwrite? |
|----------|------------|------------|
| `pack/semantic-index.json` | `notlm-training pack embed-index` from FAQ/queries | Yes — regenerable **base** |
| `pack/semantic-index.custom.json` | Host / miss-cluster training | **Never** by embed-index |

Pass both into `loadPackFromJson({ semanticIndex, semanticIndexCustom })`. Dispatch
scores **layers together** at live time (`retrieveSemantic(text, layers)`); best
match per id wins. Constants: `SEMANTIC_INDEX_BASE_FILE`, `SEMANTIC_INDEX_CUSTOM_FILE`.

## License

MIT
