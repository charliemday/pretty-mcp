import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { EdgeFunctionClient } from "../client/edge.js";
import { withToolTracking, type McpAnalytics } from "../analytics/index.js";

interface ImprovedPromptSection {
  section_title?: string;
  section_content?: string;
}

interface ImprovedPromptOutput {
  original_prompt?: string;
  improved_prompt?: ImprovedPromptSection[] | string;
  explanation?: string;
  title?: string;
  category?: string;
  follow_up_questions?: unknown[];
  dynamic_parts?: unknown[];
  edit_suggestions?: unknown[];
  original_prompt_language?: string;
  improved_prompt_language?: string;
}

interface ImprovePromptEdgeResponse {
  text?: ImprovedPromptOutput | string;
  success?: boolean;
  id?: string | number | null;
  error?: string;
  details?: string;
}

interface CreatePromptResponse {
  id?: string | number;
  data?: { id?: string | number };
}

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function flattenImprovedPrompt(
  sections: ImprovedPromptSection[] | string | undefined,
): string {
  if (typeof sections === "string") return sections;
  if (!Array.isArray(sections)) return "";
  return sections
    .map((s) => (typeof s.section_content === "string" ? s.section_content.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
}

interface ImproveToolResult {
  title: string | null;
  improved_prompt: string;
  improved_prompt_sections: ImprovedPromptSection[];
  explanation: string | null;
  category: string | null;
  follow_up_questions: unknown[];
  dynamic_parts: unknown[];
  edit_suggestions: unknown[];
  original_prompt?: string;
  original_prompt_language?: string;
  improved_prompt_language?: string;
  prompt_id?: string | number;
  library_prompt_id?: string | number;
}

function formatImproveResult(
  payload: ImprovePromptEdgeResponse,
): ImproveToolResult {
  if (payload.success === false) {
    const message =
      typeof payload.text === "string"
        ? payload.text
        : payload.error || "Failed to improve prompt";
    throw new Error(message);
  }

  const text = payload.text;
  if (typeof text === "string") {
    const result: ImproveToolResult = {
      title: null,
      improved_prompt: text,
      improved_prompt_sections: [],
      explanation: null,
      category: null,
      follow_up_questions: [],
      dynamic_parts: [],
      edit_suggestions: [],
    };
    if (payload.id != null) result.prompt_id = payload.id;
    return result;
  }

  if (!text || typeof text !== "object") {
    throw new Error("Unexpected improve-prompt response body");
  }

  const sections = text.improved_prompt ?? [];
  const result: ImproveToolResult = {
    title: text.title ?? null,
    improved_prompt: flattenImprovedPrompt(sections),
    improved_prompt_sections: Array.isArray(sections) ? sections : [],
    explanation: text.explanation ?? null,
    category: text.category ?? null,
    follow_up_questions: text.follow_up_questions ?? [],
    dynamic_parts: text.dynamic_parts ?? [],
    edit_suggestions: text.edit_suggestions ?? [],
    original_prompt: text.original_prompt,
    original_prompt_language: text.original_prompt_language,
    improved_prompt_language: text.improved_prompt_language,
  };
  if (payload.id != null) result.prompt_id = payload.id;
  return result;
}

export function registerImprovePrompt(
  server: McpServer,
  edge: EdgeFunctionClient,
  analytics: McpAnalytics,
) {
  server.registerTool(
    "improve_prompt",
    {
      description:
        "Improve and refine a prompt using Pretty Prompt. Returns a polished " +
        "prompt (flattened text plus structured sections), an explanation, " +
        "and optional follow-up questions. Uses the user's prompt credits. " +
        "To refine further, call again with question_answers from the " +
        "follow_up_questions.",
      inputSchema: {
        prompt: z.string().describe("The prompt text to improve"),
        category: z
          .string()
          .optional()
          .describe(
            "Optional category (General, Image, Video, Vibe Coding, Research, Agent, System Prompt)",
          ),
        provider: z
          .string()
          .optional()
          .describe("Optional target provider (e.g. openai, perplexity, lovable)"),
        include_context_snippets: z
          .boolean()
          .optional()
          .describe("Include the user's saved context snippets"),
        context_snippet_ids: z
          .array(z.number().int())
          .optional()
          .describe("Specific context snippet IDs to include"),
        question_answers: z
          .record(z.array(z.string()))
          .optional()
          .describe(
            "Map of follow-up question → selected answers for a refine pass",
          ),
        save_to_library: z
          .boolean()
          .optional()
          .describe("If true, also save the improved prompt to the library"),
      },
    },
    withToolTracking(analytics, "improve_prompt", async ({
      prompt,
      category,
      provider,
      include_context_snippets,
      context_snippet_ids,
      question_answers,
      save_to_library,
    }) => {
      if (!prompt.trim()) {
        throw new Error("Prompt cannot be empty");
      }

      const body: Record<string, unknown> = {
        prompt,
        should_stream: false,
        persist: false,
      };
      if (category) body.category = category;
      if (provider) body.provider = provider;
      if (include_context_snippets) body.includeContextSnippets = true;
      if (context_snippet_ids?.length) {
        body.contextSnippetIds = context_snippet_ids;
      }
      if (question_answers) body.questionAnswers = question_answers;

      const payload = await edge.invoke<ImprovePromptEdgeResponse>(
        "improve-prompt",
        body,
      );
      const result = formatImproveResult(payload);

      if (save_to_library) {
        const saved = await edge.invoke<CreatePromptResponse>("create-prompt", {
          prompt: result.improved_prompt,
          ...(result.title ? { title: result.title } : {}),
        });
        const libraryId = saved.id ?? saved.data?.id;
        if (libraryId !== undefined) {
          result.library_prompt_id = libraryId;
        }
      }

      return textResult(result);
    }),
  );
}
