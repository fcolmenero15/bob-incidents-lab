#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";
import dotenv from "dotenv";

dotenv.config();

// ServiceNow configuration
const SERVICENOW_INSTANCE = process.env.SERVICENOW_INSTANCE;
const SERVICENOW_USERNAME = process.env.SERVICENOW_USERNAME;
const SERVICENOW_PASSWORD = process.env.SERVICENOW_PASSWORD;

if (!SERVICENOW_INSTANCE || !SERVICENOW_USERNAME || !SERVICENOW_PASSWORD) {
  console.error("Error: Missing required ServiceNow credentials in .env file");
  console.error("Required: SERVICENOW_INSTANCE, SERVICENOW_USERNAME, SERVICENOW_PASSWORD");
  process.exit(1);
}

// Create axios instance for ServiceNow API
const serviceNowClient: AxiosInstance = axios.create({
  baseURL: `https://${SERVICENOW_INSTANCE}.service-now.com/api/now`,
  auth: {
    username: SERVICENOW_USERNAME,
    password: SERVICENOW_PASSWORD,
  },
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "get_incident",
    description: "Get details of a specific incident by number or sys_id",
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description: "Incident number (e.g., INC0010001) or sys_id",
        },
      },
      required: ["identifier"],
    },
  },
  {
    name: "list_incidents",
    description: "List incidents with optional filters. Note: Some ServiceNow instances may not properly filter by the 'active' field - if you need active incidents, use state filter with values 1, 2, or 3 instead.",
    inputSchema: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description: "Filter by state (1=New, 2=In Progress, 3=On Hold, 6=Resolved, 7=Closed, 8=Canceled). States 1-3 are active, 6-8 are inactive.",
        },
        assigned_to: {
          type: "string",
          description: "Filter by assigned user",
        },
        active: {
          type: "string",
          description: "Filter by active status ('true' or 'false'). WARNING: This filter may not work on all ServiceNow instances. If it doesn't work, use the 'state' filter instead (1-3 for active, 6-8 for inactive).",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
        },
      },
    },
  },
  {
    name: "create_incident",
    description: "Create a new incident",
    inputSchema: {
      type: "object",
      properties: {
        short_description: {
          type: "string",
          description: "Brief description of the incident",
        },
        description: {
          type: "string",
          description: "Detailed description of the incident",
        },
        urgency: {
          type: "string",
          description: "Urgency level (1-High, 2-Medium, 3-Low)",
        },
        impact: {
          type: "string",
          description: "Impact level (1-High, 2-Medium, 3-Low)",
        },
      },
      required: ["short_description"],
    },
  },
  {
    name: "update_incident",
    description: "Update an existing incident",
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description: "Incident number (e.g., INC0010001) or sys_id",
        },
        state: {
          type: "string",
          description: "New state (1=New, 2=In Progress, 3=On Hold, 6=Resolved, 7=Closed, 8=Canceled)",
        },
        work_notes: {
          type: "string",
          description: "Work notes to add",
        },
        assigned_to: {
          type: "string",
          description: "User to assign the incident to",
        },
        close_code: {
          type: "string",
          description: "Resolution code (required when closing: state=6 or state=7). Valid values: 'Solution provided', 'Workaround provided', 'Resolved by caller', 'Resolved by request', 'Resolved by problem', 'Resolved by change', 'Known error', 'User error', 'Duplicate', 'No resolution provided'",
        },
        close_notes: {
          type: "string",
          description: "Close notes (required when closing: state=6 or state=7). Detailed explanation of how the incident was resolved.",
        },
      },
      required: ["identifier"],
    },
  },
  {
    name: "search_knowledge",
    description: "Search the knowledge base",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_user",
    description: "Get user details by username or sys_id",
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description: "Username or sys_id",
        },
      },
      required: ["identifier"],
    },
  },
];

