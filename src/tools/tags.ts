import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BackendClient } from "../client/backend.js";
import { withToolTracking, type McpAnalytics } from "../analytics/index.js";

interface TagRow {
  id: string;
  name: string | null;
  color: string | null;
}

function trimTag(row: TagRow) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  };
}

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerListLibraryTags(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "list_library_tags",
    {
      description:
        "List all tags in the user's Pretty Prompt library. " +
        "Each tag has a UUID id and name; use ids with add_tag_to_library_prompt.",
      inputSchema: {},
    },
    withToolTracking(analytics, "list_library_tags", async () => {
      const tags = await backend.get<TagRow[]>("/tags");
      const trimmed = tags.map(trimTag);
      return textResult({ tags: trimmed, total: trimmed.length });
    }),
  );
}

export function registerGetLibraryTag(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "get_library_tag",
    {
      description:
        "Fetch a single library tag by UUID (from list_library_tags).",
      inputSchema: {
        tag_id: z.string().describe("Tag UUID (from list_library_tags)"),
      },
    },
    withToolTracking(analytics, "get_library_tag", async ({ tag_id }) => {
      const result = await backend.get<TagRow>(`/tags/${tag_id}`);
      return textResult(trimTag(result));
    }),
  );
}

export function registerCreateLibraryTag(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "create_library_tag",
    {
      description: "Create a new tag in the user's Pretty Prompt library.",
      inputSchema: {
        name: z.string().describe("Display name for the tag"),
        color: z
          .string()
          .optional()
          .describe("Optional hex or CSS color"),
      },
    },
    withToolTracking(
      analytics,
      "create_library_tag",
      async ({ name, color }) => {
        const result = await backend.post<TagRow>("/tags", {
          name,
          ...(color !== undefined ? { color } : {}),
        });
        return textResult(trimTag(result));
      },
    ),
  );
}

export function registerUpdateLibraryTag(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "update_library_tag",
    {
      description:
        "Update a library tag by UUID (from list_library_tags). " +
        "Only provided fields are changed.",
      inputSchema: {
        tag_id: z.string().describe("Tag UUID to update"),
        name: z.string().optional().describe("New display name"),
        color: z.string().optional().describe("New color"),
      },
    },
    withToolTracking(
      analytics,
      "update_library_tag",
      async ({ tag_id, name, color }) => {
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (color !== undefined) body.color = color;
        const result = await backend.patch<TagRow>(`/tags/${tag_id}`, body);
        return textResult(trimTag(result));
      },
    ),
  );
}

export function registerDeleteLibraryTag(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "delete_library_tag",
    {
      description:
        "Delete a library tag by UUID (from list_library_tags). " +
        "Removes the tag from all prompts that use it.",
      inputSchema: {
        tag_id: z.string().describe("Tag UUID to delete"),
      },
    },
    withToolTracking(
      analytics,
      "delete_library_tag",
      async ({ tag_id }) => {
        const result = await backend.delete<{ deleted?: boolean; id?: string }>(
          `/tags/${tag_id}`,
        );
        return textResult(result);
      },
    ),
  );
}

export function registerAddTagToLibraryPrompt(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "add_tag_to_library_prompt",
    {
      description:
        "Add a tag to a library prompt. Uses prompt id from " +
        "list_library_prompts and tag id from list_library_tags.",
      inputSchema: {
        prompt_id: z
          .number()
          .int()
          .positive()
          .describe("Library prompt ID"),
        tag_id: z.string().describe("Tag UUID"),
      },
    },
    withToolTracking(
      analytics,
      "add_tag_to_library_prompt",
      async ({ prompt_id, tag_id }) => {
        const result = await backend.post<Record<string, unknown>>(
          "/tags/library-prompt-tags",
          { library_prompt: prompt_id, tag: tag_id },
        );
        return textResult(result);
      },
    ),
  );
}

export function registerRemoveTagFromLibraryPrompt(
  server: McpServer,
  backend: BackendClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "remove_tag_from_library_prompt",
    {
      description:
        "Remove a tag from a library prompt. Uses prompt id from " +
        "list_library_prompts and tag id from list_library_tags.",
      inputSchema: {
        prompt_id: z
          .number()
          .int()
          .positive()
          .describe("Library prompt ID"),
        tag_id: z.string().describe("Tag UUID"),
      },
    },
    withToolTracking(
      analytics,
      "remove_tag_from_library_prompt",
      async ({ prompt_id, tag_id }) => {
        const result = await backend.delete<Record<string, unknown>>(
          `/tags/library-prompt-tags/prompt/${prompt_id}/tag/${tag_id}`,
        );
        return textResult(result);
      },
    ),
  );
}
