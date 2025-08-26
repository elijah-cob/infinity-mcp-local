import { config } from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
// Load .env.local for local development
config({ path: ".env.local" });
// Basic config (env + CLI args)
const argv = process.argv.slice(2);
function readArg(name) {
    const idx = argv.findIndex(a => a === `--${name}` || a === `-${name}`);
    if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith("-"))
        return argv[idx + 1];
    const withEq = argv.find(a => a.startsWith(`--${name}=`));
    if (withEq)
        return withEq.split("=").slice(1).join("=");
    return undefined;
}
const ENV_BASE_URL = process.env.INFINITY_API_BASE_URL;
const ENV_API_KEY = process.env.INFINITY_API_KEY;
const ENV_API_VERSION = process.env.INFINITY_API_VERSION || "2025-02-26.morava";
let RUNTIME_API_KEY = readArg("apiKey") || ENV_API_KEY;
if (!ENV_BASE_URL) {
    console.error("Missing INFINITY_API_BASE_URL (set in .env.local or pass via args)");
}
if (!RUNTIME_API_KEY) {
    console.error("Missing Infinity API key (INFINITY_API_KEY env or --apiKey argument)");
}
function getApiKey(override) {
    return override || RUNTIME_API_KEY || ENV_API_KEY;
}
// Simple Infinity API client
function normalizeBaseUrl() {
    if (!ENV_BASE_URL)
        return undefined;
    // Ensure base ends with /api/v2
    const base = ENV_BASE_URL.replace(/\/$/, "");
    if (base.endsWith("/api/v2"))
        return base;
    if (base.endsWith("/api"))
        return `${base}/v2`;
    return `${base}/api/v2`;
}
function createInfinityClient(apiKeyOverride) {
    const key = getApiKey(apiKeyOverride);
    const client = axios.create({
        baseURL: normalizeBaseUrl(),
        headers: {
            ...(key ? { Authorization: `Bearer ${key}` } : {}),
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-API-Version": ENV_API_VERSION,
        },
        timeout: 30000,
    });
    return client;
}
// Initialize MCP Server
const server = new Server({ name: "infinity-mcp-local", version: "0.1.0" }, {
    capabilities: { tools: {} }
});
// Tool definitions (Infinity tools)
const tools = [
    {
        name: "infinity_set_api_key",
        description: "Set/override the Infinity API key for this process",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string", description: "Infinity API key (will not be logged)" }
            },
            required: ["apiKey"]
        },
        annotations: { title: "Infinity: Set API Key", readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    },
    {
        name: "infinity_ping",
        description: "Ping the Infinity API to verify connectivity/authentication",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string", description: "Optional API key override for this call" }
            }
        },
        annotations: { title: "Infinity: Ping", readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    // List workspaces
    {
        name: "infinity_list_workspaces",
        description: "List workspaces accessible to the authenticated user",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string", description: "Optional API key override for this call" }
            }
        },
        annotations: { title: "Infinity: List Workspaces", readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    // List boards in a workspace
    {
        name: "infinity_list_boards",
        description: "List boards for a workspace",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID (e.g., 669)" },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace"]
        },
        annotations: { title: "Infinity: List Boards", readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    // List items
    {
        name: "infinity_list_items",
        description: "List items on a board, optional folder scoping",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                folder: { type: "string", description: "Optional folder ID to scope items" },
                query: { type: "object", description: "Optional query params (pagination, search)" },
                expand: {
                    type: "array",
                    description: "Expand response with sub-models",
                    items: {
                        type: "string",
                        enum: ["values", "values.attribute", "folder", "created_by"]
                    }
                },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board"]
        },
        annotations: { title: "Infinity: List Items", readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    // Get item
    {
        name: "infinity_get_item",
        description: "Get a single item by ID",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                item: { type: "string", description: "Item ID" },
                expand: {
                    type: "array",
                    description: "Expand response with sub-models",
                    items: { type: "string", enum: ["values", "values.attribute", "folder", "created_by"] }
                },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board", "item"]
        },
        annotations: { title: "Infinity: Get Item", readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    // Create item
    {
        name: "infinity_create_item",
        description: "Create an item on a board",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                body: { type: "object", description: "Item payload (e.g., folder, name, values, etc.)" },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board", "body"]
        },
        annotations: { title: "Infinity: Create Item", readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    // Update item
    {
        name: "infinity_update_item",
        description: "Update an item by ID",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                item: { type: "string", description: "Item ID" },
                body: { type: "object", description: "Update payload (e.g., name, values)" },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board", "item", "body"]
        },
        annotations: { title: "Infinity: Update Item", readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    // Delete item
    {
        name: "infinity_delete_item",
        description: "Delete an item by ID",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                item: { type: "string", description: "Item ID" },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board", "item"]
        },
        annotations: { title: "Infinity: Delete Item", readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    // Bulk: Get multiple items
    {
        name: "infinity_get_items_bulk",
        description: "Get multiple items by IDs concurrently; returns details and errors.",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                items: { type: "array", description: "Array of item IDs", items: { type: "string" } },
                concurrency: { type: "number", description: "Max concurrent requests (default 8)" },
                expand: {
                    type: "array",
                    description: "Expand response with sub-models",
                    items: { type: "string", enum: ["values", "values.attribute", "folder", "created_by"] }
                },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board", "items"]
        },
        annotations: { title: "Infinity: Get Items (Bulk)", readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    // Attributes
    {
        name: "infinity_list_attributes",
        description: "List attributes for a board",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board"]
        },
        annotations: { title: "Infinity: List Attributes", readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    {
        name: "infinity_get_attribute",
        description: "Get a single attribute by ID",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                attribute: { type: "string", description: "Attribute ID" },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board", "attribute"]
        },
        annotations: { title: "Infinity: Get Attribute", readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    // Views
    {
        name: "infinity_list_views",
        description: "List views for a board",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                query: { type: "object", description: "Optional query params (pagination, expand)" },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board"]
        },
        annotations: { title: "Infinity: List Views", readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    {
        name: "infinity_get_view",
        description: "Get a single view by ID",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                view: { type: "string", description: "View ID" },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board", "view"]
        },
        annotations: { title: "Infinity: Get View", readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    {
        name: "infinity_create_view",
        description: "Create a view on a board",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                body: { type: "object", description: "View payload (e.g., name, type, config)" },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board", "body"]
        },
        annotations: { title: "Infinity: Create View", readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    {
        name: "infinity_update_view",
        description: "Update a view by ID",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                view: { type: "string", description: "View ID" },
                body: { type: "object", description: "Update payload (e.g., name, config)" },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board", "view", "body"]
        },
        annotations: { title: "Infinity: Update View", readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    {
        name: "infinity_delete_view",
        description: "Delete a view by ID",
        inputSchema: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Workspace ID" },
                board: { type: "string", description: "Board ID" },
                view: { type: "string", description: "View ID" },
                apiKey: { type: "string", description: "Optional API key override for this call" }
            },
            required: ["workspace", "board", "view"]
        },
        annotations: { title: "Infinity: Delete View", readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    }
];
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    try {
        switch (name) {
            case "infinity_set_api_key": {
                const key = String(args?.apiKey || "");
                RUNTIME_API_KEY = key;
                return { content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }] };
            }
            case "infinity_ping": {
                const client = createInfinityClient(args?.apiKey);
                // Use a lightweight, allowed call in v2 to validate connectivity/auth
                const res = await client.get("/workspaces");
                return { content: [{ type: "text", text: JSON.stringify({ success: true, data: res.data }, null, 2) }] };
            }
            // Workspaces
            case "infinity_list_workspaces": {
                const client = createInfinityClient(args?.apiKey);
                const res = await client.get("/workspaces");
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            // Boards
            case "infinity_list_boards": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const res = await client.get(`/workspaces/${workspace}/boards`);
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            // Items
            case "infinity_list_items": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const folder = args?.folder ? String(args.folder) : undefined;
                const query = args?.query || {};
                const expand = Array.isArray(args?.expand) ? args?.expand : undefined;
                if (expand && expand.length > 0) {
                    // API expects expand[]=values form; construct params accordingly
                    // We'll spread as expand[0], expand[1] ... to be explicit
                    expand.forEach((v, i) => {
                        query[`expand[${i}]`] = v;
                    });
                }
                const url = folder
                    ? `/workspaces/${workspace}/boards/${board}/folders/${folder}/items`
                    : `/workspaces/${workspace}/boards/${board}/items`;
                const res = await client.get(url, { params: query });
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            case "infinity_get_item": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const item = String(args?.item || "");
                const query = {};
                const expand = Array.isArray(args?.expand) ? args?.expand : undefined;
                if (expand && expand.length > 0) {
                    expand.forEach((v, i) => { query[`expand[${i}]`] = v; });
                }
                const res = await client.get(`/workspaces/${workspace}/boards/${board}/items/${item}`, { params: query });
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            case "infinity_create_item": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const body = args?.body || {};
                const res = await client.post(`/workspaces/${workspace}/boards/${board}/items`, body);
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            case "infinity_update_item": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const item = String(args?.item || "");
                const body = args?.body || {};
                const res = await client.put(`/workspaces/${workspace}/boards/${board}/items/${item}`, body);
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            case "infinity_delete_item": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const item = String(args?.item || "");
                const res = await client.delete(`/workspaces/${workspace}/boards/${board}/items/${item}`);
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            case "infinity_get_items_bulk": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const items = (Array.isArray(args?.items) ? args?.items : []);
                const maxConcurrency = Math.max(1, Math.min(32, Number(args?.concurrency) || 8));
                const expand = Array.isArray(args?.expand) ? args?.expand : undefined;
                async function worker(id) {
                    try {
                        const query = {};
                        if (expand && expand.length > 0) {
                            expand.forEach((v, i) => { query[`expand[${i}]`] = v; });
                        }
                        const res = await client.get(`/workspaces/${workspace}/boards/${board}/items/${id}`, { params: query });
                        return { id, data: res.data };
                    }
                    catch (e) {
                        return { id, error: e?.response?.data || e?.message || String(e) };
                    }
                }
                const queue = items.slice();
                const results = [];
                async function runOne() {
                    while (queue.length) {
                        const id = queue.shift();
                        const r = await worker(id);
                        results.push(r);
                    }
                }
                const runners = Array.from({ length: Math.min(maxConcurrency, items.length || 1) }, () => runOne());
                await Promise.all(runners);
                const successes = results.filter(r => !r.error).map(r => r.data);
                const failures = results.filter(r => r.error).map(r => ({ id: r.id, error: r.error }));
                return { content: [{ type: "text", text: JSON.stringify({ success: true, successes, failures }, null, 2) }] };
            }
            case "infinity_list_attributes": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const res = await client.get(`/workspaces/${workspace}/boards/${board}/attributes`);
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            case "infinity_get_attribute": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const attribute = String(args?.attribute || "");
                const res = await client.get(`/workspaces/${workspace}/boards/${board}/attributes/${attribute}`);
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            // Views
            case "infinity_list_views": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const query = args?.query || {};
                const res = await client.get(`/workspaces/${workspace}/boards/${board}/views`, { params: query });
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            case "infinity_get_view": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const view = String(args?.view || "");
                const res = await client.get(`/workspaces/${workspace}/boards/${board}/views/${view}`);
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            case "infinity_create_view": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const body = args?.body || {};
                const res = await client.post(`/workspaces/${workspace}/boards/${board}/views`, body);
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            case "infinity_update_view": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const view = String(args?.view || "");
                const body = args?.body || {};
                const res = await client.put(`/workspaces/${workspace}/boards/${board}/views/${view}`, body);
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            case "infinity_delete_view": {
                const client = createInfinityClient(args?.apiKey);
                const workspace = String(args?.workspace || "");
                const board = String(args?.board || "");
                const view = String(args?.view || "");
                const res = await client.delete(`/workspaces/${workspace}/boards/${board}/views/${view}`);
                return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
            }
            default:
                return {
                    content: [{ type: "text", text: JSON.stringify({ success: false, message: `Unknown tool: ${name}` }, null, 2) }],
                    isError: true
                };
        }
    }
    catch (error) {
        const err = error;
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        message: "Infinity API request failed",
                        error: err?.response?.data || err?.message || String(err)
                    }, null, 2)
                }],
            isError: true
        };
    }
});
// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("infinity-mcp-local started (stdio)");
