import { z } from "zod";
import {
  PRODUCTION_BACKEND_URL,
  PRODUCTION_SUPABASE_ANON_KEY,
  PRODUCTION_SUPABASE_URL,
} from "./defaults.js";

export const configSchema = z.object({
  apiKey: z.string().min(1, "PRETTY_PROMPT_API_KEY is required"),
  backendUrl: z
    .string()
    .url("PRETTY_PROMPT_BACKEND_URL must be a valid URL")
    .default(PRODUCTION_BACKEND_URL),
  supabaseUrl: z
    .string()
    .url("PRETTY_PROMPT_SUPABASE_URL must be a valid URL")
    .default(PRODUCTION_SUPABASE_URL),
  supabaseAnonKey: z
    .string()
    .min(1)
    .default(PRODUCTION_SUPABASE_ANON_KEY),
});

export type Config = z.infer<typeof configSchema>;

function envOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function loadConfig(): Config {
  const result = configSchema.safeParse({
    apiKey: process.env.PRETTY_PROMPT_API_KEY,
    backendUrl: envOrUndefined(process.env.PRETTY_PROMPT_BACKEND_URL),
    supabaseUrl: envOrUndefined(process.env.PRETTY_PROMPT_SUPABASE_URL),
    supabaseAnonKey: envOrUndefined(process.env.PRETTY_PROMPT_SUPABASE_ANON_KEY),
  });

  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`Configuration error:\n${messages}`);
    process.exit(1);
  }

  return result.data;
}
