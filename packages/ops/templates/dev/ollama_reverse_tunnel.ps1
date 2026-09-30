# Ollama reverse tunnel for Victory Bowling API
#
# Exposes your local Ollama (default :11434) on the API EC2 loopback as :11435
# so the FastAPI host can use:
#   UIPILOT_LLM_PROVIDER=ollama
#   UIPILOT_LLM_MODEL=<your model>
#   UIPILOT_LLM_BASE_URL=http://127.0.0.1:11435
#
# Prerequisites:
#   - Ollama running locally (`ollama serve`, model pulled)
#   - SSH access to the API host (or use AWS SSM port-forward equivalent)
#
# Usage:
#   .\scripts\uipilot\ollama_reverse_tunnel.ps1 -SshTarget ec2-user@api.example.com
#   .\scripts\uipilot\ollama_reverse_tunnel.ps1 -SshTarget ec2-user@… -RemotePort 11435 -LocalPort 11434
#
# Keep this process running while testing. Admin → System Settings → enable
# "Director Assistant LLM Fallback (Ollama)" and confirm status Connected.

param(
  [Parameter(Mandatory = $true)]
  [string]$SshTarget,

  [int]$LocalPort = 11434,
  [int]$RemotePort = 11435,

  [string]$SshArgs = ""
)

$ErrorActionPreference = "Stop"

Write-Host "[ollama-tunnel] Local Ollama expected at 127.0.0.1:$LocalPort"
Write-Host "[ollama-tunnel] Reverse-binding on remote 127.0.0.1:$RemotePort"
Write-Host "[ollama-tunnel] SSH target: $SshTarget"
Write-Host "[ollama-tunnel] Leave this window open while using LLM fallback."

$sshCmd = @(
  "-N",
  "-R", "127.0.0.1:${RemotePort}:127.0.0.1:${LocalPort}",
  $SshTarget
)

if ($SshArgs.Trim()) {
  $extra = $SshArgs.Trim() -split '\s+'
  $sshCmd = $extra + $sshCmd
}

& ssh @sshCmd
