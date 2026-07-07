import type { Config } from "./config.js";
import { PrettyPromptError } from "./client/errors.js";

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class AuthManager {
  private accessToken: string | null = null;
  private expiresAt = 0;

  constructor(private readonly config: Config) {}

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    // Refresh 5 minutes before expiry
    if (this.accessToken && now < this.expiresAt - 5 * 60 * 1000) {
      return this.accessToken;
    }

    const res = await fetch(`${this.config.backendUrl}/mcp/token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new PrettyPromptError(res.status, body);
    }

    const data = (await res.json()) as TokenResponse;
    this.accessToken = data.access_token;
    this.expiresAt = now + data.expires_in * 1000;
    return this.accessToken;
  }
}
