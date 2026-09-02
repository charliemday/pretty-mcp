import { PRODUCTION_POSTHOG_KEY } from "../defaults.js";

const POSTHOG_URL = "https://us.i.posthog.com/i/v0/e/";

export function isAnalyticsEnabled(): boolean {
  const flag = process.env.PRETTY_PROMPT_ANALYTICS?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") {
    return false;
  }
  return true;
}

function posthogApiKey(): string {
  return process.env.PRETTY_PROMPT_POSTHOG_KEY?.trim() || PRODUCTION_POSTHOG_KEY;
}

export async function sendPosthogEvent(
  event: string,
  properties: Record<string, string | number | boolean | null | undefined>,
  distinctId?: string | null,
): Promise<void> {
  if (!isAnalyticsEnabled()) {
    return;
  }

  const resolvedDistinctId = distinctId?.trim();
  if (!resolvedDistinctId) {
    return;
  }

  try {
    const payload = {
      api_key: posthogApiKey(),
      event,
      distinct_id: resolvedDistinctId,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        source: "pretty_mcp",
        $lib: "pretty_mcp",
        $process_person_profile: true,
        email: resolvedDistinctId.includes("@") ? resolvedDistinctId : undefined,
      },
    };

    await fetch(POSTHOG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics must never break MCP tool calls.
  }
}
