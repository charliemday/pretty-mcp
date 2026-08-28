import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BackendClient } from "../client/backend.js";
import { withToolTracking, type McpAnalytics } from "../analytics/index.js";
import { trimPromptDetail, type LibraryPromptDetailRow } from "./library.js";

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerUpdateLibraryPrompt(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "update_library_prompt",
    {
      description:
        "Update a saved prompt in the user's Pretty Prompt library. " +
        "Uses the library prompt id from list_library_prompts. " +
        "Only provided fields are changed. To move between folders, " +
        "use move_prompt_to_folder instead.",
      inputSchema: {
        prompt_id: z
          .number()
          .int()
          .positive()
          .describe("Library prompt ID (from list_library_prompts)"),
        title: z.string().optional().describe("New display title"),
        prompt: z.string().optional().describe("New prompt text"),
        is_favorite: z
          .boolean()
          .optional()
          .describe("Mark as favourite or not"),
        notes: z
          .string()
          .optional()
          .describe("User notes for the prompt (empty string clears)"),
      },
    },
    withToolTracking(
      analytics,
      "update_library_prompt",
      async ({ prompt_id, title, prompt, is_favorite, notes }) => {
        const body: Record<string, unknown> = {};
        if (title !== undefined) body.title = title;
        if (prompt !== undefined) body.prompt = prompt;
        if (is_favorite !== undefined) body.is_favorite = is_favorite;
        if (notes !== undefined) body.notes = notes;

        const [result, foldersResult] = await Promise.all([
          backend.patch<LibraryPromptDetailRow>(
            `/library/prompts/${prompt_id}`,
            body,
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
