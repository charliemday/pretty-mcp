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
      "command": "node",
      "args": ["/absolute/path/to/pretty-mcp/dist/index.js"],
      "env": {
        "PRETTY_PROMPT_API_KEY": "pp_mcp_...",
        "PRETTY_PROMPT_BACKEND_URL": "https://production.pretty-prompt.com",
        "PRETTY_PROMPT_SUPABASE_URL": "https://api.pretty-prompt.com",
        "PRETTY_PROMPT_SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

## Environment variables

| Variable                          | Required | Description                          |
| --------------------------------- | -------- | ------------------------------------ |
| `PRETTY_PROMPT_API_KEY`           | Yes      | API key from settings (`pp_mcp_...`) |
| `PRETTY_PROMPT_BACKEND_URL`       | Yes      | FastAPI backend URL                  |
| `PRETTY_PROMPT_SUPABASE_URL`      | Yes      | Supabase project URL                 |
| `PRETTY_PROMPT_SUPABASE_ANON_KEY` | Yes      | Supabase anon key                    |

## Local development

Point env vars at local services:

```bash
PRETTY_PROMPT_BACKEND_URL=http://0.0.0.0:8000
PRETTY_PROMPT_SUPABASE_URL=http://127.0.0.1:54321
```

Ensure the backend has `SUPABASE_JWT_SECRET` set and the `mcp_api_keys`
migration is applied.
