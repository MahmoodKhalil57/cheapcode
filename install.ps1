# cheapcode installer — PowerShell installer for Windows.
#
# Usage (one copy-pasteable command for non-technical Windows users):
#   irm https://raw.githubusercontent.com/MahmoodKhalil57/cheapcode/main/install.ps1 | iex
#
# Then in a NEW PowerShell window:
#   cheapcode web
#
# What it does (mirrors install.sh):
#   1. detects platform (windows + arch)
#   2. checks for opencode (installs via official opencode PowerShell installer if missing)
#   3. checks for bun (installs via official bun PowerShell installer if missing)
#   4. clones cheapcode to ~/.cheapcode/lib (or symlinks if CHEAPCODE_SOURCE set)
#   5. creates .cmd shims at ~/.cheapcode/bin (Windows alternative to symlinks —
#      no admin/Developer-Mode requirement)
#   6. registers cheapcode provider + cheapcode-accounts MCP server in
#      ~/.config/opencode/opencode.json (additive)
#   7. creates default ~/.config/cheapcode/accounts.json (empty registry)
#   8. adds ~/.cheapcode/bin to user PATH (persistent via registry)
#
# Per memory project_credential_buckets.md: this installer never writes to
# auth.json directly. Providers must be added via `cheapcode providers login`
# which delegates to opencode's native flow.

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # silences slow Invoke-WebRequest progress bar

# ============================================================
# Output helpers
# ============================================================

function Write-Info  { param($msg) Write-Host "[cheapcode] $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "[cheapcode] $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "[cheapcode] $msg" -ForegroundColor Yellow }
function Write-Err   { param($msg) Write-Host "[cheapcode] $msg" -ForegroundColor Red }
function Die         { param($msg) Write-Err $msg; exit 1 }

# ============================================================
# Platform detection
# ============================================================

if (-not $IsWindows -and $PSVersionTable.PSVersion.Major -lt 6) {
    # PS 5.1 (Windows PowerShell) — IsWindows is unset; assume Windows
    $IsWindows = $true
}
if (-not $IsWindows) {
    Die "this PowerShell installer is for Windows only. for linux/macos use:`n  curl -fsSL https://raw.githubusercontent.com/MahmoodKhalil57/cheapcode/main/install.sh | sh"
}

$arch = if ([System.Environment]::Is64BitOperatingSystem) {
    if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "amd64" }
} else { "x86" }
Write-Info "platform: windows/$arch"

# ============================================================
# Source / paths
# ============================================================

$cheapcodeSource = $env:CHEAPCODE_SOURCE
$cheapcodeRepo   = if ($env:CHEAPCODE_REPO) { $env:CHEAPCODE_REPO } else { "https://github.com/MahmoodKhalil57/cheapcode.git" }
$cheapcodeHome   = if ($env:CHEAPCODE_HOME) { $env:CHEAPCODE_HOME } else { Join-Path $HOME ".cheapcode" }
$cheapcodeLib    = Join-Path $cheapcodeHome "lib"
$cheapcodeBin    = Join-Path $cheapcodeHome "bin"

# ============================================================
# Check + install opencode if missing
# ============================================================

if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
    Write-Warn "opencode not found in PATH; installing via official opencode installer..."
    try {
        Invoke-RestMethod -Uri "https://opencode.ai/install.ps1" | Invoke-Expression
    } catch {
        Die "opencode install failed: $_`ninstall manually from https://opencode.ai/download then re-run this installer."
    }
    # opencode installer typically puts it under $HOME\.opencode\bin or similar
    $opencodeBin = Join-Path $HOME ".opencode\bin"
    if (Test-Path $opencodeBin) {
        $env:Path = "$opencodeBin;$env:Path"
    }
    if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
        Die "opencode still not in PATH after install. open a NEW PowerShell window then re-run this installer."
    }
    Write-Ok "opencode installed: $(opencode --version 2>&1 | Select-Object -First 1)"
} else {
    Write-Ok "opencode found: $(opencode --version 2>&1 | Select-Object -First 1)"
}

