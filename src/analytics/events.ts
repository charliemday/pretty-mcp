export const MCP_ANALYTICS_EVENTS = {
  SERVER_STARTED: "mcp_server_started",
  FIRST_CONNECTED: "mcp_first_connected",
  TOOL_CALLED: "mcp_tool_called",
} as const;

export type McpAnalyticsEvent =
  (typeof MCP_ANALYTICS_EVENTS)[keyof typeof MCP_ANALYTICS_EVENTS];
