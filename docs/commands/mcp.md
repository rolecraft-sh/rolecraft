# `rolecraft mcp` — MCP Server Management

Install, list, search, check, update, and remove MCP servers for AI agents.

## Usage

```bash
rolecraft mcp install <source> [options]
rolecraft mcp list [options]
rolecraft mcp search <query> [options]
rolecraft mcp check
rolecraft mcp update <source> [options]
rolecraft mcp remove <name> [options]
```

## Subcommands

### `install`

Install an MCP server from a source. Automatically scans `gh:` sources for security issues before installing.

```bash
# npm / npx
rolecraft mcp install npm:@modelcontextprotocol/github --cursor --claude

# npm with version pinning
rolecraft mcp install npm:@modelcontextprotocol/github@1.2.3 --cursor

# GitHub
rolecraft mcp install gh:github/github-mcp-server --all

# GitHub with branch/tag pinning
rolecraft mcp install gh:github/github-mcp-server@main --all
rolecraft mcp install gh:github/github-mcp-server@v1.0.0 --cursor

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
- `--yes`, `-y` — Skip confirmation and security blocks
- `--agents`, `--cursor`, `--claude`, `--copilot`, `--continue`, etc. — Target specific agents
- `--all` — Install to all supported MCP agents

### `update`

Reinstall an MCP server, refreshing to the latest version (or a specified version).

```bash
# Update to latest
rolecraft mcp update npm:@modelcontextprotocol/github --cursor

# Update to a specific version
rolecraft mcp update npm:@modelcontextprotocol/github@1.2.3 --cursor

# Update and change target agents
rolecraft mcp update npm:@modelcontextprotocol/github --cursor --claude

# Dry-run
rolecraft mcp update npm:@modelcontextprotocol/github --dry-run
```

**Options:**
- `--name <name>` — Override the server name (default: auto-detected from source)
- `--dry-run` — Preview without making changes
- `--yes`, `-y` — Skip confirmation
- `--agents`, `--cursor`, `--claude`, etc. — Target specific agents
- `--all` — Update on all agents

### `check`

Check installed MCP servers for available updates.

```bash
rolecraft mcp check
```

Queries the npm registry for the latest version of each npm-sourced MCP server and reports which ones are outdated. Non-npm sources (local paths, GitHub repos) are skipped with a notice.

**Example output:**

```
Checking 3 MCP server(s) for updates...

   🔄 @modelcontextprotocol/github    1.0.0 → 2.0.0 (cursor, claude)
   ✅ @anthropic/postgres-mcp         0.5.0 is latest (cursor)
   ⏭️ ./local-server.js                non-npm source, skipping

⚠️  1 MCP server(s) have updates available.
```

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
