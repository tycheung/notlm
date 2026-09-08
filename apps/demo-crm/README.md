# @uipilot/demo-crm

Minimal second host proving `@uipilot/core` + `@uipilot/react` portability.

## Invariant

The coach **never POSTs** and never calls product APIs. Steps resolve to `.click()` on
`data-guide-id` buttons (`guide-add-contact`, `guide-save-contact`). Contacts live in
`useState` only.

## Run

From the `assistant/` workspace root:

```bash
npm run build -w @uipilot/core
npm run build -w @uipilot/react
npm run dev -w @uipilot/demo-crm
```

Or from this folder: `npm run dev`.
