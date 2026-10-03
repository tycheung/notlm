# @notlm/demo-crm

Minimal second host proving `@notlm/core` + `@notlm/react` portability.

## Invariant

The assistant **never POSTs** and never calls product APIs. Steps resolve to `.click()` on
`data-guide-id` buttons (`guide-add-contact`, `guide-save-contact`). Contacts live in
`useState` only.

## Run

From the workspace root:

```bash
npm run build -w @notlm/core
npm run build -w @notlm/react
npm run dev -w @notlm/demo-crm
```

Pack: `packs/demo-crm/.notlm/` (validated in CI). Host uses `openModal` + `useGuideModal` for `contact_draft`.
