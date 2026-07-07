import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BackendClient } from "../client/backend.js";

interface LibraryTag {
  id: string;
  name: string;
  color: string | null;
}

interface LibraryPromptRow {
  id: number;
  title: string | null;
  prompt: string | null;
  tags?: LibraryTag[];
  isFavorite?: boolean;
}

interface LibraryListResponse {
  items?: LibraryPromptRow[];
  total?: number;
}

function trimPrompt(row: LibraryPromptRow) {
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    tags: row.tags?.map((t) => t.name) ?? [],
    is_favorite: row.isFavorite ?? false,
  };
}

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerListLibraryPrompts(
  server: McpServer,
  backend: BackendClient,
) {
  server.registerTool(
    "list_library_prompts",
    {
      description: "List saved prompts from the user's Pretty Prompt library.",
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe("Search in title, prompt text, or origin"),
        favorites_only: z
          .boolean()
          .optional()
          .describe("Return only favourite prompts"),
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
    async ({ search, favorites_only, limit, offset }) => {
      const params: Record<string, string> = {};
      if (limit !== undefined) {
        params.paginate = "true";
        params.limit = String(limit);
        params.offset = String(offset ?? 0);
      }
      if (search) params.q = search;
      if (favorites_only) params.favorites_only = "true";

      const result = await backend.get<LibraryPromptRow[] | LibraryListResponse>(
        "/library/prompts",
        params,
      );

      const items = Array.isArray(result)
        ? result
        : (result.items ?? []);
      const total = Array.isArray(result)
        ? result.length
        : (result.total ?? items.length);

      return textResult({
        prompts: items.map(trimPrompt),
        total,
      });
    },
  );
}
