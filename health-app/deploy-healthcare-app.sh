#!/bin/bash

# Healthcare Portal - Initial Deployment Script
# This script builds and deploys the healthcare application for the first time

set -e

# Change to the directory containing this script (where docker-compose.yml lives)
cd "$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🏥 Healthcare Portal - Initial Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
echo -e "${YELLOW}Checking Docker...${NC}"
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker/Rancher Desktop first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Stop and remove any existing containers
echo -e "${YELLOW}Cleaning up existing containers...${NC}"
docker-compose down -v 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# Build custom images
echo -e "${YELLOW}Building healthcare application images...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}✓ Images built successfully${NC}"
echo ""

# Start the application
echo -e "${YELLOW}Starting healthcare application...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Application started${NC}"
echo ""

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Check container status
echo -e "${YELLOW}Checking container status...${NC}"
docker-compose ps
echo ""

# Display access information
echo -e "${GREEN}=========================================="
echo "🎉 Healthcare Portal Deployed Successfully!"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo "  Frontend:  http://localhost"
echo "  Backend:   http://localhost:5001/api"
echo "  Database:  localhost:5432 (healthcaredb)"
echo ""
echo -e "${BLUE}Demo Credentials:${NC}"
echo "  Username: demo"
echo "  Password: demo123"
echo ""
echo -e "${BLUE}Container Names:${NC}"
echo "  Database:  healthcare-db"
echo "  Backend:   healthcare-backend"
echo "  Frontend:  healthcare-frontend"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Open http://localhost in your browser"
echo "  2. Login with demo credentials"
echo "  3. Test healthcare workflows"
echo "  4. Run automated tests: ./test-healthcare-workflows.sh"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs:     docker-compose logs -f"
echo "  Stop app:      docker-compose down"
echo "  Restart app:   docker-compose restart"
echo "  View status:   docker-compose ps"
echo ""

# Made with Bob
