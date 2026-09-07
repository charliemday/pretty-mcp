import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BackendClient } from "../client/backend.js";
import { withToolTracking, type McpAnalytics } from "../analytics/index.js";

interface ContextTagRef {
  id?: string;
  name?: string | null;
  slug?: string | null;
}

interface ContextSnippetTagRel {
  context_tag?: ContextTagRef | null;
}

interface ContextSnippetRow {
  id: number;
  title?: string | null;
  snippet?: string | null;
  context_type?: string | null;
  is_global?: boolean | null;
  context_snippet_tags?: ContextSnippetTagRel[] | null;
}

interface ContextSnippetListResponse {
  snippets?: ContextSnippetRow[];
  total?: number;
  limit?: number;
  offset?: number;
}

interface ContextTagRow {
  id: string;
  name?: string | null;
  slug?: string | null;
}

function trimContextSnippet(row: ContextSnippetRow) {
  const tags = (row.context_snippet_tags ?? [])
    .map((rel) => rel.context_tag)
    .filter((tag): tag is ContextTagRef => Boolean(tag))
    .map((tag) => ({
      name: tag.name ?? null,
      slug: tag.slug ?? null,
    }));

  return {
    id: row.id,
    title: row.title ?? null,
    snippet: row.snippet ?? null,
    context_type: row.context_type ?? null,
    is_global: row.is_global ?? false,
    tags,
  };
}

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

async function fetchSnippet(
  backend: BackendClient,
  snippetId: number,
) {
  const row = await backend.get<ContextSnippetRow>(
    `/context/context-snippets/${snippetId}`,
  );
  return trimContextSnippet(row);
}

async function resolveTagId(
  backend: BackendClient,
  slug: string,
): Promise<string> {
  const tags = await backend.get<ContextTagRow[]>("/context/context-tags");
  const needle = slug.trim().toLowerCase();
  const match = tags.find(
    (tag) => (tag.slug ?? "").toLowerCase() === needle,
  );
  if (!match) {
    throw new Error(
      `Unknown context tag slug: ${slug}. Use "personal" or "work".`,
    );
  }
  return match.id;
}

export function registerListContextSnippets(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "list_context_snippets",
    {
      description:
        "List the user's saved Pretty Prompt context snippets. " +
        "Each snippet has a numeric id; pass those ids to " +
        "improve_prompt as context_snippet_ids.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Page size, 1-100 (default: 20)"),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Pagination offset (default: 0)"),
        tag: z
          .string()
          .optional()
          .describe("Filter by tag slug (personal or work)"),
        context_type: z
          .string()
          .optional()
          .describe(
            "Filter by type name (instruction, memory, or persona)",
          ),
      },
    },
    withToolTracking(
      analytics,
      "list_context_snippets",
      async ({ limit, offset, tag, context_type }) => {
        const params: Record<string, string> = {
          limit: String(limit ?? 20),
          offset: String(offset ?? 0),
        };
        if (tag) params.tags = tag;
        if (context_type) params.context_type = context_type;

        const result = await backend.get<ContextSnippetListResponse>(
          "/context/context-snippets",
          params,
        );
        const snippets = (result.snippets ?? []).map(trimContextSnippet);
        return textResult({
          snippets,
          total: result.total ?? snippets.length,
          limit: result.limit ?? (limit ?? 20),
          offset: result.offset ?? (offset ?? 0),
        });
      },
    ),
  );
}

export function registerCreateContextSnippet(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "create_context_snippet",
    {
      description:
        "Create a context snippet in the user's Pretty Prompt Context library. " +
        "Returns a numeric id usable with improve_prompt. May take a few " +
        "seconds while the snippet is normalized.",
      inputSchema: {
        snippet: z.string().describe("Snippet body text"),
        title: z.string().optional().describe("Optional display title"),
        tag: z
          .string()
          .optional()
          .describe("Optional tag slug to apply (personal or work)"),
        context_type: z
          .string()
          .optional()
          .describe(
            "Optional type (instruction, memory, or persona). " +
              "Omitted snippets are classified during normalization.",
          ),
        is_global: z
          .boolean()
          .optional()
          .describe("If true, always include this snippet when improving"),
      },
    },
    withToolTracking(
      analytics,
      "create_context_snippet",
      async ({ snippet, title, tag, context_type, is_global }) => {
        if (!snippet.trim()) {
          throw new Error("snippet cannot be empty");
        }

        let tagId: string | undefined;
        if (tag) {
          tagId = await resolveTagId(backend, tag);
        }

        const created = await backend.post<ContextSnippetRow>(
          "/context/context-snippets",
          {
            snippet,
            ...(title !== undefined ? { title } : {}),
            ...(context_type !== undefined ? { context_type } : {}),
            ...(is_global !== undefined ? { is_global } : {}),
          },
        );

        if (tagId) {
          await backend.post("/context/context-snippet-tags", {
            snippet_id: created.id,
            tag_id: tagId,
          });
        }

        return textResult(await fetchSnippet(backend, created.id));
      },
    ),
  );
}

export function registerUpdateContextSnippet(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "update_context_snippet",
    {
      description:
        "Update a context snippet by numeric id (from list_context_snippets). " +
        "Only provided fields are changed. Changing snippet text re-normalizes " +
        "the snippet (may take a few seconds).",
      inputSchema: {
        snippet_id: z
          .number()
          .int()
          .positive()
          .describe("Context snippet ID (from list_context_snippets)"),
        title: z.string().optional().describe("New display title"),
        snippet: z.string().optional().describe("New snippet body text"),
        is_global: z
          .boolean()
          .optional()
          .describe("If true, always include this snippet when improving"),
      },
    },
    withToolTracking(
      analytics,
      "update_context_snippet",
      async ({ snippet_id, title, snippet, is_global }) => {
        const body: Record<string, unknown> = {};
        if (title !== undefined) body.title = title;
        if (snippet !== undefined) body.snippet = snippet;
        if (is_global !== undefined) body.is_global = is_global;
        if (Object.keys(body).length === 0) {
          throw new Error(
            "Provide at least one of title, snippet, or is_global",
          );
        }

        await backend.patch(
          `/context/context-snippets/${snippet_id}`,
          body,
        );
        return textResult(await fetchSnippet(backend, snippet_id));
      },
    ),
  );
}

export function registerDeleteContextSnippet(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "delete_context_snippet",
    {
      description:
        "Permanently delete a context snippet by numeric id " +
        "(from list_context_snippets). This cannot be undone.",
      inputSchema: {
        snippet_id: z
          .number()
          .int()
          .positive()
          .describe("Context snippet ID (from list_context_snippets)"),
      },
    },
    withToolTracking(
      analytics,
      "delete_context_snippet",
      async ({ snippet_id }) => {
        const result = await backend.delete<{ deleted?: boolean; id?: number }>(
          `/context/context-snippets/${snippet_id}`,
        );
        return textResult(result);
      },
    ),
  );
}
