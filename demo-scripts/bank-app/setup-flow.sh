#!/bin/bash
# Setup for Flow 3: Combined Performance & Scaling Issue
# This demo shows how infrastructure scaling resolves both overload AND performance issues

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root (two levels up from script location)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

echo "🔧 Setting up Flow: Performance & Scaling Issue"
echo "==========================================================="
echo ""
echo "This demo simulates a realistic scenario where:"
echo "  • Single backend replica is overloaded (under-provisioned)"
echo "  • High load causes 3+ second response times"
echo "  • Scaling to 3 replicas resolves BOTH issues"
echo ""

# 1. Configure Terraform: 1 replica + overload simulation ON
echo "Step 1: Configuring infrastructure for single replica with overload simulation..."
cd "$PROJECT_ROOT/bank-app/terraform"

# Set backend_replicas = 1 and simulate_overload = 1
cat > terraform.tfvars << EOF
# setup-flow.sh: single replica + overload simulation active
backend_replicas  = 1
simulate_overload = 1
EOF

echo "✅ Configured for 1 backend replica with simulate_overload=1"

# 2. Deploy / redeploy so the container picks up the replica count
echo ""
echo "Step 2: Applying Terraform (rebuilds backend image + recreates container)..."
terraform init -upgrade > /dev/null 2>&1
# Taint the backend image so Terraform rebuilds it from source on every setup run.
# This ensures any code changes (e.g. admin.js) are always picked up.
terraform taint docker_image.backend 2>/dev/null || true
terraform apply -auto-approve
echo "✅ Infrastructure deployed"

cd "$SCRIPT_DIR"

# Wait for backend to be ready
echo ""
echo "Step 3: Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s --max-time 2 http://localhost:5001/health > /dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done

# The backend now initialises globalDelay and simulatedLoad from SIMULATE_OVERLOAD=1
# at startup — nothing more to push via the API.

# 4. Verify the problem is detectable
echo ""
echo "Step 4: Verifying issues are detectable..."

# Check metrics endpoint
echo "Checking metrics endpoint..."
METRICS=$(curl -s http://localhost:5001/api/admin/metrics)
if echo "$METRICS" | grep -q "overloaded.*true"; then
    echo "✅ Overload condition confirmed (set by SIMULATE_OVERLOAD env var)"
fi

# Check response time
echo "Testing response time (should take ~3 seconds)..."
START=$(date +%s)
curl -s http://localhost:5001/health > /dev/null
END=$(date +%s)
DURATION=$((END - START))

if [ $DURATION -ge 3 ]; then
    echo "✅ Performance degradation confirmed: ${DURATION}s response time"
else
    echo "⚠️  Response time: ${DURATION}s (expected 3+s)"
fi

# 5. Display current state
echo ""
echo "Step 5: Current infrastructure state"
echo "📊 Backend Instances:"
docker ps --filter "name=bank-app-dev-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "💾 Simulated Resource Usage (set via SIMULATE_OVERLOAD=1 env var):"
echo "   CPU: 95% (overloaded)"
echo "   Memory: 88% (high)"
echo "   Requests/sec: 450 (exceeding capacity)"
echo "   Response Time: 3+ seconds (degraded)"
echo ""
echo "ℹ️  To resolve: set simulate_overload = 0 in terraform.tfvars and run"
echo "   'terraform apply' — the container restarts with zero metrics and no delay."

# 6. Demo instructions
echo ""
echo "✅ Flow setup Complete!"
echo ""
echo "🎬 Ready for Demo! Next steps:"
echo "   1. Switch Bob to '🎫 SDLC Incident Manager' mode"
echo "   2. Tell Bob:"
echo "      \"Users reporting severe performance issues. Application is very slow,"
echo "      \"taking 3-5 seconds to load pages. Server appears overloaded.\""
echo "🛑 To shutdown: ./shutdown-flow.sh"

# Made with Bob