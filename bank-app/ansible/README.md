# Ansible Configuration Management for Bank Simulator

This directory contains Ansible playbooks and inventory for managing the Bank Simulator application lifecycle.

## 📁 Directory Structure

```
ansible/
├── inventory/
│   └── hosts.yml          # Inventory configuration
├── playbooks/
│   ├── deploy.yml         # Full deployment workflow
│   ├── rollback.yml       # Safe teardown
│   ├── update-config.yml  # Configuration updates
│   └── backup-database.yml # Database backup
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Ansible installed (`brew install ansible` on macOS)
- Docker/Colima running
- Bank app images built

### Running Playbooks

```bash
# Full deployment (builds images + Terraform apply)
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml

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

Backend: http://localhost:5001/health
Frontend: http://localhost:80

Login credentials:
Username: demo
Password: demo123
```

### 2. update-config.yml - Configuration Updates

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

### 3. backup-database.yml - Database Backup

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

**Backup location:** `ansible/backups/bank-db-backup-<timestamp>.sql.gz`

**To restore:**
```bash
gunzip ansible/backups/bank-db-backup-<timestamp>.sql.gz
docker exec -i bank-app-dev-db psql -U postgres bankdb < ansible/backups/bank-db-backup-<timestamp>.sql
```

### 4. rollback.yml - Safe Teardown

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
    playbook: "bank-app/ansible/playbooks/deploy.yml",
    inventory: "bank-app/ansible/inventory/hosts.yml"
  }
})

// Ad-hoc command to check container status
use_mcp_tool({
  server_name: "ansible",
  tool_name: "run_adhoc",
  arguments: {
    hosts: "localhost",
    module: "shell",
    args: "docker ps --filter 'name=bank-'"
  }
})
```

## 🔄 SDLC Integration

### Typical Workflow

1. **ServiceNow Incident Created** → Ticket assigned to team
2. **Terraform Provisions Infrastructure** → Containers and networks created
3. **Ansible Deploys Application** → `deploy.yml` runs full deployment
4. **ServiceNow Updated** → Incident resolved with deployment details

### Change Management Workflow

1. **Change Request in ServiceNow** → Approval obtained
2. **Ansible Backup** → `backup-database.yml` creates safety backup
3. **Ansible Deploy Update** → `update-config.yml` applies changes
4. **ServiceNow Close** → Change marked complete

### Rollback Workflow

1. **Issue Detected** → ServiceNow incident created
2. **Ansible Rollback** → `rollback.yml` tears down infrastructure
3. **Terraform Destroy** → Infrastructure removed
4. **ServiceNow Updated** → Incident documented

## 📊 Variables

Key variables defined in `inventory/hosts.yml`:

```yaml
app_name: "bank-simulator"
backend_container: "bank-app-dev-backend"
frontend_container: "bank-app-dev-frontend"
database_container: "bank-app-dev-db"
backend_port: 5001
frontend_port: 80
database_port: 5437
backend_health_url: "http://localhost:5001/health"
frontend_url: "http://localhost:80"
```

## 🎯 Best Practices

1. **Create backups** before major changes
2. **Use check mode** to preview changes: `--check`
3. **Review logs** if deployment or updates fail
4. **Keep backups** for at least 7 days
5. **Document changes** in ServiceNow

## 🐛 Troubleshooting

### Playbook fails with "Docker not running"
```bash
# Start Colima
colima start
```

### Container not found
```bash
# Check if containers exist
docker ps -a --filter "name=bank-app-dev"

# Redeploy if needed
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml
```

### Backup fails
```bash
# Ensure database is running
docker ps -f name=bank-app-dev-db

# Check database connectivity
docker exec bank-app-dev-db psql -U postgres -d bankdb -c "SELECT 1"
```

## 🔗 Related Documentation

- [Terraform Configuration](../terraform/README.md)
- [Ansible MCP Server](../../ansible-mcp-server/README.md)
- [Bank App Documentation](../README.md)