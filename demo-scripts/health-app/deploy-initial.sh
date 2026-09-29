#!/bin/bash

# Deploy Initial Healthcare Application
# Deploys the healthcare app in a healthy state via Terraform

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║$1${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}
print_status()  { echo -e "${BLUE}==>${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error()   { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info()    { echo -e "${CYAN}ℹ${NC} $1"; }

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

print_header "       Deploy Healthcare Application (Healthy State)        "

# Step 1: Check prerequisites
print_status "Step 1: Checking prerequisites..."

if ! command -v docker &> /dev/null || ! docker ps &> /dev/null; then
    print_error "Docker is not running. Please start Docker/Colima."
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
cd "$PROJECT_ROOT/health-app/terraform"

# Step 3: Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    print_status "Initializing Terraform..."
    terraform init > /dev/null 2>&1 && print_success "Terraform initialized" || { print_error "Terraform initialization failed"; exit 1; }
else
    print_success "Terraform already initialized"
fi

# Step 4: Configure for 1 backend replica
print_status "Step 3: Configuring for single backend replica..."
cat > terraform.tfvars << EOF
backend_replicas = 1
EOF
print_success "Configuration set: backend_replicas = 1"
echo ""

# Step 5: Remove old frontend image to force clean build
print_status "Step 4: Ensuring frontend image is clean..."
docker rmi -f healthcare-app-frontend:latest > /dev/null 2>&1 \
    && print_success "Removed old frontend image" \
    || print_info "No old frontend image to remove"
echo ""

# Step 6: Deploy infrastructure
print_status "Step 5: Deploying application infrastructure..."
echo ""
print_info "This will create:"
print_info "  • Docker network (healthcare-app-network)"
print_info "  • PostgreSQL database container"
print_info "  • 1 Backend API container (Node.js)"
print_info "  • Frontend container (Nginx + React)"
echo ""

terraform apply -auto-approve && print_success "Infrastructure deployed successfully!" || { print_error "Terraform deployment failed"; exit 1; }
echo ""

# Step 7: Wait and verify
print_status "Step 6: Waiting for services to be ready..."
sleep 5

BACKEND_UP=$(docker ps --filter "name=healthcare-app-dev-backend" --format "{{.Names}}" | wc -l | tr -d ' ')
FRONTEND_UP=$(docker ps --filter "name=healthcare-app-dev-frontend" --format "{{.Names}}" | wc -l | tr -d ' ')
DB_UP=$(docker ps --filter "name=healthcare-app-dev-db" --format "{{.Names}}" | wc -l | tr -d ' ')

[ "$BACKEND_UP" -eq 1 ] && [ "$FRONTEND_UP" -eq 1 ] && [ "$DB_UP" -eq 1 ] \
    && print_success "All containers are running" \
    || print_warning "Some containers may not be running. Check with: docker ps"
echo ""

# Step 8: Health check
print_status "Step 7: Verifying application health..."
sleep 3

if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    print_success "Backend is healthy"
    OVERLOADED=$(curl -s http://localhost:5001/api/admin/metrics | grep -o '"overloaded":[^,}]*' | cut -d':' -f2)
    [ "$OVERLOADED" = "false" ] \
        && print_success "Metrics show normal operation (overloaded: false)" \
        || print_warning "Metrics endpoint accessible but may show unexpected values"
else
    print_warning "Backend health check failed — it may still be starting up."
fi
echo ""

print_header "                    ✓ Deployment Complete!                     "

echo -e "${GREEN}Application Status:${NC}"
echo "  • Frontend:  http://localhost"
echo "  • Backend:   http://localhost:5001"
echo "  • Database:  localhost:5437"
echo ""
echo -e "${GREEN}Demo Credentials:${NC}"
echo "  Username: demo  |  Password: demo123"
echo ""
echo -e "${YELLOW}When ready to simulate an incident:${NC}"
echo "  ${BLUE}./setup-flow.sh${NC}"
echo ""

# Made with Bob
