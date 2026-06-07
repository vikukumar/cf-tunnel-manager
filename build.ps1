param(
    [switch]$SkipFrontend
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "Starting build: cloudflare-tunnel-ui"

# Frontend build
if (-not $SkipFrontend) {
    Write-Host "Building frontend..."
    Push-Location -Path "web"
    try {
        if (Test-Path pnpm-lock.yaml) {
            Write-Host "Installing frontend dependencies (pnpm)..."
            pnpm install
        }
        Write-Host "Running frontend build (pnpm run build)..."
        pnpm run build
    } finally {
        Pop-Location
    }
}

# Go build
Write-Host "Building Go binary..."
if (-not (Test-Path bin)) { New-Item -ItemType Directory -Path bin | Out-Null }

Start-Process -NoNewWindow -FilePath "go" -ArgumentList @("build","-o","bin/cloudflare-tunnel-ui.exe","./cmd/server") -Wait

Write-Host "Build complete. Binary at bin\cloudflare-tunnel-ui.exe"
