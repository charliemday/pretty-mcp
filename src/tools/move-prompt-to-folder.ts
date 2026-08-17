import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BackendClient } from "../client/backend.js";
import { withToolTracking, type McpAnalytics } from "../analytics/index.js";

interface MovePromptResponse {
  id?: number;
  title?: string | null;
  prompt?: string | null;
  folder_id?: string | null;
}

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerMovePromptToFolder(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "move_prompt_to_folder",
    {
      description:
        "Move a library prompt into a folder, or to the library root. " +
        "Call list_library_folders first to resolve folder UUIDs. " +
        "Pass folder_id=null to remove the prompt from its folder.",
      inputSchema: {
        prompt_id: z
          .number()
          .int()
          .positive()
          .describe("Library prompt ID (from list_library_prompts)"),
        folder_id: z
          .string()
          .nullable()
          .optional()
          .describe("Destination folder UUID, or null for root"),
      },
    },
    withToolTracking(
      analytics,
      "move_prompt_to_folder",
      async ({ prompt_id, folder_id }) => {
        const result = await backend.patch<MovePromptResponse>(
          `/library/prompts/${prompt_id}/folder`,
          { folder_id: folder_id ?? null },
        );
        return textResult(result);
      },
    ),
  );
}
