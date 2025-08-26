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

- infinity_list_workspaces
- infinity_list_boards (requires `workspace`)
- infinity_list_items (requires `workspace`, `board`, optional `folder`)
- infinity_get_item (requires `workspace`, `board`, `item`)
- infinity_create_item (requires `workspace`, `board`, `body`)
- infinity_update_item (requires `workspace`, `board`, `item`, `body`)
- infinity_delete_item (requires `workspace`, `board`, `item`)
- infinity_ping (auth check via /workspaces)
- infinity_set_api_key (set key at runtime)

Documentation reference: [StartInfinity API Docs](https://devdocs.startinfinity.com/2025-02-26.morava)

