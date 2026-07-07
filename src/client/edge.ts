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

  async invoke<T>(name: string, body: unknown): Promise<T> {
    const token = await this.auth.getAccessToken();

    const res = await fetch(`${this.baseUrl}/${name}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: this.config.supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new PrettyPromptError(res.status, text);
    }

    return res.json() as Promise<T>;
  }
}
