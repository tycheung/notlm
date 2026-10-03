# @notlm/demo-todo

Vite + React proof that `@notlm/react` drives the UI via **UI-actions only**
(optional coaching / guide-id pattern).

## Invariant

The assistant **never POSTs** and never calls product APIs. `NotLMHost` /
`executeStep` resolves navigation to a real `[data-guide-id]` button `.click()`.
Domain state changes only because those button handlers ran (`useState` — no `fetch`).

## Run

From the **notlm** workspace root (after `npm install` and building packages):

```bash
npm run build -w @notlm/core
npm run build -w @notlm/react
npm run dev -w @notlm/demo-todo
```

Or from this folder:

```bash
npm run dev
```

Pack JSON is loaded from `packs/demo-todo/.notlm/`.
Optional ONNX: ship prebuilt `pack/ranker.onnx` bytes into `createRankerSession`
(never synthesized at runtime).
