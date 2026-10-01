# @uipilot/demo-todo

Vite + React proof that `@uipilot/react` drives the UI via **UI-actions only**
(optional coaching / guide-id pattern).

## Invariant

The assistant **never POSTs** and never calls product APIs. `UiPilotHost` /
`executeStep` resolves navigation to a real `[data-guide-id]` button `.click()`.
Domain state changes only because those button handlers ran (`useState` — no `fetch`).

## Run

From the **uipilot** workspace root (after `npm install` and building packages):

```bash
npm run build -w @uipilot/core
npm run build -w @uipilot/react
npm run dev -w @uipilot/demo-todo
```

Or from this folder:

```bash
npm run dev
```

Pack JSON is loaded from `packs/demo-todo/.uipilot/`.
Optional ONNX: ship prebuilt `pack/ranker.onnx` bytes into `createRankerSession`
(never synthesized at runtime).
