# Security

## Secrets

- Never commit `.env` files with real credentials.
- Demo/e2e credentials via env only.
- Do not log tokens, passwords, or raw auth headers.

## Assistant safety

- **No silent writes** from the coach. Navigation + coaching + prefill only; host save paths mutate data.
- **No audio upload** / Whisper / cloud STT in v1 — reduces exfiltration surface.
- Coach may only highlight elements with declared guide ids.

## Reporting

Report vulnerabilities privately to the repo maintainers. Do not file public issues with exploit details until a fix is available.

## Production checklist (hosts)

- [ ] Feature flags reviewed (voice off if policy requires)
- [ ] Pack completeness binders cannot be spoofed by the client alone for authorization (server still enforces authz)
- [ ] Guide ids do not expose sensitive internal identifiers in public pages unintentionally
