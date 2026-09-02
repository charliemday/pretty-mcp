import type { AuthManager } from "../auth.js";
import type { Config } from "../config.js";
import { markKeyPrefixConnected } from "./connection-state.js";
import { MCP_ANALYTICS_EVENTS } from "./events.js";
import { sendPosthogEvent } from "./posthog.js";
import {
  apiKeyPrefix,
  runtimeProperties,
  toolCallProperties,
} from "./tool-properties.js";

export class McpAnalytics {
  private readonly keyPrefix: string;

  constructor(
    config: Config,
    private readonly auth: AuthManager,
  ) {
    this.keyPrefix = apiKeyPrefix(config.apiKey);
  }

  private async distinctId(): Promise<string | null> {
    const email = await this.auth.getUserEmail();
    if (email) {
      return email;
    }
    return this.auth.getUserId();
  }

  async trackServerStarted(): Promise<void> {
    const distinctId = await this.distinctId();
    const runtime = runtimeProperties();
    const isFirstConnection = await markKeyPrefixConnected(this.keyPrefix);

    void sendPosthogEvent(
      MCP_ANALYTICS_EVENTS.SERVER_STARTED,
      {
        ...runtime,
        key_prefix: this.keyPrefix,
        is_first_connection: isFirstConnection,
      },
      distinctId,
    );

    if (isFirstConnection) {
      void sendPosthogEvent(
        MCP_ANALYTICS_EVENTS.FIRST_CONNECTED,
        {
          ...runtime,
          key_prefix: this.keyPrefix,
        },
        distinctId,
      );
    }
  }

  async trackToolCall<T>(
    toolName: string,
    args: Record<string, unknown>,
    handler: () => Promise<T>,
  ): Promise<T> {
    const startedAt = Date.now();
    const distinctId = await this.distinctId();

    try {
      const result = await handler();
      void sendPosthogEvent(
        MCP_ANALYTICS_EVENTS.TOOL_CALLED,
        {
          tool_name: toolName,
          success: true,
          duration_ms: Date.now() - startedAt,
          key_prefix: this.keyPrefix,
          ...runtimeProperties(),
          ...toolCallProperties(toolName, args),
        },
        distinctId,
      );
      return result;
    } catch (error) {
      void sendPosthogEvent(
        MCP_ANALYTICS_EVENTS.TOOL_CALLED,
        {
          tool_name: toolName,
          success: false,
          duration_ms: Date.now() - startedAt,
          key_prefix: this.keyPrefix,
          error_type:
            error instanceof Error ? error.constructor.name : "unknown_error",
          error_message:
            error instanceof Error
              ? error.message.slice(0, 200)
              : "Unknown error",
          ...runtimeProperties(),
          ...toolCallProperties(toolName, args),
        },
        distinctId,
      );
      throw error;
    }
  }
}

export function withToolTracking<TArgs extends Record<string, unknown>, TResult>(
  analytics: McpAnalytics,
  toolName: string,
  handler: (args: TArgs) => Promise<TResult>,
): (args: TArgs) => Promise<TResult> {
  return (args) =>
    analytics.trackToolCall(toolName, args, () => handler(args));
}
