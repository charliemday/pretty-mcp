import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BackendClient } from "../client/backend.js";
import { withToolTracking, type McpAnalytics } from "../analytics/index.js";

interface FoldersResponse {
  folders?: Array<{
    id: string;
    name: string | null;
    parent_id: string | null;
  }>;
  total?: number;
}

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerListLibraryFolders(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "list_library_folders",
    {
      description:
        "List folders in the user's Pretty Prompt library. " +
        "Use this before move_prompt_to_folder to get folder UUIDs. " +
        "Folders are a flat list; parent_id indicates nesting (null = root).",
      inputSchema: {},
    },
    withToolTracking(analytics, "list_library_folders", async () => {
      const result = await backend.get<FoldersResponse>("/library/folders");
      return textResult({
        folders: result.folders ?? [],
        total: result.total ?? result.folders?.length ?? 0,
      });
    }),
  );
}
