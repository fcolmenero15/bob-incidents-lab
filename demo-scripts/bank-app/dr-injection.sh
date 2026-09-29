#!/bin/bash
# Drift Injection Script: Simulates out-of-band resource constraint on backend container
# Target: bank-app-dev-backend
# Drift: Modifies memory limit to 256MB and CPU quota to 0.5 cores live via Docker CLI

set -e

CONTAINER_NAME="bank-app-dev-backend"

echo "🔍 Checking container status for '$CONTAINER_NAME'..."

if ! docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}$"; then
    echo "❌ Container '$CONTAINER_NAME' is not running!"
    echo "👉 Please ensure the Bank Simulator stack is deployed before injecting drift."
    exit 1
fi

echo "⚠️  Injecting live out-of-band infrastructure drift..."
echo "   Applying: --memory=256m --cpus=0.5 to '$CONTAINER_NAME'"

# Apply live resource constraints out-of-band
docker update --memory=256m --memory-swap=256m --cpus=0.5 "$CONTAINER_NAME" > /dev/null

echo "✅ Drift successfully injected!"
echo ""
echo "📊 Current Container Configuration:"
docker inspect "$CONTAINER_NAME" --format '   • Memory Limit: {{.HostConfig.Memory}} bytes (256MB)
   • NanoCPUs:     {{.HostConfig.NanoCPUs}} (0.5 CPU)'

echo ""
echo "🎯 Scenario Ready:"
echo "   The container capacity has diverged from Terraform state."
echo "   Terraform plan/refresh will detect the out-of-band drift on backend resource allocation."
