import { z } from "zod";

export const configSchema = z.object({
  apiKey: z.string().min(1, "PRETTY_PROMPT_API_KEY is required"),
  backendUrl: z.string().url("PRETTY_PROMPT_BACKEND_URL must be a valid URL"),
  supabaseUrl: z.string().url("PRETTY_PROMPT_SUPABASE_URL must be a valid URL"),
  supabaseAnonKey: z
    .string()
    .min(1, "PRETTY_PROMPT_SUPABASE_ANON_KEY is required"),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const result = configSchema.safeParse({
    apiKey: process.env.PRETTY_PROMPT_API_KEY,
    backendUrl: process.env.PRETTY_PROMPT_BACKEND_URL,
    supabaseUrl: process.env.PRETTY_PROMPT_SUPABASE_URL,
    supabaseAnonKey: process.env.PRETTY_PROMPT_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`Configuration error:\n${messages}`);
    process.exit(1);
  }

  return result.data as Config;
}
