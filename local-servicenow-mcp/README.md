# ServiceNow MCP Server

A Model Context Protocol (MCP) server that provides integration with ServiceNow, allowing AI assistants to interact with your ServiceNow instance.

## Features

This MCP server provides the following tools for ServiceNow integration:

- **get_incident**: Get details of a specific incident by number or sys_id
- **list_incidents**: List incidents with optional filters (state, assigned_to, active, limit)
- **create_incident**: Create a new incident
- **update_incident**: Update an existing incident (state, work notes, assignment)
- **search_knowledge**: Search the ServiceNow knowledge base
- **get_user**: Get user details by username or sys_id

## How It Works

The MCP server acts as a secure bridge between Bob and your ServiceNow instance:

```
Bob ←→ MCP Server ←→ ServiceNow REST API
```

## Requirements

### Find your ServiceNow credentials
1. If you don't have one already, go to `https://developer.servicenow.com/dev.do#!/home` to create an account and request an instance.
  - **Instance Name**: From your URL `https://dev12345.service-now.com`, use `dev12345`
2. Go to the profile page and generate a password
3. Log out, then log back in as `admin` with your generated password
4. You will be prompted to set a new password, do this and make a note of it


### Build the server:
```bash
cd local-servicenow-mcp
npm run build
```

## Testing with MCP Inspector

Test your server using the MCP Inspector:

1. **Install MCP Inspector** (if not already installed):
```bash
npm install -g @modelcontextprotocol/inspector
```

2. **Run the Inspector from the project root**:
```bash
npx @modelcontextprotocol/inspector node local-servicenow-mcp/dist/index.js
```

3. **Open the Inspector UI**:
   - The Inspector will start a web interface (usually at http://localhost:5173)
   - Your browser should open automatically

4. **Test Your Tools**:
   - You'll see all 6 ServiceNow tools listed
   - Click on any tool to test it
   - Fill in the parameters (e.g., incident number, search query)
   - Click "Execute" to call the ServiceNow API
   - View the response data

5. **Example Tests**:
   - **list_incidents**: Set `active` to "true" and `limit` to 5 to see active incidents
   - **get_incident**: Enter an incident number like "INC0010001"
   - **search_knowledge**: Search for "password reset"
   - **get_user**: Look up user "admin"

The Inspector is the best way to verify your ServiceNow connection and test all tools before using with Bob!

## Configuring with Bob (IBM's AI Assistant)

1. Create `.bob/mcp.json` in your project root (if it doesn't exist):
```json
{
  "mcpServers": {
    "servicenow": {
      "command": "node",
      "args": ["local-servicenow-mcp/dist/index.js"],
      "alwaysAllow": ["list_incidents"]
    }
  }
}
```

2. Ensure your root `.env` file contains your ServiceNow credentials (see Installation step 3)

3. Restart Bob to load the new MCP server

**Note**: The MCP server will automatically load credentials from the root `.env` file. You don't need to specify credentials in the `mcp.json` file.
