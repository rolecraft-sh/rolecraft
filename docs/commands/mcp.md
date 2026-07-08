# `rolecraft mcp` — MCP Server Management

Install, list, and remove MCP servers for AI agents.

## Usage

```bash
rolecraft mcp install <source> [options]
rolecraft mcp list [options]
rolecraft mcp remove <name> [options]
```

## Subcommands

### `install`

Install an MCP server from a source.

```bash
rolecraft mcp install npm:@modelcontextprotocol/github --cursor --claude
rolecraft mcp install gh:github/github-mcp-server --all
rolecraft mcp install ./local-server.js --cursor
rolecraft mcp install npm:@anthropic/postgres-mcp --all --dry-run
rolecraft mcp install npm:@test/mcp --name my-server --cursor
```

**Options:**
- `--name <name>` — Override the server name (default: auto-detected from source)
- `--dry-run` — Preview without making changes
- `--agents`, `--cursor`, `--claude`, `--copilot`, `--continue`, etc. — Target specific agents
- `--all` — Install to all supported MCP agents

### `list`

List configured MCP servers.

```bash
rolecraft mcp list
rolecraft mcp list --cursor --claude
```

### `remove`

Remove an MCP server.

```bash
rolecraft mcp remove github-mcp-server --cursor
rolecraft mcp remove postgres --all
```

## Sources

See [`docs/mcp.md`](../mcp.md) for source type details.