# ============================================================
# Check + install bun if missing
# ============================================================

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Warn "bun not found in PATH; installing via official bun installer..."
    try {
        Invoke-RestMethod -Uri "https://bun.sh/install.ps1" | Invoke-Expression
    } catch {
        Die "bun install failed: $_`ninstall manually from https://bun.sh then re-run this installer."
    }
    $bunBin = Join-Path $HOME ".bun\bin"
    if (Test-Path $bunBin) {
        $env:Path = "$bunBin;$env:Path"
    }
    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        Die "bun still not in PATH after install. open a NEW PowerShell window then re-run this installer."
    }
    Write-Ok "bun installed: $(bun --version 2>&1 | Select-Object -First 1)"
} else {
    Write-Ok "bun found: $(bun --version 2>&1 | Select-Object -First 1)"
}

# ============================================================
# Place / fetch cheapcode source
# ============================================================

New-Item -Path $cheapcodeHome -ItemType Directory -Force | Out-Null
New-Item -Path $cheapcodeBin  -ItemType Directory -Force | Out-Null

if ($cheapcodeSource) {
    if (-not (Test-Path $cheapcodeSource)) {
        Die "CHEAPCODE_SOURCE directory does not exist: $cheapcodeSource"
    }
    Write-Info "linking lib from local source: $cheapcodeSource"
    if (Test-Path $cheapcodeLib) { Remove-Item -Path $cheapcodeLib -Recurse -Force }
    # Junction works without admin/Developer Mode; symlink would require it.
    cmd /c mklink /J "`"$cheapcodeLib`"" "`"$cheapcodeSource`"" | Out-Null
} else {
    if (Test-Path (Join-Path $cheapcodeLib ".git")) {
        Write-Info "updating cheapcode at $cheapcodeLib"
        try { git -C $cheapcodeLib pull --ff-only --quiet } catch { Write-Warn "git pull failed; continuing with existing checkout" }
    } else {
        if (Test-Path $cheapcodeLib) { Remove-Item -Path $cheapcodeLib -Recurse -Force }
        Write-Info "cloning cheapcode from $cheapcodeRepo"
        git clone --depth 1 --quiet $cheapcodeRepo $cheapcodeLib
        if ($LASTEXITCODE -ne 0) { Die "git clone failed (exit $LASTEXITCODE)" }
    }
    Write-Info "installing dependencies"
    Push-Location $cheapcodeLib
    try {
        bun install --silent
        if ($LASTEXITCODE -ne 0) { Die "bun install failed (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
}

# ============================================================
# .cmd shims (Windows alternative to bash symlinks)
# ============================================================

function Install-Shim {
    param($name, $target)
    $targetPath = Join-Path $cheapcodeLib $target
    if (-not (Test-Path $targetPath)) {
        Write-Warn "skipping $name`: $target not found in lib"
        return
    }
    $shimPath = Join-Path $cheapcodeBin "$name.cmd"
    # Note: %~dp0 expands to the shim's directory; we use absolute paths so the
    # shim can be invoked from any cwd. Bun is required on PATH at invocation time.
    @"
@echo off
bun "$targetPath" %*
"@ | Set-Content -Path $shimPath -Encoding ASCII
}

Install-Shim "cheapcode"               "bin\cheapcode"
Install-Shim "cheapcode-accounts"      "bin\cheapcode-accounts"
Install-Shim "cheapcode-account-status" "bin\cheapcode-account-status"
Install-Shim "cheapcode-accounts-mcp"  "bin\cheapcode-accounts-mcp"

Write-Ok "cheapcode binaries installed at $cheapcodeBin"

# ============================================================
# Default config
# ============================================================

$cheapcodeConfig = Join-Path $HOME ".config\cheapcode"
New-Item -Path $cheapcodeConfig -ItemType Directory -Force | Out-Null

$accountsPath = Join-Path $cheapcodeConfig "accounts.json"
if (-not (Test-Path $accountsPath)) {
    @"
{
  "version": 1,
  "accounts": []
}
"@ | Set-Content -Path $accountsPath -Encoding UTF8
    Write-Ok "created empty accounts.json at $accountsPath"
}

# ============================================================
# Register cheapcode in opencode.json (additive)
# ============================================================

$opencodeConfigDir = Join-Path $HOME ".config\opencode"
$opencodeConfig    = Join-Path $opencodeConfigDir "opencode.json"
New-Item -Path $opencodeConfigDir -ItemType Directory -Force | Out-Null

# Use forward-slashes inside JSON (works on Windows; avoids backslash-escape headaches)
$libForJson = ($cheapcodeLib -replace '\\','/')
$mcpCmdForJson = ((Join-Path $cheapcodeBin "cheapcode-accounts-mcp.cmd") -replace '\\','/')

if (-not (Test-Path $opencodeConfig)) {
    Write-Info "creating $opencodeConfig with cheapcode provider + MCP server registered"
    @"
{
  "`$schema": "https://opencode.ai/config.json",
  "provider": {
    "cheapcode": {
      "npm": "$libForJson",
      "name": "cheapcode tiers",
      "options": { "apiKey": "{env:OPENROUTER_API_KEY}" },
      "models": {
        "cheap":      { "name": "cheap",      "tools": true },
        "cheap-fast": { "name": "cheap-fast", "tools": true },
        "smart":      { "name": "smart",      "tools": true },
        "smart-fast": { "name": "smart-fast", "tools": true },
        "auto":       { "name": "auto",       "tools": true },
        "local":      { "name": "local",      "tools": true }
      }
    }
  },
  "mcp": {
    "cheapcode-accounts": {
      "type": "local",
      "command": ["$mcpCmdForJson"]
    }
  }
}
"@ | Set-Content -Path $opencodeConfig -Encoding UTF8
} else {
    $existing = Get-Content $opencodeConfig -Raw
    if ($existing -notmatch '"cheapcode"') {
        Write-Warn "$opencodeConfig exists but lacks 'cheapcode' provider entry."
        Write-Warn "add this manually under the 'provider' key:"
        Write-Host @"
    "cheapcode": {
      "npm": "$libForJson",
      "name": "cheapcode tiers",
      "options": { "apiKey": "{env:OPENROUTER_API_KEY}" },
      "models": {
        "auto":       { "name": "auto",       "tools": true },
        "smart-fast": { "name": "smart-fast", "tools": true }
      }
    }
"@
    }
    if ($existing -notmatch '"cheapcode-accounts"') {
        Write-Warn "$opencodeConfig lacks 'cheapcode-accounts' MCP server entry."
        Write-Warn "add this manually under the 'mcp' key:"
        Write-Host @"
    "cheapcode-accounts": {
      "type": "local",
      "command": ["$mcpCmdForJson"]
    }
"@
    }
}

# ============================================================
# Add to user PATH (persistent via registry)
# ============================================================

$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if (-not $userPath -or ($userPath -notlike "*$cheapcodeBin*")) {
    $newPath = if ($userPath) { "$cheapcodeBin;$userPath" } else { $cheapcodeBin }
    [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    # Also update current session's PATH so a follow-up `cheapcode web` works
    $env:Path = "$cheapcodeBin;$env:Path"
    Write-Ok "added cheapcode to user PATH (persists across sessions)"
}

# ============================================================
# Done
# ============================================================

Write-Host ""
Write-Host "cheapcode installed." -ForegroundColor Green -BackgroundColor Black
Write-Host ""
Write-Host "  bin:    $cheapcodeBin"
Write-Host "  lib:    $cheapcodeLib"
Write-Host "  config: $cheapcodeConfig"
Write-Host ""
Write-Host "next steps:" -ForegroundColor Cyan
Write-Host "  1. open a NEW PowerShell window (so PATH refreshes)"
Write-Host "  2. run: " -NoNewline; Write-Host "cheapcode web" -ForegroundColor Cyan
Write-Host "  3. browser opens at " -NoNewline; Write-Host "http://127.0.0.1:4096/" -ForegroundColor Cyan
Write-Host "  4. click " -NoNewline; Write-Host "Providers " -ForegroundColor Cyan -NoNewline; Write-Host "to log into any AI provider, then chat to register accounts"
Write-Host ""
Write-Host "verify install:  " -NoNewline; Write-Host "cheapcode doctor" -ForegroundColor Cyan
Write-Host "all subcommands: " -NoNewline; Write-Host "cheapcode help"   -ForegroundColor Cyan
Write-Host ""
