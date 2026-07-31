# `rolecraft agents`

Display the agent capability manifest — a structured overview of all supported AI coding agents, their skill install directories, support levels, and MCP server configuration support.

## Usage

```bash
rolecraft agents

# Output as JSON
rolecraft agents --json
```

## Description

The `agents` command reads the agent capability manifest — a single source of truth for agent support metadata — and displays it in a human-readable table or machine-readable JSON.

Each agent entry includes:

| Field | Description |
|-------|-------------|
| `flag` | CLI flag used with install (e.g. `--claude`, `--cursor`) |
| `name` | Agent identifier |
| `skillInstallScope` | Where skills are installed (global path or project path) |
| `supportLevel` | `verified`, `community`, `legacy`, or `experimental` |
| `mcpSupport` | Whether MCP servers are supported and in which config format |
| `instructionFormat` | Skill instruction file format (`skill-md`, `mdc`, `agents-md`, etc.) |
| `docUrl` | Official documentation URL |
| `lastVerified` | Last verification date (ISO date) |

## Support levels

| Level | Meaning |
|-------|---------|
| `verified` | Actively tested and maintained by the RoleCraft team |
| `community` | Community-contributed; maintained on best-effort basis |
| `legacy` | Previous generation agent; no active development |
| `experimental` | Known to exist; not formally tested |

## Example output

```bash
$ rolecraft agents

Agent Capability Manifest
=========================

VERIFIED (3)
  opencode     ~/.agents/skills/         MCP: -
  claude-code  ~/.claude/skills/         MCP: mcpServers
  cursor       ~/.cursor/skills/         MCP: mcpServers

COMMUNITY (3)
  windsurf     ~/.windsurf/skills/       MCP: mcpServers
  codex        ~/.codex/skills/          MCP: -
  continue     ~/.continue/skills/       MCP: experimental.mcpServers

LEGACY (1)
  copilot      ./.github/copilot/skills/  MCP: -

EXPERIMENTAL (79)
  aider        ~/.aider/skills/          MCP: -
  cline        ~/.cline/skills/          MCP: -
  ...
```

```bash
$ rolecraft agents --json

{
  "version": "1.0",
  "generated": "2026-07-28",
  "agentCount": 86,
  "agents": [
    {
      "flag": "claude",
      "name": "claude-code",
      "label": "~/.claude/skills/",
      "skillInstallScope": "global ~/.claude/skills",
      "supportLevel": "verified",
      "mcpSupport": {
        "supported": true,
        "format": "mcpServers",
        "configPath": "~/.claude.json"
      },
      "instructionFormat": "skill-md",
      "docUrl": "https://docs.anthropic.com/en/docs/claude-code",
      "lastVerified": "2026-07-27"
    }
  ]
}
```

## Node.js API

This command is also available as programmatic functions. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { getAgentManifest, validateManifest } from 'rolecraft'

const agents = getAgentManifest()
const validation = validateManifest()
```
