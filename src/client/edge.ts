import type { Config } from "../config.js";
import type { AuthManager } from "../auth.js";
import { PrettyPromptError } from "./errors.js";

export class EdgeFunctionClient {
  constructor(
    private readonly config: Config,
    private readonly auth: AuthManager,
  ) {}

  private get baseUrl(): string {
    return `${this.config.supabaseUrl.replace(/\/$/, "")}/functions/v1`;
  }

  async invoke<T>(
    name: string,
    body: unknown,
    options?: { timeoutMs?: number },
  ): Promise<T> {
    const token = await this.auth.getAccessToken();
    const timeoutMs = options?.timeoutMs ?? (name === "improve-prompt" ? 180_000 : 60_000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/${name}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: this.config.supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new PrettyPromptError(res.status, text);
      }

      return res.json() as Promise<T>;
    } finally {
      clearTimeout(timer);
    }
  }
}
