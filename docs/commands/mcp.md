# `rolecraft mcp` — MCP Server Management

Install, list, search, and remove MCP servers for AI agents.

## Usage

```bash
rolecraft mcp install <source> [options]
rolecraft mcp list [options]
rolecraft mcp search <query> [options]
rolecraft mcp remove <name> [options]
```

## Subcommands

### `install`

Install an MCP server from a source.

```bash
# npm / npx
rolecraft mcp install npm:@modelcontextprotocol/github --cursor --claude

# GitHub
rolecraft mcp install gh:github/github-mcp-server --all

# Python (uvx)
rolecraft mcp install uvx:@anthropic/postgres-mcp --cursor

# Python (pipx)
rolecraft mcp install pipx:postgres-mcp --cursor

# Go
rolecraft mcp install go:github.com/org/mcp-server --all

# Deno
rolecraft mcp install deno:jsr:@org/mcp-server --all

# Rust
rolecraft mcp install cargo:my-mcp-server --cursor

# Local path
rolecraft mcp install ./local-server.js --cursor

# Dry-run
rolecraft mcp install npm:@anthropic/postgres-mcp --all --dry-run

# Custom name
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

### `search`

Search for MCP servers on GitHub or npm.

```bash
# Search GitHub for repos with topic:mcp-server
rolecraft mcp search github

# Search npm registry for MCP packages
rolecraft mcp search postgres --npm

# Interactive picker with install
rolecraft mcp search github --interactive
```

**Options:**
- `--interactive` — Pick a result and install it
- `--npm` — Search npm registry instead of GitHub

**Example output:**
```
$ rolecraft mcp search github

🔍 MCP server search results for "github":

   github/github-mcp-server
   ├─ Official GitHub MCP server  ⭐ 8500  Go
   └─ rolecraft mcp install gh:github/github-mcp-server

   modelcontextprotocol/servers
   ├─ MCP server implementations  ⭐ 12000  TypeScript
   └─ rolecraft mcp install gh:modelcontextprotocol/servers

12 result(s) found.
```

## Sources

See [`docs/mcp.md`](../mcp.md) for source type details.
