# Terraform MCP Server

MCP server providing Terraform infrastructure-as-code capabilities for the SDLC demo. Supports local providers (Docker, Local, Null) for demonstration without requiring cloud resources.

## Features

### Core Terraform Operations
- **terraform_init** - Initialize Terraform working directory
- **terraform_plan** - Preview infrastructure changes
- **terraform_apply** - Apply infrastructure changes
- **terraform_destroy** - Destroy managed infrastructure
- **terraform_show** - Display current state or saved plans
- **terraform_validate** - Validate configuration syntax
- **terraform_fmt** - Format configuration files

### State Management
- **terraform_state_list** - List all resources in state
- **terraform_output** - Read output values from state

### Workspace Management
- **terraform_workspace_list** - List all workspaces
- **terraform_workspace_new** - Create new workspace
- **terraform_workspace_select** - Switch between workspaces

### Demo Helpers
- **create_terraform_config** - Generate sample configurations for:
  - **Docker Provider**: Manage containers and networks locally
  - **Local Provider**: Create and manage local files
  - **Null Provider**: Demonstrate Terraform workflows

## Installation

1. Build the server:
```bash
cd terraform-mcp-server
npm install
npm run build
```

2. Add to MCP settings (`~/Library/Application Support/IBM Bob/User/globalStorage/ibm.bob-code/settings/mcp_settings.json`):
```json
{
  "mcpServers": {
    "terraform": {
      "command": "node",
      "args": ["/path/to/terraform-mcp-server/build/index.js"],
      "env": {
        "TERRAFORM_WORKING_DIR": "/path/to/your/terraform/configs"
      }
    }
  }
}
```

## Prerequisites

- Node.js 20+
- Terraform CLI installed (`brew install hashicorp/tap/terraform` on macOS)
- Docker Desktop or Colima (for Docker provider demos)

## Usage Examples

### Docker Provider Demo

1. Create a Docker configuration:
```
Use tool: create_terraform_config
  working_dir: ./terraform-demo
  provider: docker
```

2. Initialize Terraform:
```
Use tool: terraform_init
  working_dir: ./terraform-demo
```

3. Preview changes:
```
Use tool: terraform_plan
  working_dir: ./terraform-demo
```

4. Apply configuration:
```
Use tool: terraform_apply
  working_dir: ./terraform-demo
  auto_approve: true
```

5. View created resources:
```
Use tool: terraform_state_list
  working_dir: ./terraform-demo
```

6. Clean up:
```
Use tool: terraform_destroy
  working_dir: ./terraform-demo
  auto_approve: true
```

### Local Provider Demo

Create local files and directories managed by Terraform:

```
Use tool: create_terraform_config
  working_dir: ./terraform-local-demo
  provider: local
```

### Workspace Management

Manage multiple environments:

```
# List workspaces
Use tool: terraform_workspace_list
  working_dir: ./terraform-demo

# Create dev workspace
Use tool: terraform_workspace_new
  working_dir: ./terraform-demo
  name: dev

# Switch to production
Use tool: terraform_workspace_select
  working_dir: ./terraform-demo
  name: production
```

## SDLC Integration

This MCP server enables:

1. **Infrastructure as Code**: Define infrastructure in version-controlled files
2. **Environment Management**: Use workspaces for dev/staging/prod
3. **Change Preview**: Review infrastructure changes before applying
4. **State Tracking**: Maintain infrastructure state across deployments
5. **Automation**: Integrate with CI/CD pipelines

## Demo Scenarios

### Scenario 1: Local Docker Infrastructure
Demonstrate managing Docker containers and networks with Terraform, simulating cloud infrastructure management without cloud costs.

### Scenario 2: Configuration File Management
Use the Local provider to manage application configuration files, demonstrating infrastructure-as-code principles for file-based resources.

### Scenario 3: Workflow Orchestration
Use the Null provider to demonstrate Terraform's dependency management and execution ordering capabilities.

## Security Notes

- **Auto-approve**: Use cautiously! Always review plans before applying
- **State Files**: Contain sensitive data; never commit to version control
- **Credentials**: Store in environment variables, not in .tf files
- **Workspaces**: Isolate environments to prevent accidental changes

## Troubleshooting

### Terraform not found
```bash
# Install Terraform
brew install terraform

# Verify installation
terraform version
```

### Docker provider issues
```bash
# Ensure Docker is running
docker ps

# Check Docker socket
ls -la /var/run/docker.sock
```

### State lock errors
```bash
# Force unlock (use carefully!)
terraform force-unlock <lock-id>
```

## Future Enhancements

- Cloud provider support (AWS, Azure, GCP)
- Remote state backend configuration
- Terraform Cloud integration
- Module management
- Cost estimation
- Security scanning

---

**Built for SDLC Demo** 🚀
