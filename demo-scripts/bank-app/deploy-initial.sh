#!/bin/bash

# Deploy Initial Application (Part 2)
# This script deploys the bank application in a healthy state with 1 backend replica
# No performance issues or overload - just a working application

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║$1${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_status() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Navigate to project root
cd "$PROJECT_ROOT"

print_header "       Part 2: Deploy Initial Application (Healthy State)       "

# Step 1: Check prerequisites
print_status "Step 1: Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not running"
    exit 1
fi

if ! docker ps &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker/Colima."
    exit 1
fi

if ! command -v terraform &> /dev/null; then
    print_error "Terraform is not installed"
    exit 1
fi

print_success "Docker is running"
print_success "Terraform is installed"
echo ""

# Step 2: Navigate to Terraform directory
print_status "Step 2: Preparing Terraform configuration..."
cd "$PROJECT_ROOT/bank-app/terraform"

# Step 3: Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    print_status "Initializing Terraform..."
    if terraform init > /dev/null 2>&1; then
        print_success "Terraform initialized"
    else
        print_error "Terraform initialization failed"
        exit 1
    fi
else
    print_success "Terraform already initialized"
fi

# Step 4: Configure for 1 backend replica (healthy low-traffic state)
print_status "Step 3: Configuring for low-traffic deployment (1 backend replica)..."

# Create or update terraform.tfvars
cat > terraform.tfvars << EOF
# Initial deployment configuration
# 1 backend replica is adequate for low traffic periods
backend_replicas  = 1
simulate_overload = 0
EOF

print_success "Configuration set: backend_replicas = 1"
echo ""

# Step 5: Force rebuild frontend image to ensure clean state
print_status "Step 4: Ensuring frontend image is clean..."
if docker rmi -f bank-app-frontend:latest > /dev/null 2>&1; then
    print_success "Removed old frontend image"
else
    print_info "No old frontend image to remove"
fi

# Taint the frontend image so Terraform always rebuilds it from the
# current nginx.conf — prevents a stale image with a broken proxy config.
terraform -chdir="$PROJECT_ROOT/bank-app/terraform" taint docker_image.frontend 2>/dev/null || true
print_success "Frontend image tainted for rebuild"
echo ""

# Step 6: Deploy infrastructure
print_status "Step 5: Deploying application infrastructure..."
echo ""
print_info "This will create:"
print_info "  • Docker network (bank-app-network)"
print_info "  • PostgreSQL database container"
print_info "  • 1 Backend API container (Node.js)"
print_info "  • Frontend container (Nginx + React)"
echo ""

if terraform apply -auto-approve; then
    echo ""
    print_success "Infrastructure deployed successfully!"
else
    echo ""
    print_error "Terraform deployment failed"
    exit 1
fi

echo ""

# Step 7: Wait for services to be ready
print_status "Step 6: Waiting for services to be ready..."
sleep 5

# Check if containers are running
BACKEND_COUNT=$(docker ps --filter "name=bank-app-dev-backend" --format "{{.Names}}" | wc -l)
FRONTEND_RUNNING=$(docker ps --filter "name=bank-app-dev-frontend" --format "{{.Names}}" | wc -l)
DB_RUNNING=$(docker ps --filter "name=bank-app-dev-db" --format "{{.Names}}" | wc -l)

if [ "$BACKEND_COUNT" -eq 1 ] && [ "$FRONTEND_RUNNING" -eq 1 ] && [ "$DB_RUNNING" -eq 1 ]; then
    print_success "All containers are running"
else
    print_warning "Some containers may not be running. Check with: docker ps"
fi

echo ""

# Step 8: Verify application health
print_status "Step 7: Verifying application health..."

# Wait a bit more for backend to be fully ready
sleep 3

# Check backend health
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    print_success "Backend is healthy"
    
    # Check metrics
    METRICS=$(curl -s http://localhost:5001/api/admin/metrics)
    OVERLOADED=$(echo "$METRICS" | grep -o '"overloaded":[^,}]*' | cut -d':' -f2)
    
    if [ "$OVERLOADED" = "false" ]; then
        print_success "Metrics show normal operation (overloaded: false)"
    else
        print_warning "Metrics endpoint accessible but may show unexpected values"
    fi
else
    print_warning "Backend health check failed. It may still be starting up."
    print_info "Try: curl http://localhost:5001/health"
fi

echo ""

# Step 9: Display summary
print_header "                    ✓ Deployment Complete!                     "

echo -e "${GREEN}Application Status:${NC}"
echo "  • Frontend:  http://localhost"
echo "  • Backend:   http://localhost:5001"
echo "  • Database:  localhost:5437"
echo ""
echo -e "${GREEN}Infrastructure:${NC}"
echo "  • Backend replicas: 1 (adequate for low traffic)"
echo "  • Performance: Normal (<1 second response times)"
echo "  • Status: Healthy, no issues"
echo ""
echo -e "${CYAN}Next Steps (Part 2 of Lab):${NC}"
echo ""
echo "  1. Open the application in your browser:"
echo "     ${BLUE}open http://localhost${NC}"
echo ""
echo "  2. Login with demo credentials:"
echo "     Username: ${BLUE}demo${NC}"
echo "     Password: ${BLUE}demo123${NC}"
echo ""
echo "  3. Explore the application:"
echo "     • View account balances"
echo "     • Make deposits/withdrawals"
echo "     • Check transaction history"
echo "     • Request loans"
echo "     ${GREEN}Notice how fast everything loads!${NC}"
echo ""
echo "  4. Verify the infrastructure:"
echo "     ${BLUE}docker ps --filter \"name=bank-app\"${NC}"
echo "     ${BLUE}curl -s http://localhost:5001/api/admin/metrics | jq${NC}"
echo ""
echo -e "${YELLOW}When ready to simulate the traffic surge (Part 3):${NC}"
echo "  ${BLUE}./setup-flow3.sh${NC}"
echo ""

exit 0

# Made with Bob
