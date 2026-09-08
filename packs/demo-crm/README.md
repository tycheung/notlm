# demo-crm pack

Folder pack for `apps/demo-crm`. Same `.uipilot/pack/` shapes as `demo-todo`.

```bash
npm run uipilotCLI -- validate packs/demo-crm
npm run uipilotCLI -- intents check packs/demo-crm
```

Host loads JSON via `apps/demo-crm/src/loadDemoPack.ts` (Vite JSON imports).
`controls.json` includes `openModal: "contact_draft"` — Host wires `useGuideModal`.
