# Pretty Prompt MCP Server

MCP server that exposes your Pretty Prompt library to Cursor, Claude Desktop,
and other MCP clients.

## Tools

| Tool                   | Description                          |
| ---------------------- | ------------------------------------ |
| `list_library_prompts` | List saved prompts from your library |
| `save_to_library`      | Save a prompt to your library        |

## Setup

### 1. Generate an API key

Go to [pretty-prompt.com/settings/mcp](https://pretty-prompt.com/settings/mcp)
and create an API key.

### 2. Build

```bash
npm install
npm run build
```

### 3. Configure Cursor

Add to your Cursor MCP config (`~/.cursor/mcp.json` or project
`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "pretty-prompt": {
      "command": "npx",
      "args": ["-y", "@pretty-prompt/mcp@latest"],
      "env": {
        "PRETTY_PROMPT_API_KEY": "pp_mcp_..."
      }
    }
  }
}
```

For local development, override the production defaults:

```json
"env": {
  "PRETTY_PROMPT_API_KEY": "pp_mcp_...",
  "PRETTY_PROMPT_BACKEND_URL": "http://0.0.0.0:8000",
  "PRETTY_PROMPT_SUPABASE_URL": "http://127.0.0.1:54321",
  "PRETTY_PROMPT_SUPABASE_ANON_KEY": "your-local-anon-key"
}
```

## Environment variables

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `PRETTY_PROMPT_API_KEY` | Yes | — | API key from settings (`pp_mcp_...`) |
| `PRETTY_PROMPT_BACKEND_URL` | No | `https://production.pretty-prompt.com` | FastAPI backend URL |
| `PRETTY_PROMPT_SUPABASE_URL` | No | `https://api.pretty-prompt.com` | Supabase project URL |
| `PRETTY_PROMPT_SUPABASE_ANON_KEY` | No | Production anon key | Supabase anon key |

## Local development

Override env vars to point at local services:

```bash
PRETTY_PROMPT_BACKEND_URL=http://0.0.0.0:8000
PRETTY_PROMPT_SUPABASE_URL=http://127.0.0.1:54321
```

Ensure the backend has `SUPABASE_JWT_SECRET` set and the `mcp_api_keys`
migration is applied.
