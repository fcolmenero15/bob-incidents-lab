#!/bin/bash
# Shutdown Script: Healthcare Performance & Scaling Demo

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛑 Shutting Down: Healthcare Performance & Scaling Demo${NC}"
echo "============================================================="
echo ""

check_terraform() {
    [ -d "$PROJECT_ROOT/health-app/terraform/.terraform" ]
}

check_containers() {
    docker ps --filter "name=healthcare-app" --format "{{.Names}}" 2>/dev/null | wc -l | tr -d ' '
}

# Step 1: Clear metrics and delays
echo -e "${YELLOW}Step 1: Clearing overload metrics and delays...${NC}"
if curl -s --max-time 5 http://localhost:5001/health > /dev/null 2>&1; then
    curl -s -X POST http://localhost:5001/api/admin/load \
      -H "Content-Type: application/json" \
      -d '{"cpuUsage":0,"memoryUsage":0,"requestsPerSecond":0,"activeConnections":0,"overloaded":false}' \
      > /dev/null 2>&1 || true
    curl -s -X DELETE http://localhost:5001/api/admin/delay > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ Metrics and delays cleared${NC}"
else
    echo -e "${YELLOW}⚠️  Backend not accessible (may already be stopped)${NC}"
fi
echo ""

# Step 2: Check infrastructure status
echo -e "${YELLOW}Step 2: Checking infrastructure status...${NC}"
CONTAINER_COUNT=$(check_containers)
if [ "$CONTAINER_COUNT" -gt 0 ]; then
    echo -e "${BLUE}Found $CONTAINER_COUNT running container(s)${NC}"
    docker ps --filter "name=healthcare-app" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo -e "${GREEN}No containers currently running${NC}"
fi
echo ""

# Step 3: Reset Terraform configuration
echo -e "${YELLOW}Step 3: Resetting Terraform configuration...${NC}"
if [ -f "$PROJECT_ROOT/health-app/terraform/terraform.tfvars" ]; then
    cd "$PROJECT_ROOT/health-app/terraform"
    if grep -q "backend_replicas" terraform.tfvars; then
        sed -i.bak 's/backend_replicas = [0-9]*/backend_replicas = 1/' terraform.tfvars
        rm -f terraform.tfvars.bak
        echo -e "${GREEN}✅ Terraform variables reset to defaults (1 replica)${NC}"
    else
        echo -e "${GREEN}✅ Terraform variables already at defaults${NC}"
    fi
    cd "$SCRIPT_DIR"
else
    echo -e "${GREEN}✅ No terraform.tfvars to reset${NC}"
fi
echo ""

# Step 4: Destroy Terraform infrastructure
echo -e "${YELLOW}Step 4: Destroying Terraform infrastructure...${NC}"
if check_terraform; then
    cd "$PROJECT_ROOT/health-app/terraform"
    if terraform destroy -auto-approve; then
        echo -e "${GREEN}✅ Terraform infrastructure destroyed${NC}"
    else
        echo -e "${RED}❌ Terraform destroy failed${NC}"
        echo -e "${YELLOW}Run manually: cd health-app/terraform && terraform destroy${NC}"
    fi
    cd "$SCRIPT_DIR"
else
    echo -e "${YELLOW}⚠️  Terraform not initialized, skipping destroy${NC}"
fi
echo ""

# Step 5: Clean up any remaining containers
echo -e "${YELLOW}Step 5: Cleaning up any remaining containers...${NC}"
REMAINING=$(check_containers)
if [ "$REMAINING" -gt 0 ]; then
    docker stop $(docker ps --filter "name=healthcare-app" -q) 2>/dev/null || true
    docker rm $(docker ps -a --filter "name=healthcare-app" -q) 2>/dev/null || true
    echo -e "${GREEN}✅ Remaining containers cleaned up${NC}"
else
    echo -e "${GREEN}✅ No remaining containers to clean up${NC}"
fi
echo ""

# Step 6: Clean up Docker networks
echo -e "${YELLOW}Step 6: Cleaning up Docker networks...${NC}"
if docker network ls | grep -q "healthcare-app"; then
    docker network rm healthcare-app-network 2>/dev/null || true
    echo -e "${GREEN}✅ Docker networks cleaned up${NC}"
else
    echo -e "${GREEN}✅ No healthcare-app networks to clean up${NC}"
fi
echo ""

# Step 7: Remove Docker images to force clean rebuild on next deploy (prevents stale nginx.conf being served)
echo -e "${YELLOW}Step 7: Removing Docker images...${NC}"
docker rmi -f healthcare-app-frontend:latest healthcare-app-backend:latest > /dev/null 2>&1 \
    && echo -e "${GREEN}✅ Docker images removed${NC}" \
    || echo -e "${GREEN}✅ No images to remove${NC}"
echo ""

# Step 8: Verify shutdown
echo -e "${YELLOW}Step 8: Verifying shutdown...${NC}"
FINAL_COUNT=$(check_containers)
if [ "$FINAL_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ All containers stopped${NC}"
else
    echo -e "${RED}⚠️  Warning: $FINAL_COUNT container(s) still running${NC}"
    docker ps --filter "name=healthcare-app"
fi

echo ""
echo "Checking port availability..."
for port in 80 5001 5437; do
    lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 \
        && echo -e "${YELLOW}⚠️  Port $port still in use${NC}" \
        || echo -e "${GREEN}✅ Port $port is free${NC}"
done
echo ""

echo -e "${GREEN}✅ Shutdown Complete!${NC}"
echo ""
echo -e "${YELLOW}Note: Colima is still running. To stop Colima:${NC}"
echo "   colima stop"

# Made with Bob
