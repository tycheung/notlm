# Security

## Secrets

- Never commit `.env` files with real credentials.
- Demo/e2e credentials via env only.
- Do not log tokens, passwords, or raw auth headers.

## Assistant safety

- **UI-actions only (ADR-003):** Always press/simulate real user controls. **Never** call host product APIs from the coach to create/update/delete domain entities.
- Mutations occur only through the host UI’s normal handlers (forms, buttons, confirms).
- **No audio upload** / Whisper / cloud STT in v1 — reduces exfiltration surface.
- Coach may only highlight/activate elements with declared guide ids.

## Build-time LLM authoring

- Allowed **only** in `@uipilot/author` / CLI — never in runtime `core` / Host dispatch.
- **BYO credentials:** `UIPILOT_LLM_API_KEY`, `UIPILOT_LLM_BASE_URL`, `UIPILOT_LLM_MODEL`, `UIPILOT_LLM_PROVIDER` (or local config file gitignored).
- Support **Ollama** and **OpenAI-compatible** self-host endpoints (LM Studio, vLLM, LocalAI, etc.).
- Do not commit keys; do not log raw API keys or full prompts that may contain secrets.
- Redact `.env`, private keys, and obvious secret patterns before sending source excerpts to a model.
- Prefer local Ollama when code must not leave the machine; document that cloud BYO implies data leaves the host.
- Host **learnings/config** live under `.uipilot/` (JSON). Do not store API keys there; use env or gitignored `*.local.json`.

## Reporting

Report vulnerabilities privately to the repo maintainers. Do not file public issues with exploit details until a fix is available.

## Production checklist (hosts)

- [ ] Feature flags reviewed (voice off if policy requires)
- [ ] Pack completeness binders cannot be spoofed by the client alone for authorization (server still enforces authz)
- [ ] Guide ids do not expose sensitive internal identifiers in public pages unintentionally
