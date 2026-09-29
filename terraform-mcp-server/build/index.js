#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
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
const currentPath = process.env.PATH || "";
const pathSeparator = process.platform === "win32" ? ";" : ":";
const existingPaths = currentPath.split(pathSeparator);
const pathsToAdd = commonPaths.filter(p => p && !existingPaths.includes(p));
if (pathsToAdd.length > 0) {
    process.env.PATH = [...pathsToAdd, ...existingPaths].join(pathSeparator);
}
// Helper function to resolve and validate directory paths
async function validateDirectory(dir) {
    const resolvedPath = path.resolve(dir);
    try {
        const stats = await fs.stat(resolvedPath);
        if (stats.isDirectory()) {
            return resolvedPath;
        }
    }
    catch (e) {
        // Try relative to workspace root (parent of this server directory)
        const projectRootResolved = path.resolve(process.cwd(), "..", dir);
        try {
            const stats = await fs.stat(projectRootResolved);
            if (stats.isDirectory()) {
                return projectRootResolved;
            }
        }
        catch (e2) {
            throw new Error(`Directory does not exist: "${dir}" (attempted absolute: "${resolvedPath}", and relative to project root: "${projectRootResolved}"). Please ensure you provide a valid directory path.`);
        }
    }
    throw new Error(`Path exists but is not a directory: "${dir}"`);
}
// Terraform MCP Server for SDLC Demo
// Supports local providers (Docker, Local, Null) for demonstration purposes
class TerraformServer {
    server;
    workingDir;
    constructor() {
        this.server = new Server({
            name: "terraform-mcp-server",
            version: "0.1.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        // Default working directory (can be overridden by tools)
        this.workingDir = process.env.TERRAFORM_WORKING_DIR || os.homedir();
        this.setupToolHandlers();
        // Error handling
        this.server.onerror = (error) => console.error("[MCP Error]", error);
        process.on("SIGINT", async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: this.getTools(),
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => this.handleToolCall(request.params.name, request.params.arguments ?? {}));
    }
    getTools() {
        return [
            {
                name: "terraform_init",
                description: "Initialize a Terraform working directory. Downloads providers and modules specified in configuration files. IMPORTANT: This tool may fail with 'spawn /bin/sh ENOENT' on some systems. If it does, use the Ansible run_adhoc tool with module='shell' and args='cd <absolute_path> && terraform init' as a reliable fallback.",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Absolute path to Terraform configuration directory.",
                        },
                        upgrade: {
                            type: "boolean",
                            description: "Upgrade modules and plugins to latest versions",
                            default: false,
                        },
                    },
                },
            },
            {
                name: "terraform_plan",
                description: "Create an execution plan showing what Terraform will do. Use this before apply to preview changes. IMPORTANT: This tool may fail with 'spawn /bin/sh ENOENT' on some systems. If it does, use the Ansible run_adhoc tool with module='shell' and args='cd <absolute_path> && terraform plan' as a reliable fallback.",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Absolute path to Terraform configuration directory.",
                        },
                        var_file: {
                            type: "string",
                            description: "Path to variable file (.tfvars)",
                        },
                        out: {
                            type: "string",
                            description: "Save plan to file",
                        },
                    },
                },
            },
            {
                name: "terraform_apply",
                description: "Apply Terraform configuration to create/update infrastructure. Use with caution in production! IMPORTANT: This tool may fail with 'spawn /bin/sh ENOENT' on some systems. If it does, use the Ansible run_adhoc tool with module='shell' and args='cd <absolute_path> && terraform apply -auto-approve' as a reliable fallback. For -replace, use args='cd <absolute_path> && terraform apply -auto-approve -replace=\"resource.name\"'.",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Absolute path to Terraform configuration directory.",
                        },
                        var_file: {
                            type: "string",
                            description: "Absolute path to variable file (.tfvars)",
                        },
                        auto_approve: {
                            type: "boolean",
                            description: "Skip interactive approval (use carefully!)",
                            default: false,
                        },
                        plan_file: {
                            type: "string",
                            description: "Apply a saved plan file",
                        },
                    },
                },
            },
            {
                name: "terraform_destroy",
                description: "Destroy all resources managed by Terraform configuration. This is destructive! IMPORTANT: This tool may fail with 'spawn /bin/sh ENOENT' on some systems. If it does, use the Ansible run_adhoc tool with module='shell' and args='cd <absolute_path> && terraform destroy -auto-approve' as a reliable fallback.",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Absolute path to Terraform configuration directory.",
                        },
                        auto_approve: {
                            type: "boolean",
                            description: "Skip interactive approval (use carefully!)",
                            default: false,
                        },
                    },
                },
            },
            {
                name: "terraform_show",
                description: "Show current state or saved plan in human-readable format. IMPORTANT: This tool may fail with 'spawn /bin/sh ENOENT' on some systems. Use Ansible run_adhoc shell as fallback.",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Absolute path to Terraform configuration directory.",
                        },
                        plan_file: {
                            type: "string",
                            description: "Show a saved plan file instead of current state",
                        },
                        json: {
                            type: "boolean",
                            description: "Output in JSON format",
                            default: false,
                        },
                    },
                },
            },
            {
                name: "terraform_state_list",
                description: "List all resources in the Terraform state. IMPORTANT: This tool may fail with 'spawn /bin/sh ENOENT' on some systems. Use Ansible run_adhoc shell as fallback.",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Absolute path to Terraform configuration directory.",
                        },
                    },
                },
            },
            {
                name: "terraform_output",
                description: "Read output values from Terraform state. IMPORTANT: This tool may fail with 'spawn /bin/sh ENOENT' on some systems. Use Ansible run_adhoc shell as fallback.",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Absolute path to Terraform configuration directory.",
                        },
                        name: {
                            type: "string",
                            description: "Specific output name to retrieve",
                        },
                        json: {
                            type: "boolean",
                            description: "Output in JSON format",
                            default: false,
                        },
                    },
                },
            },
            {
                name: "terraform_validate",
                description: "Validate Terraform configuration files for syntax and consistency. IMPORTANT: This tool may fail with 'spawn /bin/sh ENOENT' on some systems. Use Ansible run_adhoc shell as fallback: args='cd <absolute_path> && terraform validate'.",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Absolute path to Terraform configuration directory.",
                        },
                        json: {
                            type: "boolean",
                            description: "Output in JSON format",
                            default: false,
                        },
                    },
                },
            },
            {
                name: "terraform_fmt",
                description: "Format Terraform configuration files to canonical style",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Path to Terraform configuration directory. Use absolute paths to avoid resolution errors.",
                        },
                        check: {
                            type: "boolean",
                            description: "Check if files are formatted without modifying",
                            default: false,
                        },
                        recursive: {
                            type: "boolean",
                            description: "Process subdirectories recursively",
                            default: false,
                        },
                    },
                },
            },
            {
                name: "terraform_workspace_list",
                description: "List all Terraform workspaces",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Path to Terraform configuration directory. Use absolute paths to avoid resolution errors.",
                        },
                    },
                },
            },
            {
                name: "terraform_workspace_new",
                description: "Create a new Terraform workspace",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Path to Terraform configuration directory. Use absolute paths to avoid resolution errors.",
                        },
                        name: {
                            type: "string",
                            description: "Name of the new workspace",
                        },
                    },
                    required: ["name"],
                },
            },
            {
                name: "terraform_workspace_select",
                description: "Switch to a different Terraform workspace",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Path to Terraform configuration directory. Use absolute paths to avoid resolution errors.",
                        },
                        name: {
                            type: "string",
                            description: "Name of the workspace to select",
                        },
                    },
                    required: ["name"],
                },
            },
            {
                name: "create_terraform_config",
                description: "Create a sample Terraform configuration file for Docker provider (demo purposes)",
                inputSchema: {
                    type: "object",
                    properties: {
                        working_dir: {
                            type: "string",
                            description: "Directory where to create the configuration",
                        },
                        provider: {
                            type: "string",
                            description: "Provider type: docker, local, or null",
                            enum: ["docker", "local", "null"],
                            default: "docker",
                        },
                    },
                },
            },
        ];
    }
    async handleToolCall(name, args) {
        try {
            const workingDir = args.working_dir || this.workingDir;
            switch (name) {
                case "terraform_init":
                    return await this.terraformInit(workingDir, args.upgrade);
                case "terraform_plan":
                    return await this.terraformPlan(workingDir, args.var_file, args.out);
                case "terraform_apply":
                    return await this.terraformApply(workingDir, args.var_file, args.auto_approve, args.plan_file);
                case "terraform_destroy":
                    return await this.terraformDestroy(workingDir, args.auto_approve);
                case "terraform_show":
                    return await this.terraformShow(workingDir, args.plan_file, args.json);
                case "terraform_state_list":
                    return await this.terraformStateList(workingDir);
                case "terraform_output":
                    return await this.terraformOutput(workingDir, args.name, args.json);
                case "terraform_validate":
                    return await this.terraformValidate(workingDir, args.json);
                case "terraform_fmt":
                    return await this.terraformFmt(workingDir, args.check, args.recursive);
                case "terraform_workspace_list":
                    return await this.terraformWorkspaceList(workingDir);
                case "terraform_workspace_new":
                    return await this.terraformWorkspaceNew(workingDir, args.name);
                case "terraform_workspace_select":
                    return await this.terraformWorkspaceSelect(workingDir, args.name);
                case "create_terraform_config":
                    return await this.createTerraformConfig(workingDir, args.provider);
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error executing ${name}: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    }
    async runTerraformCommand(command, workingDir) {
        try {
            const validatedDir = await validateDirectory(workingDir);
            const result = await execAsync(command, {
                cwd: validatedDir,
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            });
            return result;
        }
        catch (error) {
            throw new Error(`Terraform command failed: ${error.message}\n${error.stderr || ""}`);
        }
    }
    async terraformInit(workingDir, upgrade = false) {
        const upgradeFlag = upgrade ? "-upgrade" : "";
        const { stdout, stderr } = await this.runTerraformCommand(`terraform init ${upgradeFlag}`, workingDir);
        return {
            content: [
                {
                    type: "text",
                    text: `Terraform initialized successfully in ${workingDir}\n\n${stdout}${stderr ? `\nWarnings:\n${stderr}` : ""}`,
                },
            ],
        };
    }
    async terraformPlan(workingDir, varFile, outFile) {
        let command = "terraform plan";
        if (varFile)
            command += ` -var-file="${varFile}"`;
        if (outFile)
            command += ` -out="${outFile}"`;
        const { stdout, stderr } = await this.runTerraformCommand(command, workingDir);
        return {
            content: [
                {
                    type: "text",
                    text: `Terraform Plan:\n\n${stdout}${stderr ? `\nWarnings:\n${stderr}` : ""}`,
                },
            ],
        };
    }
    async terraformApply(workingDir, varFile, autoApprove = false, planFile) {
        let command = "terraform apply";
        if (planFile) {
            command += ` "${planFile}"`;
        }
        else {
            if (varFile)
                command += ` -var-file="${varFile}"`;
            if (autoApprove)
                command += " -auto-approve";
        }
        const { stdout, stderr } = await this.runTerraformCommand(command, workingDir);
        return {
            content: [
                {
                    type: "text",
                    text: `Terraform Apply Complete:\n\n${stdout}${stderr ? `\nWarnings:\n${stderr}` : ""}`,
                },
            ],
        };
    }
    async terraformDestroy(workingDir, autoApprove = false) {
        let command = "terraform destroy";
        if (autoApprove)
            command += " -auto-approve";
        const { stdout, stderr } = await this.runTerraformCommand(command, workingDir);
        return {
            content: [
                {
                    type: "text",
                    text: `Terraform Destroy Complete:\n\n${stdout}${stderr ? `\nWarnings:\n${stderr}` : ""}`,
                },
            ],
        };
    }
    async terraformShow(workingDir, planFile, json = false) {
        let command = "terraform show";
        if (json)
            command += " -json";
        if (planFile)
            command += ` "${planFile}"`;
        const { stdout } = await this.runTerraformCommand(command, workingDir);
        return {
            content: [
                {
                    type: "text",
                    text: stdout || "No state or plan to show",
                },
            ],
        };
    }
    async terraformStateList(workingDir) {
        const { stdout } = await this.runTerraformCommand("terraform state list", workingDir);
        return {
            content: [
                {
                    type: "text",
                    text: stdout || "No resources in state",
                },
            ],
        };
    }
    async terraformOutput(workingDir, name, json = false) {
        let command = "terraform output";
        if (json)
            command += " -json";
        if (name)
            command += ` ${name}`;
        const { stdout } = await this.runTerraformCommand(command, workingDir);
        return {
            content: [
                {
                    type: "text",
                    text: stdout || "No outputs defined",
                },
            ],
        };
    }
    async terraformValidate(workingDir, json = false) {
        let command = "terraform validate";
        if (json)
            command += " -json";
        const { stdout } = await this.runTerraformCommand(command, workingDir);
        return {
            content: [
                {
                    type: "text",
                    text: stdout,
                },
            ],
        };
    }
    async terraformFmt(workingDir, check = false, recursive = false) {
        let command = "terraform fmt";
        if (check)
            command += " -check";
        if (recursive)
            command += " -recursive";
        const { stdout } = await this.runTerraformCommand(command, workingDir);
        return {
            content: [
                {
                    type: "text",
                    text: stdout || "All files are properly formatted",
                },
            ],
        };
    }
    async terraformWorkspaceList(workingDir) {
        const { stdout } = await this.runTerraformCommand("terraform workspace list", workingDir);
        return {
            content: [
                {
                    type: "text",
                    text: stdout,
                },
            ],
        };
    }
    async terraformWorkspaceNew(workingDir, name) {
        const { stdout } = await this.runTerraformCommand(`terraform workspace new ${name}`, workingDir);
        return {
            content: [
                {
                    type: "text",
                    text: stdout,
                },
            ],
        };
    }
    async terraformWorkspaceSelect(workingDir, name) {
        const { stdout } = await this.runTerraformCommand(`terraform workspace select ${name}`, workingDir);
        return {
            content: [
                {
                    type: "text",
                    text: stdout,
                },
            ],
        };
    }
    async createTerraformConfig(workingDir, provider = "docker") {
        const configs = {
            docker: `# Terraform configuration for Docker provider (local demo)
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

# Example: Create a Docker network
resource "docker_network" "demo_network" {
  name = "demo-network"
}

# Example: Create a Docker container
resource "docker_container" "demo_app" {
  name  = "demo-app"
  image = "nginx:alpine"
  
  ports {
    internal = 80
    external = 8080
  }
  
  networks_advanced {
    name = docker_network.demo_network.name
  }
}

# Output the container ID
output "container_id" {
  value = docker_container.demo_app.id
}

output "container_name" {
  value = docker_container.demo_app.name
}
`,
            local: `# Terraform configuration for Local provider (file management demo)
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

# Example: Create a local file
resource "local_file" "demo_config" {
  filename = "\${path.module}/demo-config.txt"
  content  = "This file was created by Terraform!"
}

# Example: Create a directory structure
resource "local_file" "app_config" {
  filename = "\${path.module}/config/app.json"
  content = jsonencode({
    app_name = "demo-app"
    version  = "1.0.0"
    environment = "development"
  })
}

output "config_file_path" {
  value = local_file.demo_config.filename
}
`,
            null: `# Terraform configuration for Null provider (workflow demo)
terraform {
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

# Example: Run a local command
resource "null_resource" "demo_command" {
  provisioner "local-exec" {
    command = "echo 'Terraform is managing this resource!'"
  }
  
  triggers = {
    always_run = timestamp()
  }
}

# Example: Demonstrate dependencies
resource "null_resource" "step_1" {
  provisioner "local-exec" {
    command = "echo 'Step 1: Initialize'"
  }
}

resource "null_resource" "step_2" {
  depends_on = [null_resource.step_1]
  
  provisioner "local-exec" {
    command = "echo 'Step 2: Configure'"
  }
}

output "execution_time" {
  value = timestamp()
}
`,
        };
        const config = configs[provider];
        if (!config) {
            throw new Error(`Unknown provider: ${provider}`);
        }
        const configPath = path.join(workingDir, "main.tf");
        await fs.mkdir(workingDir, { recursive: true });
        await fs.writeFile(configPath, config);
        return {
            content: [
                {
                    type: "text",
                    text: `Created Terraform configuration for ${provider} provider at ${configPath}\n\nNext steps:\n1. Run 'terraform init' to initialize\n2. Run 'terraform plan' to preview changes\n3. Run 'terraform apply' to create resources`,
                },
            ],
        };
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Terraform MCP server running on stdio");
    }
}
const server = new TerraformServer();
server.run().catch(console.error);
// Made with Bob
//# sourceMappingURL=index.js.map