#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import * as path from "path";
import * as fs from "fs/promises";
import * as os from "os";

const execAsync = promisify(exec);

// Ensure common executable paths are in PATH
const commonPaths = [
  "/opt/homebrew/bin",
  "/opt/homebrew/sbin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
  "/home/linuxbrew/.linuxbrew/bin",
  path.join(os.homedir(), ".local/bin"),
];

// Add Python user-base bin directories where pip installs ansible
const homeDir = os.homedir();
if (process.platform === "darwin") {
  commonPaths.push(path.join(homeDir, "Library/Python/3.9/bin"));
  commonPaths.push(path.join(homeDir, "Library/Python/3.10/bin"));
  commonPaths.push(path.join(homeDir, "Library/Python/3.11/bin"));
  commonPaths.push(path.join(homeDir, "Library/Python/3.12/bin"));
  commonPaths.push(path.join(homeDir, "Library/Python/3.13/bin"));
}

const currentPath = process.env.PATH || "";
const pathSeparator = process.platform === "win32" ? ";" : ":";
const existingPaths = currentPath.split(pathSeparator);

const pathsToAdd = commonPaths.filter(p => p && !existingPaths.includes(p));
if (pathsToAdd.length > 0) {
  process.env.PATH = [...pathsToAdd, ...existingPaths].join(pathSeparator);
}

// Helper function to resolve and validate directory paths
async function validateDirectory(dir: string): Promise<string> {
  const resolvedPath = path.resolve(dir);
  try {
    const stats = await fs.stat(resolvedPath);
    if (stats.isDirectory()) {
      return resolvedPath;
    }
  } catch (e) {
    // Try relative to workspace root (parent of this server directory)
    const projectRootResolved = path.resolve(process.cwd(), "..", dir);
    try {
      const stats = await fs.stat(projectRootResolved);
      if (stats.isDirectory()) {
        return projectRootResolved;
      }
    } catch (e2) {
      throw new Error(`Directory does not exist: "${dir}" (attempted absolute: "${resolvedPath}", and relative to project root: "${projectRootResolved}"). Please ensure you provide a valid directory path.`);
    }
  }
  throw new Error(`Path exists but is not a directory: "${dir}"`);
}

// Tool schemas
const RunPlaybookSchema = z.object({
  playbook: z.string().describe("Path to the Ansible playbook file. Use absolute paths to avoid resolution errors."),
  inventory: z.string().optional().describe("Path to inventory file (optional). Use absolute paths to avoid resolution errors."),
  extra_vars: z.string().optional().describe("Extra variables in JSON format (optional)"),
  tags: z.string().optional().describe("Comma-separated list of tags to run (optional)"),
  skip_tags: z.string().optional().describe("Comma-separated list of tags to skip (optional)"),
  limit: z.string().optional().describe("Limit execution to specific hosts (optional)"),
  check: z.boolean().optional().describe("Run in check mode (dry run)"),
  diff: z.boolean().optional().describe("Show differences when changing files"),
  verbose: z.number().optional().describe("Verbosity level (0-4)"),
  cwd: z.string().optional().describe("Working directory to execute from"),
});

const RunAdHocSchema = z.object({
  hosts: z.string().describe("Host pattern to target"),
  module: z.string().describe("Ansible module to run (e.g., 'shell', 'copy', 'service')"),
  args: z.string().optional().describe("Module arguments"),
  inventory: z.string().optional().describe("Path to inventory file (optional). Use absolute paths to avoid resolution errors."),
  become: z.boolean().optional().describe("Run with privilege escalation"),
  cwd: z.string().optional().describe("Working directory to execute from"),
});

const ListInventorySchema = z.object({
  inventory: z.string().describe("Path to inventory file. Use absolute paths to avoid resolution errors."),
  host: z.string().optional().describe("Show details for specific host (optional)"),
  graph: z.boolean().optional().describe("Show inventory graph"),
  cwd: z.string().optional().describe("Working directory to execute from"),
});

const ValidatePlaybookSchema = z.object({
  playbook: z.string().describe("Path to the Ansible playbook file to validate. Use absolute paths to avoid resolution errors."),
  syntax_check: z.boolean().optional().describe("Perform syntax check only"),
  cwd: z.string().optional().describe("Working directory to execute from"),
});

const GetFactsSchema = z.object({
  hosts: z.string().describe("Host pattern to gather facts from"),
  inventory: z.string().optional().describe("Path to inventory file (optional). Use absolute paths to avoid resolution errors."),
  filter: z.string().optional().describe("Fact filter pattern (e.g., 'ansible_distribution*')"),
  cwd: z.string().optional().describe("Working directory to execute from"),
});

const CreatePlaybookSchema = z.object({
  path: z.string().describe("Path where to create the playbook. Use absolute paths to avoid resolution errors."),
  name: z.string().describe("Playbook name/description"),
  hosts: z.string().describe("Target hosts pattern"),
  tasks: z.string().describe("Tasks in YAML format"),
  become: z.boolean().optional().describe("Run with privilege escalation"),
  cwd: z.string().optional().describe("Working directory to execute from"),
});

