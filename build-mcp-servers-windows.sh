#!/bin/bash

# Build MCP Servers Script (ServiceNow & Terraform only - No Ansible)
# This script builds ServiceNow and Terraform MCP servers for Windows/non-WSL environments

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to build an MCP server
build_mcp_server() {
    local server_name=$1
    local server_path=$2
    
    print_status "Building ${server_name}..."
    
    if [ ! -d "$server_path" ]; then
        print_error "Directory not found: $server_path"
        return 1
    fi
    
    cd "$server_path"
    
    # Install dependencies
    print_status "  Installing dependencies..."
    if npm install > /dev/null 2>&1; then
        print_success "  Dependencies installed"
    else
        print_error "  Failed to install dependencies"
        return 1
    fi
    
    # Build the server
    print_status "  Compiling TypeScript..."
    if npm run build > /dev/null 2>&1; then
        print_success "  Build completed"
    else
        print_error "  Build failed"
        return 1
    fi
    
    # Verify build output
    if [ -d "build" ] && [ -f "build/index.js" ]; then
        print_success "  Build artifacts verified"
    else
        print_warning "  Build directory exists but may be incomplete"
    fi
    
    cd - > /dev/null
    echo ""
}

# Main script
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║      Building MCP Servers (ServiceNow & Terraform)        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
print_status "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v20 or higher."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js ${NODE_VERSION} found"
echo ""

# Get the script directory (project root)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Build MCP servers
BUILD_FAILED=0

# 1. ServiceNow MCP Server
if build_mcp_server "ServiceNow MCP Server" "local-servicenow-mcp"; then
    print_success "ServiceNow MCP Server built successfully"
else
    print_error "ServiceNow MCP Server build failed"
    BUILD_FAILED=1
fi

# 2. Terraform MCP Server
if build_mcp_server "Terraform MCP Server" "terraform-mcp-server"; then
    print_success "Terraform MCP Server built successfully"
else
    print_error "Terraform MCP Server build failed"
    BUILD_FAILED=1
fi

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
if [ $BUILD_FAILED -eq 0 ]; then
    # Write .bob/mcp.json with correct absolute paths for this machine
    MCP_JSON_PATH="$SCRIPT_DIR/.bob/mcp.json"

    # Load ServiceNow creds from .env if available
    SN_INSTANCE="your-instance-id"
    SN_USERNAME="admin"
    SN_PASSWORD="your-password"
    if [ -f "$SCRIPT_DIR/.env" ]; then
        _SN=$(grep '^SERVICENOW_INSTANCE=' "$SCRIPT_DIR/.env" | cut -d= -f2-)
        _SU=$(grep '^SERVICENOW_USERNAME=' "$SCRIPT_DIR/.env" | cut -d= -f2-)
        _SP=$(grep '^SERVICENOW_PASSWORD=' "$SCRIPT_DIR/.env" | cut -d= -f2-)
        [ -n "$_SN" ] && SN_INSTANCE="$_SN"
        [ -n "$_SU" ] && SN_USERNAME="$_SU"
        [ -n "$_SP" ] && SN_PASSWORD="$_SP"
    fi

    mkdir -p "$SCRIPT_DIR/.bob"
    cat > "$MCP_JSON_PATH" << EOF
{
  "mcpServers": {
    "servicenow": {
      "command": "node",
      "args": ["$SCRIPT_DIR/local-servicenow-mcp/dist/index.js"],
      "cwd": "$SCRIPT_DIR/local-servicenow-mcp",
      "env": {
        "SERVICENOW_INSTANCE": "$SN_INSTANCE",
        "SERVICENOW_USERNAME": "$SN_USERNAME",
        "SERVICENOW_PASSWORD": "$SN_PASSWORD"
      },
      "alwaysAllow": ["list_incidents", "get_incident", "search_knowledge"],
      "disabled": false
    },
    "terraform": {
      "command": "node",
      "args": ["$SCRIPT_DIR/terraform-mcp-server/build/index.js"],
      "cwd": "$SCRIPT_DIR/terraform-mcp-server",
      "disabled": false,
      "alwaysAllow": [],
      "disabledTools": []
    },
    "bob-marketplace": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:39247/mcp",
      "headers": { "Bob-Marketplace-Token": "bob-marketplace-local" },
      "disabled": false,
      "alwaysAllow": ["search_assets", "get_asset", "list_installed", "list_favorites", "suggest_assets", "list_updates"]
    },
    "value-deployed": {
      "type": "streamable-http",
      "url": "https://value.2emmib0b30bq.us-east.codeengine.appdomain.cloud/mcp",
      "headers": { "Authorization": "Bearer \${VALUE_MCP_AUTH_TOKEN}" },
      "disabled": false,
      "alwaysAllow": ["get_asset_schema_and_instructions", "submit_asset", "search_assets"]
    }
  }
}
EOF

    echo "║                  ✓ All Builds Successful                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    print_success "MCP servers (ServiceNow & Terraform) are ready to use!"
    print_success ".bob/mcp.json written with correct paths for this machine"
    echo ""
    echo "Next steps:"
    echo "  1. Ensure .env file is configured with ServiceNow credentials"
    echo "  2. Switch Bob to 'SDLC Incident Manager' mode"
    echo "  3. Start using Bob for incident management"
    echo ""
    exit 0
else
    echo "║                  ✗ Some Builds Failed                     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    print_error "One or more MCP servers failed to build"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check that you have Node.js v20 or higher installed"
    echo "  2. Ensure you have internet connectivity for npm packages"
    echo "  3. Try running 'npm cache clean --force' and retry"
    echo "  4. Check individual server directories for error logs"
    echo ""
    exit 1
fi

# Made with Bob
