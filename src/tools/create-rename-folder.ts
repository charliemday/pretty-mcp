import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BackendClient } from "../client/backend.js";
import { withToolTracking, type McpAnalytics } from "../analytics/index.js";

interface FolderResponse {
  id?: string;
  name?: string | null;
  parent_id?: string | null;
}

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerCreateLibraryFolder(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "create_library_folder",
    {
      description:
        "Create a folder in the user's Pretty Prompt library. " +
        "Optionally pass parent_id to nest under an existing folder " +
        "(use list_library_folders to resolve UUIDs).",
      inputSchema: {
        name: z.string().describe("Display name for the new folder"),
        parent_id: z
          .string()
          .nullable()
          .optional()
          .describe("Optional parent folder UUID, or null for root"),
      },
    },
    withToolTracking(
      analytics,
      "create_library_folder",
      async ({ name, parent_id }) => {
        const result = await backend.post<FolderResponse>("/library/folders", {
          name,
          parent_id: parent_id ?? null,
        });
        return textResult(result);
      },
    ),
  );
}

export function registerRenameLibraryFolder(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "rename_library_folder",
    {
      description:
        "Rename a folder in the user's Pretty Prompt library. " +
        "Call list_library_folders first to resolve folder UUIDs.",
      inputSchema: {
        folder_id: z.string().describe("Folder UUID to rename"),
        name: z.string().describe("New display name for the folder"),
      },
    },
    withToolTracking(
      analytics,
      "rename_library_folder",
      async ({ folder_id, name }) => {
        const result = await backend.patch<FolderResponse>(
          `/library/folders/${folder_id}`,
          { name },
        );
        return textResult(result);
      },
    ),
  );
}

const deleteFolderStrategy = z.enum([
  "unfile_prompts_only",
  "reparent_children",
  "delete_subtree",
]);

export function registerDeleteLibraryFolder(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "delete_library_folder",
    {
      description:
        "Delete a folder from the user's Pretty Prompt library. " +
        "Prompts are never deleted; they move to the library root. " +
        "Default strategy blocks delete when subfolders exist. " +
        "Use dry_run=true to preview impact. Call list_library_folders first.",
      inputSchema: {
        folder_id: z.string().describe("Folder UUID to delete"),
        strategy: deleteFolderStrategy
          .optional()
          .describe(
            "unfile_prompts_only (default), reparent_children, or delete_subtree",
          ),
        dry_run: z
          .boolean()
          .optional()
          .describe("If true, return impact counts without deleting"),
      },
    },
    withToolTracking(
      analytics,
      "delete_library_folder",
      async ({ folder_id, strategy, dry_run }) => {
        const params: Record<string, string> = {};
        if (strategy) params.strategy = strategy;
        if (dry_run) params.dry_run = "true";
        const result = await backend.delete<Record<string, unknown>>(
          `/library/folders/${folder_id}`,
          params,
        );
        return textResult(result);
      },
    ),
  );
}
