# @notlm/demo

Third-host proof (`demo-hello` pack). Minimal Vite host wiring `NotLMHost` +
`data-guide-id` + `notifyStepCompleted` — same pattern as demo-todo / demo-crm.

```bash
npm run build -w @notlm/core -w @notlm/react
npm run dev -w @notlm/demo
```

Pack: `packs/demo-hello/.notlm/`. Coach telemetry: `onCoachEvent` is wired in
`App.tsx` for host debugging.
