import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BackendClient } from "../client/backend.js";
import { withToolTracking, type McpAnalytics } from "../analytics/index.js";

interface LibraryTag {
  id: string;
  name: string;
  color: string | null;
}

export interface LibraryPromptRow {
  id: number;
  title: string | null;
  prompt: string | null;
  folder?: string | null;
  tags?: LibraryTag[];
  is_favorite?: boolean;
}

export interface LibraryPromptDetailRow extends LibraryPromptRow {
  notes?: string | null;
}

interface FoldersResponse {
  folders?: Array<{
    id: string;
    name: string | null;
  }>;
}

interface LibraryListResponse {
  items?: LibraryPromptRow[];
  total?: number;
}

export function trimPrompt(
  row: LibraryPromptRow,
  folderNames: Map<string, string>,
) {
  const folderId = row.folder ?? null;
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    tags: row.tags?.map((t) => t.name) ?? [],
    is_favorite: row.is_favorite ?? false,
    folder_id: folderId,
    ...(folderId
      ? { folder_name: folderNames.get(folderId) ?? null }
      : {}),
  };
}

export function trimPromptDetail(
  row: LibraryPromptDetailRow,
  folderNames: Map<string, string>,
) {
  const payload = trimPrompt(row, folderNames);
  if (row.notes !== undefined && row.notes !== null) {
    return { ...payload, notes: row.notes };
  }
  return payload;
}

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerListLibraryPrompts(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "list_library_prompts",
    {
      description:
        "List saved prompts from the user's Pretty Prompt library. " +
        "Each prompt includes folder_id and folder_name when assigned to a folder.",
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe("Search in title, prompt text, or origin"),
        favorites_only: z
          .boolean()
          .optional()
          .describe("Return only favourite prompts"),
        folder_id: z
          .string()
          .optional()
          .describe("When set, return only prompts in this folder"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe("Page size (default: all)"),
        offset: z.number().int().min(0).optional().describe("Pagination offset"),
      },
    },
    withToolTracking(analytics, "list_library_prompts", async ({
      search,
      favorites_only,
      folder_id,
      limit,
      offset,
    }) => {
      const params: Record<string, string> = {};
      if (limit !== undefined) {
        params.paginate = "true";
        params.limit = String(limit);
        params.offset = String(offset ?? 0);
      }
      if (search) params.q = search;
      if (favorites_only) params.favorites_only = "true";
      if (folder_id) params.folder_id = folder_id;
      params.enrichment = "lite";

      const [result, foldersResult] = await Promise.all([
        backend.get<LibraryPromptRow[] | LibraryListResponse>(
          "/library/prompts",
          params,
        ),
        backend.get<FoldersResponse>("/library/folders"),
      ]);

      const folderNames = new Map(
        (foldersResult.folders ?? []).map((folder) => [
          folder.id,
          folder.name ?? "",
        ]),
      );

      const items = Array.isArray(result)
        ? result
        : (result.items ?? []);
      const total = Array.isArray(result)
        ? result.length
        : (result.total ?? items.length);

      return textResult({
        prompts: items.map((row) => trimPrompt(row, folderNames)),
        total,
      });
    }),
  );
}
