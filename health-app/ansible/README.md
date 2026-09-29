# Ansible Configuration Management for Healthcare Simulator

This directory contains Ansible playbooks and inventory for managing the Healthcare Simulator application lifecycle.

## 📁 Directory Structure

```
ansible/
├── inventory/
│   └── hosts.yml          # Inventory configuration
├── playbooks/
│   ├── deploy.yml         # Full deployment workflow
│   ├── health-check.yml   # Health monitoring
│   ├── rollback.yml       # Safe teardown
│   ├── update-config.yml  # Configuration updates
│   └── backup-database.yml # Database backup
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Ansible installed (`brew install ansible` on macOS)
- Docker/Colima running
- Healthcare app images built

### Running Playbooks

```bash
# Full deployment (builds images + Terraform apply)
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml

# Health check
ansible-playbook -i inventory/hosts.yml playbooks/health-check.yml

# Update configuration
ansible-playbook -i inventory/hosts.yml playbooks/update-config.yml

# Backup database
ansible-playbook -i inventory/hosts.yml playbooks/backup-database.yml

# Rollback (destroy infrastructure)
ansible-playbook -i inventory/hosts.yml playbooks/rollback.yml
```

## 📋 Playbook Details

### 1. deploy.yml - Full Deployment

**Purpose:** Complete deployment workflow from build to running application

**What it does:**
- Checks Docker is running
- Builds backend and frontend images
- Initializes and applies Terraform
- Waits for containers to be healthy
- Verifies backend health endpoint
- Displays deployment summary

**Usage:**
```bash
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml
```

**Expected output:**
```
✅ Deployment Complete!

Backend: http://localhost:3001/health
Frontend: http://localhost:3000

Login credentials:
Username: demo
Password: demo123
```

### 2. health-check.yml - Health Monitoring

**Purpose:** Comprehensive health check of all services

**What it does:**
- Lists all healthcare-related containers
- Checks container running status
- Tests backend health endpoint
- Verifies frontend accessibility
- Reviews recent backend logs
- Generates detailed health report

**Usage:**
```bash
ansible-playbook -i inventory/hosts.yml playbooks/health-check.yml
```

**Expected output:**
```
🏥 HEALTHCARE SIMULATOR HEALTH CHECK REPORT

📦 Container Status:
Backend:  ✅ Running
Frontend: ✅ Running
Database: ✅ Running

🌐 Service Health:
Backend API:  ✅ Healthy
Frontend Web: ✅ Accessible
```

### 3. update-config.yml - Configuration Updates

**Purpose:** Update configuration without full redeployment

**What it does:**
- Checks container exists
- Displays current environment
- Gracefully restarts backend
- Waits for health check
- Verifies configuration applied

**Usage:**
```bash
ansible-playbook -i inventory/hosts.yml playbooks/update-config.yml
```

### 4. backup-database.yml - Database Backup

**Purpose:** Create compressed backup of PostgreSQL database

**What it does:**
- Creates backup directory
- Checks database is running
- Dumps database to SQL file
- Compresses backup with gzip
- Lists recent backups
- Provides restore instructions

**Usage:**
```bash
ansible-playbook -i inventory/hosts.yml playbooks/backup-database.yml
```

**Backup location:** `ansible/backups/healthcare-db-backup-<timestamp>.sql.gz`

**To restore:**
```bash
gunzip ansible/backups/healthcare-db-backup-<timestamp>.sql.gz
docker exec -i healthcare-database psql -U healthcareuser healthcaredb < ansible/backups/healthcare-db-backup-<timestamp>.sql
```

### 5. rollback.yml - Safe Teardown

**Purpose:** Safely destroy all infrastructure

**What it does:**
- Lists containers to be removed
- Runs Terraform destroy
- Verifies containers removed
- Cleans up dangling images
- Displays rollback summary

**Usage:**
```bash
ansible-playbook -i inventory/hosts.yml playbooks/rollback.yml
```

**With confirmation prompt:**
```bash
ansible-playbook -i inventory/hosts.yml playbooks/rollback.yml -e confirm_rollback=true
```

## 🔧 Using with IBM Bob MCP

The Ansible MCP server provides tools to run these playbooks:

```typescript
// Run deployment playbook
use_mcp_tool({
  server_name: "ansible",
  tool_name: "run_playbook",
  arguments: {
    playbook: "healthcare-app/ansible/playbooks/deploy.yml",
    inventory: "healthcare-app/ansible/inventory/hosts.yml"
  }
})

// Run health check
use_mcp_tool({
  server_name: "ansible",
  tool_name: "run_playbook",
  arguments: {
    playbook: "healthcare-app/ansible/playbooks/health-check.yml",
    inventory: "healthcare-app/ansible/inventory/hosts.yml"
  }
})

// Ad-hoc command to check container status
use_mcp_tool({
  server_name: "ansible",
  tool_name: "run_adhoc",
  arguments: {
    hosts: "localhost",
    module: "shell",
    args: "docker ps --filter 'name=healthcare-'"
  }
})
```

## 🔄 SDLC Integration

### Typical Workflow

1. **ServiceNow Incident Created** → Ticket assigned to team
2. **Terraform Provisions Infrastructure** → Containers and networks created
3. **Ansible Deploys Application** → `deploy.yml` runs full deployment
4. **Ansible Health Check** → `health-check.yml` verifies all services
5. **ServiceNow Updated** → Incident resolved with deployment details

### Change Management Workflow

1. **Change Request in ServiceNow** → Approval obtained
2. **Ansible Backup** → `backup-database.yml` creates safety backup
3. **Ansible Deploy Update** → `update-config.yml` applies changes
4. **Ansible Verify** → `health-check.yml` confirms success
5. **ServiceNow Close** → Change marked complete

### Rollback Workflow

1. **Issue Detected** → ServiceNow incident created
2. **Ansible Health Check** → `health-check.yml` identifies problem
3. **Ansible Rollback** → `rollback.yml` tears down infrastructure
4. **Terraform Destroy** → Infrastructure removed
5. **ServiceNow Updated** → Incident documented

## 📊 Variables

Key variables defined in `inventory/hosts.yml`:

```yaml
app_name: "healthcare-simulator"
backend_container: "healthcare-backend"
frontend_container: "healthcare-frontend"
database_container: "healthcare-database"
backend_port: 3001
frontend_port: 3000
database_port: 5432
backend_health_url: "http://localhost:3001/health"
frontend_url: "http://localhost:3000"
```

## 🎯 Best Practices

1. **Always run health checks** after deployments
2. **Create backups** before major changes
3. **Use check mode** to preview changes: `--check`
4. **Review logs** if health checks fail
5. **Keep backups** for at least 7 days
6. **Document changes** in ServiceNow

## 🐛 Troubleshooting

### Playbook fails with "Docker not running"
```bash
# Start Colima
colima start
```

### Container not found
```bash
# Check if containers exist
docker ps -a --filter "name=healthcare-"

# Redeploy if needed
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml
```

### Health check fails
```bash
# Check container logs
docker logs healthcare-backend
docker logs healthcare-frontend
docker logs healthcare-database

# Restart containers
ansible-playbook -i inventory/hosts.yml playbooks/update-config.yml
```

### Backup fails
```bash
# Ensure database is running
docker ps -f name=healthcare-database

# Check database connectivity
docker exec healthcare-database psql -U healthcareuser -d healthcaredb -c "SELECT 1"
```

## 🔗 Related Documentation

- [Terraform Configuration](../terraform/README.md)
- [Ansible MCP Server](../../ansible-mcp-server/README.md)
- [Healthcare App Documentation](../README.md)