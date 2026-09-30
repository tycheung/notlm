# UiPilot local LLM / Ollama helpers

Canonical scripts for host developers who run Ollama locally and optionally
reverse-tunnel it to an API host for UiPilot secondary LLM fallback.

| Script | Role |
|--------|------|
| `ollama_local_control.ps1` | start/stop/status for Ollama + tunnel |
| `ollama_reverse_tunnel.ps1` | SSH reverse tunnel helper |

Copy into your host `scripts/uipilot/` (or run from this folder).

```powershell
.\ollama_local_control.ps1 status
.\ollama_local_control.ps1 start -SshTarget user@api-host
```

Env:

- `UIPILOT_OLLAMA_SSH_TARGET` — default SSH target
- `UIPILOT_LLM_MODEL` — informational in status
- On the API host: `UIPILOT_LLM_PROVIDER=ollama`, `UIPILOT_LLM_BASE_URL=http://127.0.0.1:11435`
