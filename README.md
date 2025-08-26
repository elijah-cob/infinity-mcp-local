# Infinity MCP (Local, stdio)

Local-only MCP implementation that communicates over stdio. No HTTP server is started.

Quick start

- Requirements: Node >= 18.19
- Setup:
  1) Copy .env.example to .env.local and fill in values
  2) npm install
  3) npm run build
  4) npm start

Environment variables

- INFINITY_API_BASE_URL: Base URL for the Infinity API (e.g., https://app.startinfinity.com)
- INFINITY_API_KEY: API key for authenticating with Infinity
- TIMEZONE: Optional default timezone (e.g., America/New_York)
- INFINITY_API_VERSION: Defaults to 2025-02-26.morava. Ensure it matches the docs version.

Notes

- This package exposes a bin: `infinity-mcp-local` which runs the stdio transport
- Tools are defined in `src/index.ts` and loaded on start
- Endpoints follow StartInfinity REST API v2 with `X-API-Version` header.

Tools

- infinity_set_api_key
- infinity_ping (auth check)
- infinity_list_workspaces
- infinity_list_boards (requires `workspace`)
- infinity_list_items (requires `workspace`, `board`; optional `folder`, `expand`, `query`)
- infinity_get_item (requires `workspace`, `board`, `item`)
- infinity_create_item (requires `workspace`, `board`, `body`)
- infinity_update_item (requires `workspace`, `board`, `item`, `body`)
- infinity_delete_item (requires `workspace`, `board`, `item`)
- infinity_get_items_bulk (requires `workspace`, `board`, `items`; optional `expand`, `concurrency`)
- infinity_list_attributes (requires `workspace`, `board`)
- infinity_get_attribute (requires `workspace`, `board`, `attribute`)
- infinity_list_views (requires `workspace`, `board`)
- infinity_get_view (requires `workspace`, `board`, `view`)
- infinity_create_view (requires `workspace`, `board`, `body`)
- infinity_update_view (requires `workspace`, `board`, `view`, `body`)
- infinity_delete_view (requires `workspace`, `board`, `view`)

Documentation reference: [StartInfinity API Docs](https://devdocs.startinfinity.com/2025-02-26.morava)


## Using with Cursor (MCP)

Add this MCP server to Cursor by creating or updating a `mcp.json` file.

- Workspace-level: `<project>/.cursor/mcp.json`
- Global: `~/.cursor/mcp.json` (Windows: `C:\Users\<you>\.cursor\mcp.json`)

Example `mcp.json` (safe placeholders):

```json
{
  "infinity": {
    "command": "infinity-mcp-local",
    "args": [],
    "env": {
      "INFINITY_API_BASE_URL": "https://app.startinfinity.com",
      "INFINITY_API_KEY": "YOUR_API_KEY_HERE",
      "INFINITY_API_VERSION": "2025-02-26.morava"
    }
  }
}
```

Notes

- You can use the Node entrypoint instead of the bin if preferred:

```json
{
  "infinity": {
    "command": "node",
    "args": ["/path/to/infinity-mcp-local/dist/index.js"],
    "env": {
      "INFINITY_API_BASE_URL": "https://app.startinfinity.com",
      "INFINITY_API_KEY": "YOUR_API_KEY_HERE",
      "INFINITY_API_VERSION": "2025-02-26.morava"
    }
  }
}
```

- Windows path variant (escape backslashes):

```json
{
  "infinity": {
    "command": "node",
    "args": ["C:\\path\\to\\infinity-mcp-local\\dist\\index.js"],
    "env": { /* same as above */ }
  }
}
```

- Do not commit real API keys. Use environment managers or keep `mcp.json` out of version control if it contains secrets.
