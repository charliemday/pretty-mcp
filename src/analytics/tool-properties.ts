export function apiKeyPrefix(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 16) {
    return trimmed;
  }
  return `${trimmed.slice(0, 16)}…`;
}

export function runtimeProperties(): Record<string, string> {
  return {
    platform: process.platform,
    node_version: process.version,
    server_version: "0.3.1",
  };
}

export function toolCallProperties(
  toolName: string,
  args: Record<string, unknown>,
): Record<string, string | number | boolean> {
  switch (toolName) {
    case "list_library_prompts":
      return {
        has_search: Boolean(
          typeof args.search === "string" && args.search.trim().length > 0,
        ),
        favorites_only: args.favorites_only === true,
        has_pagination: args.limit !== undefined,
        limit: typeof args.limit === "number" ? args.limit : 0,
        offset: typeof args.offset === "number" ? args.offset : 0,
      };
    case "save_to_library":
      return {
        prompt_length:
          typeof args.prompt === "string" ? args.prompt.length : 0,
        has_title:
          typeof args.title === "string" && args.title.trim().length > 0,
      };
    case "list_library_folders":
      return {};
    case "move_prompt_to_folder":
      return {
        has_folder_id: args.folder_id != null,
        prompt_id: typeof args.prompt_id === "number" ? args.prompt_id : 0,
      };
    case "improve_prompt":
      return {
        prompt_length:
          typeof args.prompt === "string" ? args.prompt.length : 0,
        category:
          typeof args.category === "string" ? args.category : "unspecified",
        provider:
          typeof args.provider === "string" ? args.provider : "unspecified",
        save_to_library: args.save_to_library === true,
        include_context_snippets: args.include_context_snippets === true,
        context_snippet_count: Array.isArray(args.context_snippet_ids)
          ? args.context_snippet_ids.length
          : 0,
        has_question_answers:
          args.question_answers != null &&
          typeof args.question_answers === "object" &&
          Object.keys(args.question_answers as object).length > 0,
      };
    default:
      return {};
  }
}
