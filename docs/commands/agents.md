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

🔍 Agent Capability Manifest

Total agents: 86

## VERIFIED

| Agent | Skill Scope | MCP | Instruction | Docs |
|-------|-------------|-----|-------------|------|
| opencode | ~/.agents/skills/ | ❌ | skill-md | [docs](https://opencode.ai) |
| claude-code | ~/.claude/skills/ | ✅ | skill-md | [docs](https://docs.anthropic.com/en/docs/claude-code) |
| cursor | ~/.cursor/skills/ | ✅ | skill-md | [docs](https://cursor.com) |
| windsurf | ~/.codeium/windsurf/skills/ | ✅ | skill-md | [docs](https://docs.windsurf.com) |
| devin | ./.devin/skills/ | ❌ | skill-md | [docs](https://devin.ai) |
| ... | ... | ... | ... | ... |

## MCP-Supported Agents

These agents have built-in MCP configuration support:
  • claude-code (mcpServers)
  • cursor (mcpServers)
  • windsurf (mcpServers)
  • continue (experimental.mcpServers)

## Validation

Manifest valid: ✅ Yes
Agent count: 86
```

```bash
$ rolecraft agents --json

{
  "version": 1,
  "agentCount": 86,
  "agents": [
    {
      "flag": "claude",
      "name": "claude-code",
      "label": "~/.claude/skills/",
      "skillInstallScope": "global ~/.claude/skills",
      "mcpSupport": {
        "supported": true,
        "format": "mcpServers",
        "configPath": "~/.claude.json"
      },
      "instructionFormat": "skill-md",
      "supportLevel": "verified",
      "docUrl": "https://docs.anthropic.com/en/docs/claude-code",
      "lastVerified": "2026-07-27",
      "notes": null,
      "aliasFor": null
    }
  ]
}
```

## Node.js API

This command is not available as a package-level API function. The manifest is internal to the CLI — see the [Node.js API documentation](../api.md) for the functions that are exported from `rolecraft`.
