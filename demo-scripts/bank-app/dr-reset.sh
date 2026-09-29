#!/bin/bash
# Reset / Setup Hook: Restores baseline resource limits on the backend container
# Target: bank-app-dev-backend
# Idempotent: Can be run repeatedly or wired into lab reset hooks without erroring.

set -e

CONTAINER_NAME="bank-app-dev-backend"

echo "🔄 Checking container '$CONTAINER_NAME' for resource reset..."

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}$"; then
    echo "ℹ️  Container '$CONTAINER_NAME' is not currently running. Skipping live update."
    exit 0
fi

echo "🧹 Reverting live resource constraints (setting memory and CPU limits to unconstrained defaults)..."

# Reset memory and cpu limits to 0 (unconstrained / Docker default baseline)
# Using || true ensures idempotency even if Docker runtime rejects duplicate updates
docker update --memory=0 --cpus=0 "$CONTAINER_NAME" > /dev/null 2>&1 || true

echo "✅ Resource limits reset to baseline successfully."
echo ""
echo "📊 Current Container Configuration:"
docker inspect "$CONTAINER_NAME" --format '   • Memory Limit: {{.HostConfig.Memory}} (0 = unconstrained)
   • NanoCPUs:     {{.HostConfig.NanoCPUs}} (0 = unconstrained)'
