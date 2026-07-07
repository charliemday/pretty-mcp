import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { AuthManager } from "./auth.js";
import { EdgeFunctionClient } from "./client/edge.js";
import { BackendClient } from "./client/backend.js";
import { registerListLibraryPrompts } from "./tools/library.js";
import { registerSaveToLibrary } from "./tools/save-to-library.js";

async function main() {
  const config = loadConfig();
  const auth = new AuthManager(config);
  const edge = new EdgeFunctionClient(config, auth);
  const backend = new BackendClient(config, auth);

  const server = new McpServer({
    name: "pretty-prompt",
    version: "0.1.0",
  });

  registerListLibraryPrompts(server, backend);
  registerSaveToLibrary(server, edge);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Pretty Prompt MCP server error:", error);
  process.exit(1);
});
