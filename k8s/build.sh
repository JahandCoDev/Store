#!/bin/bash
# ==============================================================================
# Store Phone System — Build & Push Script
# This script builds the Docker images for the voice-router and voice-agent
# and pushes them to your internal Gitea registry.
# ==============================================================================

set -e

# --- Configuration ---
REGISTRY="registry.jahandco.dev"
REGISTRY_USER="registryuser"
REGISTRY_PASS="REPLACE_ME_OR_RELY_ON_DOCKER_LOGIN"
REPO="store"
TAG="latest"

echo "=============================================================================="
echo "🚀 Starting Build & Push Pipeline for Store Phone System"
echo "=============================================================================="

# 0. Login to Registry
echo "🔐 Logging into $REGISTRY..."
echo "$REGISTRY_PASS" | docker login "$REGISTRY" --username "$REGISTRY_USER" --password-stdin

# 1. Build & Push Voice Router (Go)
echo ""
echo "📦 [1/1] Building Voice Router..."
docker build -t $REGISTRY/$REPO/voice-router:$TAG ./voice-router

echo "⬆️ Pushing Voice Router..."
docker push $REGISTRY/$REPO/voice-router:$TAG

echo ""
echo "=============================================================================="
echo "✅ Build & Push Complete!"
echo "Images are now available in the registry for Kubernetes to pull."
echo "=============================================================================="
