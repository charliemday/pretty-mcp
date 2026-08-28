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

export function registerGetLibraryPrompt(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "get_library_prompt",
    {
      description:
        "Fetch a single saved prompt from the user's Pretty Prompt library " +
        "by id (from list_library_prompts). Returns full prompt text, " +
        "folder info, tags, favourite status, and notes.",
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
      "get_library_prompt",
      async ({ prompt_id }) => {
        const [result, foldersResult] = await Promise.all([
          backend.get<LibraryPromptDetailRow>(`/library/prompts/${prompt_id}`),
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
