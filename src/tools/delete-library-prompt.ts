import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BackendClient } from "../client/backend.js";
import { withToolTracking, type McpAnalytics } from "../analytics/index.js";

interface DeletePromptResponse {
  id?: number;
  title?: string | null;
  deleted?: boolean;
}

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerDeleteLibraryPrompt(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "delete_library_prompt",
    {
      description:
        "Permanently delete a prompt from the user's Pretty Prompt library. " +
        "Uses the library prompt id from list_library_prompts. This cannot be undone.",
      inputSchema: {
        prompt_id: z
          .number()
          .int()
          .positive()
          .describe("Library prompt ID (from list_library_prompts)"),
      },
    },
    withToolTracking(
      analytics,
      "delete_library_prompt",
      async ({ prompt_id }) => {
        const result = await backend.delete<DeletePromptResponse>(
          `/library/prompts/${prompt_id}`,
        );
        return textResult(result);
      },
    ),
  );
}
