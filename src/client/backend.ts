import type { Config } from "../config.js";
import type { AuthManager } from "../auth.js";
import { PrettyPromptError } from "./errors.js";

export class BackendClient {
  constructor(
    private readonly config: Config,
    private readonly auth: AuthManager,
  ) {}

  private url(path: string, params?: Record<string, string>): URL {
    const url = new URL(`${this.config.backendUrl.replace(/\/$/, "")}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }
    return url;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.auth.getAccessToken();
    const res = await fetch(this.url(path, params).toString(), {
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

  async patch<T>(path: string, body: unknown): Promise<T> {
    const token = await this.auth.getAccessToken();
    const res = await fetch(this.url(path).toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
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

  async post<T>(path: string, body: unknown): Promise<T> {
    const token = await this.auth.getAccessToken();
    const res = await fetch(this.url(path).toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
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

  async delete<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.auth.getAccessToken();
    const res = await fetch(this.url(path, params).toString(), {
      method: "DELETE",
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
