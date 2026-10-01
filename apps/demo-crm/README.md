# @uipilot/demo-crm

Minimal second host proving `@uipilot/core` + `@uipilot/react` portability.

## Invariant

The assistant **never POSTs** and never calls product APIs. Steps resolve to `.click()` on
`data-guide-id` buttons (`guide-add-contact`, `guide-save-contact`). Contacts live in
`useState` only.

## Run

From the workspace root:

```bash
npm run build -w @uipilot/core
npm run build -w @uipilot/react
npm run dev -w @uipilot/demo-crm
```

Pack: `packs/demo-crm/.uipilot/` (validated in CI). Host uses `openModal` + `useGuideModal` for `contact_draft`.
