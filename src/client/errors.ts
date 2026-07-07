export class PrettyPromptError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(formatPrettyPromptError(status, body));
    this.name = "PrettyPromptError";
  }
}

function formatPrettyPromptError(status: number, body: string): string {
  let detail = body;
  try {
    const parsed = JSON.parse(body) as { detail?: string; error?: string };
    detail = parsed.detail ?? parsed.error ?? body;
  } catch {
    // use raw body
  }

  switch (status) {
    case 401:
      return `Authentication failed: ${detail}. Check your PRETTY_PROMPT_API_KEY or regenerate it at pretty-prompt.com/settings/mcp`;
    case 402:
      return `Prompt credits exhausted: ${detail}`;
    case 429:
      return `Rate limited: ${detail}. Try again later.`;
    default:
      return `API error (${status}): ${detail}`;
  }
}
