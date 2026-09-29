#!/bin/bash
# Setup Flow: Healthcare Performance & Scaling Incident
# Simulates an overloaded single-replica backend with 3s response times

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

echo "🔧 Setting up Flow: Healthcare Performance & Scaling Issue"
echo "==========================================================="
echo ""
echo "This demo simulates a realistic scenario where:"
echo "  • Single backend replica is overloaded (under-provisioned)"
echo "  • High load causes 3+ second response times"
echo "  • Scaling to 3 replicas resolves BOTH issues"
echo ""

# Step 1: Ensure Terraform is configured for single replica
echo "Step 1: Configuring infrastructure for single replica..."
cd "$PROJECT_ROOT/health-app/terraform"

if grep -q "backend_replicas" terraform.tfvars 2>/dev/null; then
    sed -i.bak 's/backend_replicas = [0-9]*/backend_replicas = 1/' terraform.tfvars
    rm -f terraform.tfvars.bak
    echo "✅ Configured for 1 backend replica (simulating under-provisioned infrastructure)"
else
    echo "backend_replicas = 1" > terraform.tfvars
    echo "✅ Set backend_replicas = 1 in terraform.tfvars"
fi

# Step 2: Deploy or verify application is running
echo ""
echo "Step 2: Deploying application with Terraform..."
if ! docker ps | grep -q "healthcare-app-dev-backend"; then
    echo "⚠️  Application not running. Deploying..."
    terraform init -upgrade > /dev/null 2>&1
    terraform apply -auto-approve
    echo "✅ Application deployed with 1 backend replica"
else
    echo "✅ Application already running"
    BACKEND_COUNT=$(docker ps --filter "name=healthcare-app-dev-backend" --format "{{.Names}}" | wc -l | tr -d ' ')
    if [ "$BACKEND_COUNT" -ne 1 ]; then
        echo "⚠️  Found $BACKEND_COUNT backend instances, expected 1. Redeploying..."
        terraform apply -auto-approve
    fi
fi

cd "$SCRIPT_DIR"

# Step 3: Wait for backend to be ready
echo ""
echo "Step 3: Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s --max-time 2 http://localhost:5001/health > /dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    [ $i -eq 30 ] && { echo "❌ Backend failed to start after 30 seconds"; exit 1; }
    sleep 1
done

# Step 4: Inject overload metrics
echo ""
echo "Step 4: Simulating server overload conditions..."
LOAD_RESPONSE=$(curl -s -X POST http://localhost:5001/api/admin/load \
  -H "Content-Type: application/json" \
  -d '{
    "cpuUsage": 95,
    "memoryUsage": 88,
    "requestsPerSecond": 450,
    "activeConnections": 280,
    "overloaded": true
  }')

if echo "$LOAD_RESPONSE" | grep -q "overloaded"; then
    echo "✅ Server overload simulation enabled"
    echo "   CPU Usage: 95%"
    echo "   Memory Usage: 88%"
    echo "   Requests/sec: 450"
    echo "   Active Connections: 280"
    echo "   Status: ⚠️ OVERLOADED"
else
    echo "⚠️  Could not set load metrics. Response: $LOAD_RESPONSE"
fi

# Step 5: Inject artificial delay
echo ""
echo "Step 5: Enabling performance degradation (3-second delays)..."
DELAY_RESPONSE=$(curl -s -X POST http://localhost:5001/api/admin/delay \
  -H "Content-Type: application/json" \
  -d '{"delay": 3000}')

if echo "$DELAY_RESPONSE" | grep -q "3000"; then
    echo "✅ Performance degradation enabled: 3000ms delay"
else
    echo "⚠️  Could not enable delay. Response: $DELAY_RESPONSE"
fi

# Step 6: Verify detectable
echo ""
echo "Step 6: Verifying issues are detectable..."

METRICS=$(curl -s http://localhost:5001/api/admin/metrics)
echo "$METRICS" | grep -q "overloaded.*true" && echo "✅ Overload condition confirmed"

echo "Testing response time (should take ~3 seconds)..."
START=$(date +%s)
curl -s http://localhost:5001/health > /dev/null
END=$(date +%s)
DURATION=$((END - START))
[ $DURATION -ge 3 ] \
    && echo "✅ Performance degradation confirmed: ${DURATION}s response time" \
    || echo "⚠️  Response time: ${DURATION}s (expected 3+s)"

# Step 7: Show state
echo ""
echo "Step 7: Current infrastructure state"
echo "📊 Backend Instances:"
docker ps --filter "name=healthcare-app-dev-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "💾 Simulated Resource Usage:"
echo "   CPU: 95% (overloaded)"
echo "   Memory: 88% (high)"
echo "   Requests/sec: 450 (exceeding capacity)"
echo "   Response Time: 3+ seconds (degraded)"

echo ""
echo "✅ Flow setup complete!"
echo ""
echo "🎬 Ready for Demo! Next steps:"
echo "   1. Switch Bob to '🎫 SDLC Incident Manager' mode"
echo "   2. Tell Bob:"
echo "      \"Users reporting severe performance issues on the healthcare portal."
echo "      \"Pages are taking 3-5 seconds to load. Server appears overloaded.\""
echo "🛑 To shutdown: ./shutdown-flow.sh"

# Made with Bob