// Create server instance
const server = new Server(
  {
    name: "servicenow-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to find incident by number or sys_id
async function findIncident(identifier: string) {
  try {
    // Try as sys_id first
    if (identifier.length === 32) {
      const response = await serviceNowClient.get(`/table/incident/${identifier}`);
      return response.data.result;
    }
    
    // Try as incident number
    const response = await serviceNowClient.get("/table/incident", {
      params: {
        sysparm_query: `number=${identifier}`,
        sysparm_limit: 1,
      },
    });
    
    if (response.data.result && response.data.result.length > 0) {
      return response.data.result[0];
    }
    
    throw new Error(`Incident not found: ${identifier}`);
  } catch (error: any) {
    const errorDetails = error.response?.data?.error || error.response?.data || {};
    const errorMessage = errorDetails.message || error.message;
    const errorDetail = errorDetails.detail || '';
    
    let fullError = `Failed to find incident: ${errorMessage}`;
    if (errorDetail) {
      fullError += `\nDetail: ${errorDetail}`;
    }
    if (error.response?.status) {
      fullError += `\nHTTP Status: ${error.response.status}`;
    }
    if (error.response?.data) {
      fullError += `\nFull Response: ${JSON.stringify(error.response.data, null, 2)}`;
    }
    
    throw new Error(fullError);
  }
}

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Missing arguments",
        },
      ],
      isError: true,
    };
  }

  try {
    switch (name) {
      case "get_incident": {
        const incident = await findIncident(args.identifier as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(incident, null, 2),
            },
          ],
        };
      }

      case "list_incidents": {
        try {
          const params: any = {
            sysparm_limit: args.limit || 10,
          };

          // Build query parts - all filters must be in sysparm_query
          const queryParts: string[] = [];
          
          // Add active filter
          if (args.active !== undefined) {
            const activeValue = (args.active === "true" || args.active === true) ? "true" : "false";
            queryParts.push(`active=${activeValue}`);
          }
          
          // Add state filter
          if (args.state) {
            queryParts.push(`state=${args.state}`);
          }
          
          // Add assigned_to filter
          if (args.assigned_to) {
            queryParts.push(`assigned_to.user_name=${args.assigned_to}`);
          }

          // Only set sysparm_query if we have filters
          if (queryParts.length > 0) {
            params.sysparm_query = queryParts.join("^");
          }

          const response = await serviceNowClient.get("/table/incident", { params });
          
          if (!response.data || !response.data.result) {
            return {
              content: [
                {
                  type: "text",
                  text: `No incidents found or invalid response from ServiceNow API. Response: ${JSON.stringify(response.data)}`,
                },
              ],
            };
          }
          
          const incidents = response.data.result;
          if (incidents.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "No incidents found matching the criteria",
                },
              ],
            };
          }
          
          let resultText = `Found ${incidents.length} incident(s):\n\n`;
          incidents.forEach((inc: any, index: number) => {
            resultText += `${index + 1}. ${inc.number} - ${inc.short_description}\n`;
            resultText += `   State: ${inc.state} | Urgency: ${inc.urgency} | Impact: ${inc.impact}\n`;
            if (inc.assigned_to) {
              resultText += `   Assigned to: ${inc.assigned_to.display_value || inc.assigned_to}\n`;
            }
            resultText += `\n`;
          });
          
          return {
            content: [
              {
                type: "text",
                text: resultText,
              },
            ],
          };
        } catch (apiError: any) {
          const errorDetails = apiError.response?.data?.error || apiError.response?.data || {};
          const errorMessage = errorDetails.message || apiError.message;
          const errorDetail = errorDetails.detail || '';
          
          let fullError = `ServiceNow API Error: ${errorMessage}`;
          if (errorDetail) {
            fullError += `\nDetail: ${errorDetail}`;
          }
          if (apiError.response?.status) {
            fullError += `\nHTTP Status: ${apiError.response.status}`;
          }
          if (apiError.response?.data) {
            fullError += `\nFull Response: ${JSON.stringify(apiError.response.data, null, 2)}`;
          }
          
          throw new Error(fullError);
        }
      }

      case "create_incident": {
        const incidentData: any = {
          short_description: args.short_description,
        };

        if (args.description) incidentData.description = args.description;
        if (args.urgency) incidentData.urgency = args.urgency;
        if (args.impact) incidentData.impact = args.impact;

        try {
          const response = await serviceNowClient.post("/table/incident", incidentData);
          
          console.error("ServiceNow API Response:", JSON.stringify(response.data, null, 2));
          
          if (!response.data || !response.data.result) {
            throw new Error(`Invalid response from ServiceNow API. Response: ${JSON.stringify(response.data)}`);
          }
          
          const result = response.data.result;
          const resultText = `Incident created successfully:
Number: ${result.number}
Sys ID: ${result.sys_id}
Short Description: ${result.short_description}
State: ${result.state}
Urgency: ${result.urgency}
Impact: ${result.impact}`;
          
          return {
            content: [
              {
                type: "text",
                text: resultText,
              },
            ],
          };
        } catch (apiError: any) {
          console.error("ServiceNow API Error:", apiError.response?.data || apiError.message);
          throw new Error(`ServiceNow API call failed: ${apiError.response?.data?.error?.message || apiError.message}`);
        }
      }

      case "update_incident": {
        try {
          const incident = await findIncident(args.identifier as string);
          const updateData: any = {};

          if (args.state) updateData.state = args.state;
          if (args.work_notes) updateData.work_notes = args.work_notes;
          if (args.assigned_to) updateData.assigned_to = args.assigned_to;
          if (args.close_code) updateData.close_code = args.close_code;
          if (args.close_notes) updateData.close_notes = args.close_notes;

          const response = await serviceNowClient.patch(
            `/table/incident/${incident.sys_id}`,
            updateData
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.data.result, null, 2),
              },
            ],
          };
        } catch (apiError: any) {
          const errorDetails = apiError.response?.data?.error || apiError.response?.data || {};
          const errorMessage = errorDetails.message || apiError.message;
          const errorDetail = errorDetails.detail || '';
          
          let fullError = `ServiceNow API Error (update_incident): ${errorMessage}`;
          if (errorDetail) {
            fullError += `\nDetail: ${errorDetail}`;
          }
          if (apiError.response?.status) {
            fullError += `\nHTTP Status: ${apiError.response.status}`;
          }
          if (apiError.response?.data) {
            fullError += `\nFull Response: ${JSON.stringify(apiError.response.data, null, 2)}`;
          }
          
          throw new Error(fullError);
        }
      }

      case "search_knowledge": {
        try {
          const response = await serviceNowClient.get("/table/kb_knowledge", {
            params: {
              sysparm_query: `textLIKE${args.query}`,
              sysparm_limit: args.limit || 5,
            },
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.data.result, null, 2),
              },
            ],
          };
        } catch (apiError: any) {
          const errorDetails = apiError.response?.data?.error || apiError.response?.data || {};
          const errorMessage = errorDetails.message || apiError.message;
          const errorDetail = errorDetails.detail || '';
          
          let fullError = `ServiceNow API Error (search_knowledge): ${errorMessage}`;
          if (errorDetail) {
            fullError += `\nDetail: ${errorDetail}`;
          }
          if (apiError.response?.status) {
            fullError += `\nHTTP Status: ${apiError.response.status}`;
          }
          if (apiError.response?.data) {
            fullError += `\nFull Response: ${JSON.stringify(apiError.response.data, null, 2)}`;
          }
          
          throw new Error(fullError);
        }
      }

      case "get_user": {
        try {
          const identifier = args.identifier as string;
          let response;

          // Try as sys_id first
          if (identifier.length === 32) {
            response = await serviceNowClient.get(`/table/sys_user/${identifier}`);
          } else {
            // Try as username
            response = await serviceNowClient.get("/table/sys_user", {
              params: {
                sysparm_query: `user_name=${identifier}`,
                sysparm_limit: 1,
              },
            });
          }

          const user = response.data.result.length
            ? response.data.result[0]
            : response.data.result;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(user, null, 2),
              },
            ],
          };
        } catch (apiError: any) {
          const errorDetails = apiError.response?.data?.error || apiError.response?.data || {};
          const errorMessage = errorDetails.message || apiError.message;
          const errorDetail = errorDetails.detail || '';
          
          let fullError = `ServiceNow API Error (get_user): ${errorMessage}`;
          if (errorDetail) {
            fullError += `\nDetail: ${errorDetail}`;
          }
          if (apiError.response?.status) {
            fullError += `\nHTTP Status: ${apiError.response.status}`;
          }
          if (apiError.response?.data) {
            fullError += `\nFull Response: ${JSON.stringify(apiError.response.data, null, 2)}`;
          }
          
          throw new Error(fullError);
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    // Extract detailed error information
    const errorDetails = error.response?.data?.error || error.response?.data || {};
    const errorMessage = errorDetails.message || error.message;
    const errorDetail = errorDetails.detail || '';
    
    let fullError = `Error: ${errorMessage}`;
    if (errorDetail) {
      fullError += `\nDetail: ${errorDetail}`;
    }
    if (error.response?.status) {
      fullError += `\nHTTP Status: ${error.response.status}`;
    }
    if (error.response?.statusText) {
      fullError += `\nStatus Text: ${error.response.statusText}`;
    }
    if (error.response?.data) {
      fullError += `\nAPI Response: ${JSON.stringify(error.response.data, null, 2)}`;
    }
    if (error.config?.url) {
      fullError += `\nEndpoint: ${error.config.url}`;
    }
    
    return {
      content: [
        {
          type: "text",
          text: fullError,
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
  console.error("ServiceNow MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

// Made with Bob
