import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { EdgeFunctionClient } from "../client/edge.js";

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerSaveToLibrary(
  server: McpServer,
  edge: EdgeFunctionClient,
) {
  server.registerTool(
    "save_to_library",
    {
      description: "Save a prompt to the user's Pretty Prompt library.",
      inputSchema: {
        prompt: z.string().describe("The prompt text to save"),
        title: z.string().optional().describe("Optional display title"),
      },
    },
    async ({ prompt, title }) => {
      const result = await edge.invoke("create-prompt", {
        prompt,
        ...(title ? { title } : {}),
      });
      return textResult(result);
    },
  );
}
