import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "stitch",
  version: "0.1.0"
});

// Store mock data
let mockProjectId = "stitch-mock-" + Date.now();
const mockScreens = [
  { id: "screen_1", name: "Dashboard", url: "https://stitch.google.com/mock/screen_1" },
  { id: "screen_2", name: "Login", url: "https://stitch.google.com/mock/screen_2" }
];

server.tool("create_project",
  "Create a new Google Stitch project",
  {
    name: z.string().describe("Project name"),
    description: z.string().optional().describe("Project description")
  },
  async ({ name }) => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          projectId: mockProjectId,
          url: `https://stitch.google.com/project/${mockProjectId}`,
          name
        })
      }]
    };
  }
);

server.tool("create_design_system_from_design_md",
  "Apply design tokens to a Stitch project",
  {
    project_id: z.string(),
    design_md_content: z.string()
  },
  async ({ project_id }) => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          projectId: project_id
        })
      }]
    };
  }
);

server.tool("generate_screen_from_text",
  "Generate initial UI screens based on a PRD or design document",
  {
    project_id: z.string(),
    prompt: z.string()
  },
  async ({ project_id }) => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          projectId: project_id,
          screensGenerated: 2
        })
      }]
    };
  }
);

server.tool("list_screens",
  "List all screens in a project",
  {
    project_id: z.string()
  },
  async ({ project_id }) => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          projectId: project_id,
          screens: mockScreens
        })
      }]
    };
  }
);

server.tool("edit_screens",
  "Modify an existing screen using natural language",
  {
    project_id: z.string(),
    screen_ids: z.array(z.string()),
    instruction: z.string()
  },
  async ({ screen_ids }) => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          screenIds: screen_ids,
          message: "Screen successfully updated based on instruction."
        })
      }]
    };
  }
);

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mock Stitch MCP Server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error in Stitch MCP:", error);
  process.exit(1);
});
