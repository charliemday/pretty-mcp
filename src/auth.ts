import type { Config } from "./config.js";
import { PrettyPromptError } from "./client/errors.js";

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface JwtPayload {
  email?: string;
  sub?: string;
}

function parseJwtPayload(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return {};
  }

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as JwtPayload;
    return payload;
  } catch {
    return {};
  }
}

export class AuthManager {
  private accessToken: string | null = null;
  private expiresAt = 0;
  private userEmail: string | null = null;
  private userId: string | null = null;

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

    const payload = parseJwtPayload(data.access_token);
    this.userEmail = payload.email?.trim() || null;
    this.userId = payload.sub?.trim() || null;

    return this.accessToken;
  }

  async getUserEmail(): Promise<string | null> {
    await this.getAccessToken();
    return this.userEmail;
  }

  async getUserId(): Promise<string | null> {
    await this.getAccessToken();
    return this.userId;
  }
}
