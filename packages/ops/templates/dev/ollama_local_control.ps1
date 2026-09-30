# Local Ollama + reverse-tunnel control for UiPilot LLM beta.
#
# Source of truth: uipilot/packages/ops/templates/dev/ollama_local_control.ps1
# Hosts keep a deploy copy under scripts/uipilot/.
#
# This only controls YOUR PC side (Ollama + optional SSH reverse tunnel).
# The host app still needs:
#   1) Admin setting enabling UiPilot LLM fallback = ON
#   2) API host env: UIPILOT_LLM_PROVIDER=ollama, UIPILOT_LLM_MODEL=...,
#      UIPILOT_LLM_BASE_URL=http://127.0.0.1:11435
#
# Usage:
#   .\ollama_local_control.ps1 status
#   .\ollama_local_control.ps1 start
#   .\ollama_local_control.ps1 start -SshTarget user@api-host
#   .\ollama_local_control.ps1 stop
#   .\ollama_local_control.ps1 stop -StopOllama
#
# Optional env:
#   UIPILOT_OLLAMA_SSH_TARGET   default SSH target for start (tunnel)
#   UIPILOT_LLM_MODEL           shown in status (informational)

param(
  [Parameter(Position = 0)]
  [ValidateSet("status", "start", "stop")]
  [string]$Action = "status",

  [string]$SshTarget = $env:UIPILOT_OLLAMA_SSH_TARGET,

  [int]$LocalPort = 11434,
  [int]$RemotePort = 11435,

  # On stop: also quit the Ollama Windows app (default: leave Ollama running)
  [switch]$StopOllama
)

$ErrorActionPreference = "Continue"
$TunnelScript = Join-Path $PSScriptRoot "ollama_reverse_tunnel.ps1"
$PidFile = Join-Path $env:TEMP "vb-ollama-tunnel.pid"

function Test-Ollama {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$LocalPort/api/tags" -UseBasicParsing -TimeoutSec 3
    return $r.StatusCode -ge 200 -and $r.StatusCode -lt 300
  } catch {
    return $false
  }
}

function Get-TunnelPid {
  if (Test-Path $PidFile) {
    $raw = (Get-Content $PidFile -Raw).Trim()
    if ($raw -match '^\d+$') { return [int]$raw }
  }
  return $null
}

function Show-Status {
  $ollamaUp = Test-Ollama
  Write-Host ""
  Write-Host "=== Local Ollama / tunnel ==="
  Write-Host ("Ollama 127.0.0.1:{0}: {1}" -f $LocalPort, $(if ($ollamaUp) { "UP" } else { "DOWN" }))
  if ($ollamaUp) {
    try {
      $json = (Invoke-WebRequest -Uri "http://127.0.0.1:$LocalPort/api/tags" -UseBasicParsing -TimeoutSec 3).Content | ConvertFrom-Json
      $names = @($json.models | ForEach-Object { $_.name })
      if ($names.Count) {
        Write-Host ("Models: {0}" -f ($names -join ", "))
      }
    } catch {}
  }

  $tpid = Get-TunnelPid
  $tunnelAlive = $false
  if ($tpid) {
    $proc = Get-Process -Id $tpid -ErrorAction SilentlyContinue
    $tunnelAlive = $null -ne $proc
  }
  Write-Host ("Tunnel pid file: {0}" -f $(if ($tpid) { $tpid } else { "(none)" }))
  Write-Host ("Tunnel process:  {0}" -f $(if ($tunnelAlive) { "RUNNING" } else { "stopped" }))
  Write-Host ("Note: remote bind :{0} is on the API host (not visible from this PC)." -f $RemotePort)
  Write-Host ""
  Write-Host "=== App gates (not controlled here) ==="
  Write-Host "Admin flag director_assistant_llm_fallback - toggle in System Settings"
  Write-Host "API UIPILOT_LLM_* must point at http://127.0.0.1:$RemotePort on the API host"
  Write-Host ""
  if (-not $ollamaUp) {
    Write-Host "Hint: run  .\ollama_local_control.ps1 start"
  } elseif (-not $tunnelAlive -and -not $SshTarget) {
    Write-Host "Hint: Ollama is up. To tunnel to VB API:"
    Write-Host "  .\ollama_local_control.ps1 start -SshTarget ec2-user@<api-host>"
  }
}

function Start-OllamaLocal {
  if (Test-Ollama) {
    Write-Host "Ollama already UP on :$LocalPort"
  } else {
    Write-Host "Starting Ollama..."
    $ollamaExe = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"
    if (Test-Path $ollamaExe) {
      Start-Process -FilePath $ollamaExe -WindowStyle Hidden
    } elseif (Get-Command ollama -ErrorAction SilentlyContinue) {
      Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    } else {
      Write-Error "Ollama not found. Install from https://ollama.com"
      exit 1
    }
    for ($i = 0; $i -lt 30; $i++) {
      Start-Sleep -Seconds 1
      if (Test-Ollama) { break }
    }
    if (-not (Test-Ollama)) {
      Write-Error "Ollama did not become ready on :$LocalPort"
      exit 1
    }
    Write-Host "Ollama UP"
  }

  if (-not $SshTarget) {
    Write-Host "No -SshTarget / UIPILOT_OLLAMA_SSH_TARGET - skipping reverse tunnel."
    Write-Host "Admin LLM toggle still needed on VB to use this machine."
    return
  }

  $existing = Get-TunnelPid
  if ($existing -and (Get-Process -Id $existing -ErrorAction SilentlyContinue)) {
    Write-Host "Tunnel already running (pid $existing)"
    return
  }

  Write-Host "Starting reverse tunnel -> $SshTarget (remote :$RemotePort -> local :$LocalPort)"
  if (-not (Test-Path $TunnelScript)) {
    Write-Error "Missing $TunnelScript"
    exit 1
  }
  $proc = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $TunnelScript,
    "-SshTarget", $SshTarget, "-LocalPort", "$LocalPort", "-RemotePort", "$RemotePort"
  ) -PassThru -WindowStyle Minimized
  Set-Content -Path $PidFile -Value $proc.Id -Encoding ascii
  Write-Host "Tunnel started (pid $($proc.Id)). Keep that process alive while testing."
  Write-Host "Then: Admin -> enable Director Assistant LLM Fallback (Ollama)."
}

function Stop-Local {
  $tpid = Get-TunnelPid
  if ($tpid) {
    $proc = Get-Process -Id $tpid -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Host "Stopping tunnel pid $tpid"
      Stop-Process -Id $tpid -Force -ErrorAction SilentlyContinue
      Get-CimInstance Win32_Process -Filter "ParentProcessId=$tpid" -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  } else {
    Write-Host "No tunnel pid file - nothing to stop for tunnel."
  }

  if ($StopOllama) {
    Write-Host "Stopping Ollama app..."
    Get-Process -Name "ollama","Ollama" -ErrorAction SilentlyContinue |
      Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    if (Test-Ollama) {
      Write-Host "Warning: Ollama still responding on :$LocalPort"
    } else {
      Write-Host "Ollama stopped"
    }
  } else {
    Write-Host "Left Ollama running (pass -StopOllama to quit it)."
  }
}

switch ($Action) {
  "status" { Show-Status }
  "start"  { Start-OllamaLocal; Show-Status }
  "stop"   { Stop-Local; Show-Status }
}
