# `rolecraft setup`

One command. All agents. Skills + MCP servers. Zero configuration.

Detect every AI agent on your machine and install a skill — plus its MCP servers — to all of them at once.

## Usage

```bash
rolecraft setup                    # detect agents only
rolecraft setup <source>           # detect + install skill + MCP to all agents
```

## Description

`rolecraft setup` is the **onboarding command**. It:

1. Scans your system for all installed AI agent directories (opencode, cursor, claude-code, copilot, aider, etc.)
2. When a source is provided: resolves the skill, runs a security scan, installs to every detected agent, and sets up any MCP servers declared in `SKILL.md`

This is the fastest way to go from zero to productive — one command configures every AI agent you use.

## Examples

### Detect agents only

```bash
rolecraft setup
```

Shows which agents are installed and how many skills each has.

### Install to all agents

```bash
rolecraft setup ./my-skill
rolecraft setup sametcelikbicak/task-decomposer
rolecraft setup npm:@org/agent-rules
```

Installs the skill to every detected agent automatically. No need to specify `--cursor`, `--claude`, etc.

### With MCP servers

If the skill's `SKILL.md` declares MCP servers:

```yaml
mcp_servers:
  - name: filesystem
    source: npm:@modelcontextprotocol/server-filesystem
```

`rolecraft setup ./my-skill` installs both the skill and the MCP servers to all agents.

### Non-interactive (CI)

```bash
rolecraft setup ./my-skill -y
rolecraft setup ./my-skill --dry-run -y    # preview without installing
```

### Team onboarding

```bash
# First team member creates a bundle
rolecraft bundle create team-defaults

# New members run
rolecraft setup ./team-defaults    # after cloning the repo
```

## See also

- [Onboarding guide](../guides/onboarding.md) — full walkthrough
- [`rolecraft install`](./install.md) — single-agent installation with scope flags
- [`rolecraft bundle`](./bundle.md) — multi-skill installation
- [`rolecraft doctor`](./doctor.md) — system health check