// Helper function to execute Ansible commands
async function executeAnsible(
  command: string,
  cwd?: string
): Promise<{ stdout: string; stderr: string }> {
  try {
    let options: { cwd?: string; maxBuffer: number } = { maxBuffer: 1024 * 1024 * 10 };
    if (cwd) {
      options.cwd = await validateDirectory(cwd);
    }
    const { stdout, stderr } = await execAsync(command, options);
    return { stdout, stderr };
  } catch (error: any) {
    throw new Error(`Ansible command failed: ${error.message}\nStderr: ${error.stderr || ""}`);
  }
}

// Create server instance
const server = new Server(
  {
    name: "ansible-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools: Tool[] = [
    {
      name: "run_playbook",
      description:
        "Execute an Ansible playbook. Supports check mode, tags, extra variables, and more. Use this for deploying configurations, running updates, or orchestrating complex tasks. IMPORTANT: Always use absolute paths for playbook and inventory — relative paths will fail with 'could not be found'. Do NOT use the cwd parameter; it causes a 'spawn /bin/sh ENOENT' error on some systems.",
      inputSchema: {
        type: "object",
        properties: {
          playbook: {
            type: "string",
            description: "Absolute path to the Ansible playbook file. Relative paths will fail.",
          },
          inventory: {
            type: "string",
            description: "Absolute path to inventory file (optional). Relative paths will fail.",
          },
          extra_vars: {
            type: "string",
            description: "Extra variables in JSON format (optional)",
          },
          tags: {
            type: "string",
            description: "Comma-separated list of tags to run (optional)",
          },
          skip_tags: {
            type: "string",
            description: "Comma-separated list of tags to skip (optional)",
          },
          limit: {
            type: "string",
            description: "Limit execution to specific hosts (optional)",
          },
          check: {
            type: "boolean",
            description: "Run in check mode (dry run)",
          },
          diff: {
            type: "boolean",
            description: "Show differences when changing files",
          },
          verbose: {
            type: "number",
            description: "Verbosity level (0-4)",
          },
          cwd: {
            type: "string",
            description: "WARNING: Do not use. Setting cwd causes 'spawn /bin/sh ENOENT' on some systems. Use absolute paths for playbook and inventory instead.",
          },
        },
        required: ["playbook"],
      },
    },
    {
      name: "run_adhoc",
      description:
        "Run an ad-hoc Ansible command on target hosts. Useful for quick tasks like checking service status, copying files, or running shell commands without creating a playbook. For shell commands use module='shell' with args as the full shell command. IMPORTANT: (1) Always pass inventory with an absolute path. (2) Do NOT use the cwd parameter — it causes 'spawn /bin/sh ENOENT'. (3) For shell module, avoid Go template syntax like {{.Names}} in args — Ansible's argument parser strips curly braces; use docker inspect or alternative commands instead.",
      inputSchema: {
        type: "object",
        properties: {
          hosts: {
            type: "string",
            description: "Host pattern to target",
          },
          module: {
            type: "string",
            description: "Ansible module to run (e.g., 'shell', 'copy', 'service', 'uri'). Use 'shell' to run arbitrary shell commands or terraform CLI commands.",
          },
          args: {
            type: "string",
            description: "Module arguments. For shell module: the full command string, e.g. 'curl -s http://localhost/health'. WARNING: Do not use Go template syntax ({{.Field}}) — Ansible's argument parser strips curly braces. Use 'docker inspect' or 'docker ps --format json' instead.",
          },
          inventory: {
            type: "string",
            description: "Absolute path to inventory file. Required when targeting non-localhost hosts.",
          },
          become: {
            type: "boolean",
            description: "Run with privilege escalation",
          },
          cwd: {
            type: "string",
            description: "WARNING: Do not use. Setting cwd causes 'spawn /bin/sh ENOENT' on some systems.",
          },
        },
        required: ["hosts", "module"],
      },
    },
    {
      name: "list_inventory",
      description:
        "List and inspect Ansible inventory. Shows available hosts, groups, and their variables. Can display inventory graph or details for specific hosts.",
      inputSchema: {
        type: "object",
        properties: {
          inventory: {
            type: "string",
            description: "Path to inventory file",
          },
          host: {
            type: "string",
            description: "Show details for specific host (optional)",
          },
          graph: {
            type: "boolean",
            description: "Show inventory graph",
          },
          cwd: {
            type: "string",
            description: "Working directory to execute from",
          },
        },
        required: ["inventory"],
      },
    },
    {
      name: "validate_playbook",
      description:
        "Validate Ansible playbook syntax and structure. Checks for YAML syntax errors, undefined variables, and other issues before execution.",
      inputSchema: {
        type: "object",
        properties: {
          playbook: {
            type: "string",
            description: "Path to the Ansible playbook file to validate",
          },
          syntax_check: {
            type: "boolean",
            description: "Perform syntax check only",
          },
          cwd: {
            type: "string",
            description: "Working directory to execute from",
          },
        },
        required: ["playbook"],
      },
    },
    {
      name: "get_facts",
      description:
        "Gather system facts from target hosts. Collects information about OS, hardware, network, and more. Useful for inventory and configuration decisions.",
      inputSchema: {
        type: "object",
        properties: {
          hosts: {
            type: "string",
            description: "Host pattern to gather facts from",
          },
          inventory: {
            type: "string",
            description: "Path to inventory file (optional)",
          },
          filter: {
            type: "string",
            description: "Fact filter pattern (e.g., 'ansible_distribution*')",
          },
          cwd: {
            type: "string",
            description: "Working directory to execute from",
          },
        },
        required: ["hosts"],
      },
    },
    {
      name: "create_playbook",
      description:
        "Create a new Ansible playbook file with specified tasks. Generates a properly formatted YAML playbook ready for execution.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path where to create the playbook",
          },
          name: {
            type: "string",
            description: "Playbook name/description",
          },
          hosts: {
            type: "string",
            description: "Target hosts pattern",
          },
          tasks: {
            type: "string",
            description: "Tasks in YAML format",
          },
          become: {
            type: "boolean",
            description: "Run with privilege escalation",
          },
          cwd: {
            type: "string",
            description: "Working directory to execute from",
          },
        },
        required: ["path", "name", "hosts", "tasks"],
      },
    },
  ];

  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "run_playbook": {
        const parsed = RunPlaybookSchema.parse(args);
        let command = `ansible-playbook ${parsed.playbook}`;

        if (parsed.inventory) command += ` -i ${parsed.inventory}`;
        if (parsed.extra_vars) command += ` --extra-vars '${parsed.extra_vars}'`;
        if (parsed.tags) command += ` --tags ${parsed.tags}`;
        if (parsed.skip_tags) command += ` --skip-tags ${parsed.skip_tags}`;
        if (parsed.limit) command += ` --limit ${parsed.limit}`;
        if (parsed.check) command += ` --check`;
        if (parsed.diff) command += ` --diff`;
        if (parsed.verbose) command += ` -${"v".repeat(parsed.verbose)}`;

        const result = await executeAnsible(command, parsed.cwd);
        return {
          content: [
            {
              type: "text",
              text: `Playbook execution completed:\n\n${result.stdout}\n${result.stderr}`,
            },
          ],
        };
      }

      case "run_adhoc": {
        const parsed = RunAdHocSchema.parse(args);
        let command = `ansible ${parsed.hosts} -m ${parsed.module}`;

        if (parsed.args) command += ` -a "${parsed.args}"`;
        if (parsed.inventory) command += ` -i ${parsed.inventory}`;
        if (parsed.become) command += ` --become`;

        const result = await executeAnsible(command, parsed.cwd);
        return {
          content: [
            {
              type: "text",
              text: `Ad-hoc command completed:\n\n${result.stdout}\n${result.stderr}`,
            },
          ],
        };
      }

      case "list_inventory": {
        const parsed = ListInventorySchema.parse(args);
        let command = `ansible-inventory -i ${parsed.inventory}`;

        if (parsed.host) command += ` --host ${parsed.host}`;
        else if (parsed.graph) command += ` --graph`;
        else command += ` --list`;

        const result = await executeAnsible(command, parsed.cwd);
        return {
          content: [
            {
              type: "text",
              text: `Inventory:\n\n${result.stdout}`,
            },
          ],
        };
      }

      case "validate_playbook": {
        const parsed = ValidatePlaybookSchema.parse(args);
        const command = `ansible-playbook ${parsed.playbook} --syntax-check`;

        const result = await executeAnsible(command, parsed.cwd);
        return {
          content: [
            {
              type: "text",
              text: `Playbook validation:\n\n${result.stdout}\n${result.stderr}`,
            },
          ],
        };
      }

      case "get_facts": {
        const parsed = GetFactsSchema.parse(args);
        let command = `ansible ${parsed.hosts} -m setup`;

        if (parsed.inventory) command += ` -i ${parsed.inventory}`;
        if (parsed.filter) command += ` -a "filter=${parsed.filter}"`;

        const result = await executeAnsible(command, parsed.cwd);
        return {
          content: [
            {
              type: "text",
              text: `Facts gathered:\n\n${result.stdout}`,
            },
          ],
        };
      }

      case "create_playbook": {
        const parsed = CreatePlaybookSchema.parse(args);
        const playbook = `---
- name: ${parsed.name}
  hosts: ${parsed.hosts}
${parsed.become ? "  become: yes\n" : ""}  tasks:
${parsed.tasks.split("\n").map((line) => `    ${line}`).join("\n")}
`;

        const fs = await import("fs/promises");
        await fs.writeFile(parsed.path, playbook, "utf-8");

        return {
          content: [
            {
              type: "text",
              text: `Playbook created at ${parsed.path}:\n\n${playbook}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ansible MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

// Made with Bob
