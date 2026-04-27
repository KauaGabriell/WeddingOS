$ErrorActionPreference = "Stop"

Write-Host "Cleaning npm env overrides for this process..."

$varsToRemove = @(
  "NPM_CONFIG_OFFLINE",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy"
)

foreach ($name in $varsToRemove) {
  if (Test-Path "Env:$name") {
    Remove-Item "Env:$name"
  }
}

Set-Item -Path Env:NPM_CONFIG_CACHE -Value (Join-Path $PSScriptRoot "..\\.npm-cache")

Write-Host "Running npm install with online mode..."
npm install
