import type { Config } from "../config.js";
import type { AuthManager } from "../auth.js";
import { PrettyPromptError } from "./errors.js";

export class BackendClient {
  constructor(
    private readonly config: Config,
    private readonly auth: AuthManager,
  ) {}

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.auth.getAccessToken();
    const url = new URL(`${this.config.backendUrl.replace(/\/$/, "")}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new PrettyPromptError(res.status, text);
    }

    return res.json() as Promise<T>;
  }
}
