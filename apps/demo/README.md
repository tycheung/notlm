# @uipilot/demo

Third-host proof (`demo-hello` pack). Minimal Vite host wiring `UiPilotHost` +
`data-guide-id` + `notifyStepCompleted` — same pattern as demo-todo / demo-crm.

```bash
npm run build -w @uipilot/core -w @uipilot/react
npm run dev -w @uipilot/demo
```

Pack: `packs/demo-hello/.uipilot/`. Coach telemetry: `onCoachEvent` is wired in
`App.tsx` for host debugging.
