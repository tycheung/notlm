# Security

## Secrets

- Never commit `.env` files with real credentials.
- Demo/e2e credentials via env only.
- Do not log tokens, passwords, or raw auth headers.

## Assistant safety

- **UI-actions only:** Always press/simulate real user controls. **Never** call host product APIs from the coach to create/update/delete domain entities.
- Mutations occur only through the host UI’s normal handlers (forms, buttons, confirms).
- **No audio upload** / Whisper / cloud STT in v1 — reduces exfiltration surface.
- Coach may only highlight/activate elements with declared guide ids.

## Build-time LLM authoring

- **Out of scope for this repo.** Never in runtime `core` / Host dispatch / thin `uipilotCLI`.
- Host **learnings/config** live under `.uipilot/` (JSON). Do not store API keys there.
- Host BYO Learning Mode proxies must keep provider credentials server-side.

## Reporting

Report vulnerabilities privately to the repo maintainers. Do not file public issues with exploit details until a fix is available.

## Production checklist (hosts)

- [ ] Feature flags reviewed (voice off if policy requires)
- [ ] Pack completeness binders cannot be spoofed by the client alone for authorization (server still enforces authz)
- [ ] Guide ids do not expose sensitive internal identifiers in public pages unintentionally
