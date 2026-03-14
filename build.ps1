# ==============================================================================
# Store Phone System — Build & Push Script (PowerShell)
# This script builds the Docker images for the voice-router and voice-agent
# and pushes them to your internal Gitea registry.
# ==============================================================================

$ErrorActionPreference = "Stop"

# --- Configuration ---
$REGISTRY = "registry.jahandco.dev"
$REGISTRY_USER = "registryuser"
$REGISTRY_PASS = "jahandco.7975"
$REPO = "store"
$TAG = "latest"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Build & Push Pipeline for Store Phone System" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

# 0. Login to Registry
Write-Host "🔐 Logging into $REGISTRY..." -ForegroundColor Magenta
$REGISTRY_PASS | docker login "$REGISTRY" --username "$REGISTRY_USER" --password-stdin

# 1. Build & Push Voice Router (Go)
Write-Host ""
Write-Host "📦 [1/1] Building Voice Router..." -ForegroundColor Yellow
docker build -t "$REGISTRY/$REPO/voice-router:$TAG" ./voice-router

Write-Host "⬆️ Pushing Voice Router..." -ForegroundColor Green
docker push "$REGISTRY/$REPO/voice-router:$TAG"

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "✅ Build & Push Complete!" -ForegroundColor Cyan
Write-Host "Images are now available in the registry for Kubernetes to pull." -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
