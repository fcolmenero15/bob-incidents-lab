# Ansible MCP Server

An MCP server that provides Ansible automation and configuration management capabilities through the Model Context Protocol.

## Features

### Tools

1. **run_playbook** - Execute Ansible playbooks
   - Supports check mode (dry run)
   - Tag filtering
   - Extra variables
   - Host limiting
   - Diff mode
   - Verbose output

2. **run_adhoc** - Run ad-hoc Ansible commands
   - Quick one-off tasks
   - Any Ansible module
   - Privilege escalation support

3. **list_inventory** - Inspect Ansible inventory
   - List all hosts and groups
   - Show inventory graph
   - Get host-specific details

4. **validate_playbook** - Validate playbook syntax
   - Syntax checking
   - YAML validation
   - Variable checking

5. **get_facts** - Gather system facts
   - Collect host information
   - Filter specific facts
   - Useful for inventory and decisions

6. **create_playbook** - Generate new playbooks
   - Create properly formatted YAML
   - Include tasks and configuration
   - Ready for execution

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

3. Add to MCP settings (`~/.config/IBM Bob/mcp_settings.json`):
```json
{
  "mcpServers": {
    "ansible": {
      "command": "node",
      "args": ["/path/to/ansible-mcp-server/build/index.js"]
    }
  }
}
```

## Prerequisites

- Ansible must be installed on your system
- Ansible CLI tools must be in your PATH
- Appropriate SSH keys/credentials configured for target hosts

## Usage Examples

### Run a Playbook
```typescript
use_mcp_tool("ansible", "run_playbook", {
  playbook: "./deploy.yml",
  inventory: "./inventory/production",
  extra_vars: '{"version": "1.2.3"}',
  check: true  // Dry run first
})
```

### Ad-hoc Command
```typescript
use_mcp_tool("ansible", "run_adhoc", {
  hosts: "webservers",
  module: "service",
  args: "name=nginx state=restarted",
  become: true
})
```

### Validate Playbook
```typescript
use_mcp_tool("ansible", "validate_playbook", {
  playbook: "./deploy.yml"
})
```

### Get System Facts
```typescript
use_mcp_tool("ansible", "get_facts", {
  hosts: "all",
  filter: "ansible_distribution*"
})
```

## Use Cases

- **Deployment Automation**: Deploy application updates
- **Configuration Management**: Manage system configurations
- **Infrastructure Orchestration**: Coordinate complex tasks
- **Compliance**: Apply security policies
- **Maintenance**: Run system maintenance tasks

## Integration with SDLC

Works alongside:
- **Terraform**: Provision infrastructure, then configure with Ansible
- **ServiceNow**: Track changes and approvals
- **CI/CD**: Automate deployment pipelines

## Development

Watch mode for development:
```bash
npm run watch
```

## License

MIT