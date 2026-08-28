import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpAnalytics } from "./analytics/index.js";
import { loadConfig } from "./config.js";
import { AuthManager } from "./auth.js";
import { EdgeFunctionClient } from "./client/edge.js";
import { BackendClient } from "./client/backend.js";
import { registerListLibraryPrompts } from "./tools/library.js";
import { registerGetLibraryPrompt } from "./tools/get-library-prompt.js";
import { registerSaveToLibrary } from "./tools/save-to-library.js";
import { registerDeleteLibraryPrompt } from "./tools/delete-library-prompt.js";
import { registerUpdateLibraryPrompt } from "./tools/update-library-prompt.js";
import { registerFavoriteLibraryPrompt } from "./tools/favorite-library-prompt.js";
import { registerImprovePrompt } from "./tools/improve-prompt.js";
import { registerListLibraryFolders } from "./tools/folders.js";
import { registerMovePromptToFolder } from "./tools/move-prompt-to-folder.js";
import {
  registerCreateLibraryFolder,
  registerRenameLibraryFolder,
  registerDeleteLibraryFolder,
} from "./tools/create-rename-folder.js";
import {
  registerListLibraryTags,
  registerGetLibraryTag,
  registerCreateLibraryTag,
  registerUpdateLibraryTag,
  registerDeleteLibraryTag,
  registerAddTagToLibraryPrompt,
  registerRemoveTagFromLibraryPrompt,
} from "./tools/tags.js";

async function main() {
  const config = loadConfig();
  const auth = new AuthManager(config);
  const analytics = new McpAnalytics(config, auth);
  const edge = new EdgeFunctionClient(config, auth);
  const backend = new BackendClient(config, auth);

  const server = new McpServer({
    name: "pretty-prompt",
    version: "0.3.9",
  });

  registerListLibraryPrompts(server, backend, analytics);
  registerGetLibraryPrompt(server, backend, analytics);
  registerSaveToLibrary(server, edge, analytics);
  registerDeleteLibraryPrompt(server, backend, analytics);
  registerUpdateLibraryPrompt(server, backend, analytics);
  registerFavoriteLibraryPrompt(server, backend, analytics);
  registerListLibraryFolders(server, backend, analytics);
  registerCreateLibraryFolder(server, backend, analytics);
  registerRenameLibraryFolder(server, backend, analytics);
  registerDeleteLibraryFolder(server, backend, analytics);
  registerMovePromptToFolder(server, backend, analytics);
  registerListLibraryTags(server, backend, analytics);
  registerGetLibraryTag(server, backend, analytics);
  registerCreateLibraryTag(server, backend, analytics);
  registerUpdateLibraryTag(server, backend, analytics);
  registerDeleteLibraryTag(server, backend, analytics);
  registerAddTagToLibraryPrompt(server, backend, analytics);
  registerRemoveTagFromLibraryPrompt(server, backend, analytics);
  registerImprovePrompt(server, edge, analytics);

  void analytics.trackServerStarted();

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Pretty Prompt MCP server error:", error);
  process.exit(1);
});
