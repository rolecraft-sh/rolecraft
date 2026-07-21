# MCP Server Management

rolecraft can install and manage [Model Context Protocol (MCP)](https://modelcontextprotocol.io) servers alongside skills. This means you can provision both **behavior** (skills) and **capabilities** (MCP tools) for your AI agents in a single workflow.

## Why MCP + Skills Together?

- **Skill** → changes how an agent behaves (coding rules, style guides, conventions)
- **MCP** → expands what an agent can do (query databases, call APIs, access GitHub, search the web)

When a `SKILL.md` declares `mcp_servers:` in its frontmatter, `rolecraft install` installs both the skill and its required MCP servers in one command — no manual config editing.

## Quick Start

```bash
# Install from npm (Node.js)
rolecraft mcp install npm:@modelcontextprotocol/github --cursor --claude

# Install from GitHub (Node.js)
rolecraft mcp install gh:github/github-mcp-server --all

# Install from Python (uvx)
rolecraft mcp install uvx:@anthropic/postgres-mcp --cursor

# Install from Python (pipx)
rolecraft mcp install pipx:postgres-mcp --cursor

# Install from Go
rolecraft mcp install go:github.com/org/mcp-server --all

# Install from Deno
rolecraft mcp install deno:jsr:@org/mcp-server --all

# Install from Rust (cargo)
rolecraft mcp install cargo:my-mcp-server --cursor

# Install from a local path
rolecraft mcp install ./my-mcp-server --cursor

# List configured MCP servers
rolecraft mcp list

# Remove an MCP server
rolecraft mcp remove github-mcp-server --cursor
```

## Onboarding Example

Suppose your team has three developers using different agents — Cursor, Claude Code, and Windsurf. You want everyone to use the same PostgreSQL conventions **and** have database access via MCP:

### 1. Create a skill with `mcp_servers`

```yaml
---
name: my-postgres-rules
description: Team PostgreSQL style guide
mcp_servers:
  - name: github
    source: gh:github/github-mcp-server
  - name: postgres
    source: npm:@anthropic/postgres-mcp
---

- Always prefer `JOIN` over subqueries
- `SELECT *` is forbidden
- All queries must be parameterized
```

### 2. Install with a single command

```bash
rolecraft install ./my-postgres-rules --cursor --claude --windsurf
```

This does **three things** automatically:
1. **Skill installation** → copies `my-postgres-rules` to `~/.cursor/skills/`, `~/.claude/skills/`, `~/.windsurf/skills/`
2. **MCP installation** → reads `mcp_servers` from SKILL.md, resolves the sources
3. **Config wiring** → writes MCP config in each agent's native format:
   - Cursor: `~/.cursor/mcp.json`
   - Claude Code: `~/.claude.json`
   - Windsurf: `~/.windsurf/mcp_config.json`

### 3. Each agent can now

- **Follow rules** — never writes `SELECT *`, always uses `JOIN`
- **Query the database** — via the Postgres MCP server
- **Access GitHub** — via the GitHub MCP server

### 4. Team onboarding with bundle

```bash
# Team lead creates a bundle once
rolecraft bundle create team-onboarding

# Every developer runs
rolecraft bundle install team-onboarding.json
# → All skills installed
# → All MCP servers configured automatically
# → Each agent's config written in the correct format
```

## Supported MCP Agents

| Agent | Config File | Format |
|-------|------------|--------|
| opencode | `~/.agents/mcp.json` | Standard `mcpServers` object |
| claude-code | `~/.claude.json` | Standard `mcpServers` object |
| cursor | `~/.cursor/mcp.json` | Standard `mcpServers` object |
| windsurf | `~/.windsurf/mcp_config.json` | Standard `mcpServers` object |
| devin | `~/.devin/mcp.json` | Standard `mcpServers` object |
| copilot | `./.github/copilot/.mcp.json` | `{ inputs: [], servers: {} }` |
| continue | `~/.continue/config.json` | `{ experimental: { mcpServers: [] } }` |

More agents will be added as their MCP standards solidify.

## Source Types

| Source | Example | Description |
|--------|---------|-------------|
| `npm:` | `npm:@modelcontextprotocol/github` | Install from npm, runs via `npx -y` |
| `gh:` | `gh:github/github-mcp-server` | Clone from GitHub, runs via `node` |
| `uvx:` | `uvx:@anthropic/postgres-mcp` | Python package via `uvx` |
| `pipx:` | `pipx:postgres-mcp` | Python package via `pipx run` |
| `go:` | `go:github.com/org/mcp-server` | Go package via `go run` |
| `deno:` | `deno:jsr:@org/mcp-server` | Deno module via `deno run` |
| `cargo:` | `cargo:my-mcp-server` | Rust crate via `cargo run` |
| Local path | `./my-mcp-server/index.js` | Run directly with `node` |

## Commands

See [`docs/commands/mcp.md`](./commands/mcp.md) for the full command reference.

## SKILL.md Integration

When a skill declares `mcp_servers:` in its YAML frontmatter, `rolecraft install` automatically installs those MCP servers to the same agent targets. You don't need to run a separate `rolecraft mcp install` command.

```yaml
---
name: my-skill
mcp_servers:
  - name: server-name
    source: npm:@org/mcp-server
---
```

If you only want the skill without MCP servers, pass `--no-mcp` during installation.
