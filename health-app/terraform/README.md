# Healthcare Portal - Terraform Infrastructure

This directory contains Terraform configuration to manage the Healthcare Portal Docker infrastructure as code.

## Overview

Instead of using `docker-compose`, this Terraform configuration provides:
- **Infrastructure as Code**: Version-controlled infrastructure definitions
- **State Management**: Track infrastructure changes over time
- **Environment Management**: Easy dev/staging/prod separation
- **Change Preview**: See what will change before applying
- **Dependency Management**: Automatic ordering of resource creation

## Architecture

```
┌─────────────────────────────────────────┐
│         Docker Network                   │
│      (healthcare-app-network)           │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │PostgreSQL│  │ Backend  │  │Frontend││
│  │  :5437   │  │  :5001   │  │  :8080 ││
│  │          │  │          │  │        ││
│  │ Volume:  │  │ Medical  │  │Patient ││
│  │postgres_ │  │ Records  │  │ Portal ││
│  │  data    │  │ & Claims │  │        ││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
```

## Prerequisites

1. **Terraform CLI** installed:
   ```bash
   brew install terraform
   ```

2. **Docker** running (Docker Desktop or Colima):
   ```bash
   docker ps  # Should not error
   ```

3. **Docker images** built:
   ```bash
   cd ../backend && docker build -t healthcare-app-backend .
   cd ../frontend && docker build -t healthcare-app-frontend .
   ```

## Quick Start

### 1. Initialize Terraform

```bash
cd health-app/terraform
terraform init
```

This downloads the Docker provider and prepares the working directory.

### 2. Preview Changes

```bash
terraform plan
```

Review what Terraform will create:
- 1 Docker network
- 1 Docker volume (for database persistence)
- 3 Docker containers (database, backend, frontend)

### 3. Apply Configuration

```bash
terraform apply
```

Type `yes` to confirm. Terraform will:
1. Create the Docker network
2. Create the PostgreSQL volume
3. Start the database container
4. Start the backend container (waits for database)
5. Start the frontend container (waits for backend)

### 4. Verify Deployment

```bash
# Check container status
terraform show

# Get output values
terraform output

# Access the application
open http://localhost
```

### 5. Destroy Infrastructure

```bash
terraform destroy
```

Type `yes` to remove all resources. **Warning**: This deletes the database volume and all data!

## Configuration

### Variables

Edit `terraform.tfvars` to customize:

```hcl
project_name   = "healthcare-app"
environment    = "dev"
db_port        = 5437
backend_port   = 5001
frontend_port  = 80
```

### Environments

Create environment-specific variable files:

**`dev.tfvars`**:
```hcl
environment    = "dev"
db_port        = 5437
backend_port   = 5001
frontend_port  = 80
```

**`staging.tfvars`**:
```hcl
environment    = "staging"
db_port        = 5438
backend_port   = 5002
frontend_port  = 8080
```

**`prod.tfvars`**:
```hcl
environment    = "prod"
db_port        = 5439
backend_port   = 5003
frontend_port  = 8081
```

Apply with specific environment:
```bash
terraform apply -var-file="staging.tfvars"
```

## Terraform Workspaces

Manage multiple environments with workspaces:

```bash
# Create staging workspace
terraform workspace new staging

# Switch to staging
terraform workspace select staging

# Apply staging configuration
terraform apply -var-file="staging.tfvars"

# List workspaces
terraform workspace list

# Switch back to default
terraform workspace select default
```

## State Management

Terraform tracks infrastructure in a state file (`terraform.tfstate`).

**Important**:
- ⚠️ Never commit `terraform.tfstate` to git (contains sensitive data)
- ⚠️ State file is already in `.gitignore`
- For team collaboration, use remote state (S3, Terraform Cloud, etc.)

### View State

```bash
# List all resources
terraform state list

# Show specific resource
terraform state show docker_container.database

# View outputs
terraform output
terraform output -json
```

## Outputs

After applying, Terraform provides useful outputs:

```bash
$ terraform output

database_container_id = "abc123..."
database_port = 5437
backend_container_id = "def456..."
backend_url = "http://localhost:5001"
frontend_container_id = "ghi789..."
frontend_url = "http://localhost:8080"
network_name = "healthcare-app-network"
```

## Common Operations

### Update a Single Resource

```bash
# Recreate just the backend
terraform taint docker_container.backend
terraform apply
```

### Import Existing Resources

If you have containers running from docker-compose:

```bash
# Import existing container
terraform import docker_container.database bank-db
```

### Format Configuration

```bash
terraform fmt
```

### Validate Configuration

```bash
terraform validate
```

## Comparison with Docker Compose

| Feature | Docker Compose | Terraform |
|---------|---------------|-----------|
| State Tracking | ❌ No | ✅ Yes |
| Change Preview | ❌ No | ✅ Yes (`plan`) |
| Dependency Graph | ✅ Yes | ✅ Yes |
| Multi-Environment | ⚠️ Manual | ✅ Workspaces |
| Cloud Support | ❌ No | ✅ Yes |
| Rollback | ❌ Manual | ✅ State-based |

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :5437

# Change port in terraform.tfvars
db_port = 5440
```

### Container Build Fails

```bash
# Build images manually first
cd ../backend && docker build -t healthcare-app-backend .
cd ../frontend && docker build -t healthcare-app-frontend .
```

### State Lock Error

```bash
# If Terraform crashes, unlock state
terraform force-unlock <lock-id>
```

### Clean Start

```bash
# Destroy everything
terraform destroy -auto-approve

# Remove state
rm -rf .terraform terraform.tfstate*

# Reinitialize
terraform init
terraform apply
```

## SDLC Integration

This Terraform configuration demonstrates:

1. **Version Control**: Infrastructure definitions in git
2. **Code Review**: Changes reviewed via pull requests
3. **CI/CD**: Automated `terraform plan` in pipelines
4. **Environment Parity**: Same config for dev/staging/prod
5. **Audit Trail**: State history shows all changes
6. **Disaster Recovery**: Recreate infrastructure from code

## Next Steps

- Add remote state backend (S3, Terraform Cloud)
- Implement CI/CD pipeline with Terraform
- Add monitoring and alerting resources
- Extend to cloud providers (AWS, Azure, GCP)
- Integrate with ServiceNow for change management

---

**Infrastructure as Code for SDLC Demo** 🚀