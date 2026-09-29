#!/bin/bash
# Shutdown Script for Flow 3: Combined Performance & Scaling Demo
# This script cleanly stops all demo infrastructure

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root (two levels up from script location)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Shutting Down demo flow: Performance & Scaling Demo${NC}"
echo "============================================================="
echo ""

# Function to check if Terraform is initialized
check_terraform() {
    if [ -d "$PROJECT_ROOT/bank-app/terraform/.terraform" ]; then
        return 0
    else
        return 1
    fi
}

# Function to check if containers are running
check_containers() {
    local running=$(docker ps --filter "name=bank-app" --format "{{.Names}}" 2>/dev/null | wc -l)
    echo $running
}

# Step 1: Clear metrics and delays
echo -e "${YELLOW}Step 1: Clearing overload metrics and delays...${NC}"
if curl -s --max-time 5 http://localhost:5001/health > /dev/null 2>&1; then
    echo "Backend is accessible, clearing metrics..."
    
    # Clear overload metrics
    curl -s -X POST http://localhost:5001/api/admin/load \
      -H "Content-Type: application/json" \
      -d '{
        "cpuUsage": 0,
        "memoryUsage": 0,
        "requestsPerSecond": 0,
        "activeConnections": 0,
        "overloaded": false
      }' > /dev/null 2>&1 || true
    
    # Clear delays
    curl -s -X DELETE http://localhost:5001/api/admin/delay > /dev/null 2>&1 || true
    
    echo -e "${GREEN}✅ Metrics and delays cleared${NC}"
else
    echo -e "${YELLOW}⚠️  Backend not accessible (may already be stopped)${NC}"
fi
echo ""

# Step 2: Check current infrastructure status
echo -e "${YELLOW}Step 2: Checking infrastructure status...${NC}"
CONTAINER_COUNT=$(check_containers)
if [ "$CONTAINER_COUNT" -gt 0 ]; then
    echo -e "${BLUE}Found $CONTAINER_COUNT running container(s)${NC}"
    docker ps --filter "name=bank-app" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Check if scaled (multiple backend instances)
    BACKEND_COUNT=$(docker ps --filter "name=bank-app-dev-backend" --format "{{.Names}}" | wc -l | tr -d ' ')
    if [ "$BACKEND_COUNT" -gt 1 ]; then
        echo -e "${BLUE}Note: Infrastructure is scaled ($BACKEND_COUNT backend instances)${NC}"
    fi
else
    echo -e "${GREEN}No containers currently running${NC}"
fi
echo ""

# Step 3: Reset Terraform configuration to default
echo -e "${YELLOW}Step 3: Resetting Terraform configuration...${NC}"
if [ -f "$PROJECT_ROOT/bank-app/terraform/terraform.tfvars" ]; then
    cd "$PROJECT_ROOT/bank-app/terraform"
    # Reset backend_replicas to 1 (clean baseline — not scaled)
    # simulate_overload is now derived automatically from replica count in main.tf locals,
    # so no separate variable to reset here.
    if grep -q "backend_replicas" terraform.tfvars; then
        sed -i.bak 's/backend_replicas = [0-9]*/backend_replicas = 1/' terraform.tfvars
        rm -f terraform.tfvars.bak
    else
        echo "backend_replicas = 1" >> terraform.tfvars
    fi
    echo -e "${GREEN}✅ Terraform variables reset to defaults (1 replica)${NC}"
    cd "$SCRIPT_DIR"
else
    echo -e "${GREEN}✅ No terraform.tfvars to reset${NC}"
fi
echo ""

# Step 4: Destroy Terraform-managed infrastructure
echo -e "${YELLOW}Step 4: Destroying Terraform infrastructure...${NC}"
if check_terraform; then
    cd "$PROJECT_ROOT/bank-app/terraform"
    
    echo "Running terraform destroy..."
    if terraform destroy -auto-approve; then
        echo -e "${GREEN}✅ Terraform infrastructure destroyed${NC}"
    else
        echo -e "${RED}❌ Terraform destroy failed${NC}"
        echo -e "${YELLOW}You may need to run manually: cd bank-app/terraform && terraform destroy${NC}"
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
    echo "Stopping remaining bank-app containers..."
    docker stop $(docker ps --filter "name=bank-app" -q) 2>/dev/null || true
    docker rm $(docker ps -a --filter "name=bank-app" -q) 2>/dev/null || true
    echo -e "${GREEN}✅ Remaining containers cleaned up${NC}"
else
    echo -e "${GREEN}✅ No remaining containers to clean up${NC}"
fi
echo ""

# Step 6: Clean up Docker networks
echo -e "${YELLOW}Step 6: Cleaning up Docker networks...${NC}"
if docker network ls | grep -q "bank-app"; then
    docker network rm bank-app-network 2>/dev/null || true
    echo -e "${GREEN}✅ Docker networks cleaned up${NC}"
else
    echo -e "${GREEN}✅ No bank-app networks to clean up${NC}"
fi
echo ""

# Step 7: Verify shutdown
echo -e "${YELLOW}Step 7: Verifying shutdown...${NC}"
FINAL_COUNT=$(check_containers)
if [ "$FINAL_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ All containers stopped${NC}"
else
    echo -e "${RED}⚠️  Warning: $FINAL_COUNT container(s) still running${NC}"
    docker ps --filter "name=bank-app"
fi

# Check if ports are free
echo ""
echo "Checking port availability..."
for port in 80 5001 5437; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port still in use${NC}"
    else
        echo -e "${GREEN}✅ Port $port is free${NC}"
    fi
done
echo ""

# Final summary
echo -e "${GREEN}✅ Shutdown Complete!${NC}"
echo ""
echo -e "${YELLOW}Note: Colima is still running. To stop Colima:${NC}"
echo "   colima stop"

# Made with Bob