import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BackendClient } from "../client/backend.js";
import { withToolTracking, type McpAnalytics } from "../analytics/index.js";
import {
  trimPromptDetail,
  type LibraryPromptDetailRow,
} from "./library.js";

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerFavoriteLibraryPrompt(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "favorite_library_prompt",
    {
      description:
        "Mark a library prompt as a favourite (or remove favourite status). " +
        "Uses the library prompt id from list_library_prompts.",
      inputSchema: {
        prompt_id: z
          .number()
          .int()
          .positive()
          .describe("Library prompt ID (from list_library_prompts)"),
        is_favorite: z
          .boolean()
          .optional()
          .default(true)
          .describe("True to favourite, false to unfavourite (default: true)"),
      },
    },
    withToolTracking(
      analytics,
      "favorite_library_prompt",
      async ({ prompt_id, is_favorite }) => {
        const [result, foldersResult] = await Promise.all([
          backend.patch<LibraryPromptDetailRow>(
            `/library/prompts/${prompt_id}`,
            { is_favorite: is_favorite ?? true },
          ),
          backend.get<{ folders?: Array<{ id: string; name: string | null }> }>(
            "/library/folders",
          ),
        ]);

        const folderNames = new Map(
          (foldersResult.folders ?? []).map((folder) => [
            folder.id,
            folder.name ?? "",
          ]),
        );

        return textResult(trimPromptDetail(result, folderNames));
      },
    ),
  );
}
