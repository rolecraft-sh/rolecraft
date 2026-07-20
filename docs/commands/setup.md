# `rolecraft setup`

One command. All agents. Skills + MCP servers. Zero configuration.

Detect every AI agent on your machine and install a skill — plus its MCP servers — to all of them at once.

## Usage

```bash
rolecraft setup                    # detect agents only
rolecraft setup <source>           # detect + install skill + MCP to all agents
rolecraft setup <source> --list    # list skills without installing
rolecraft setup <source> --skill <names>  # install specific skills
```

## Description

`rolecraft setup` is the **onboarding command**. It:

1. Scans your system for all installed AI agent directories (opencode, cursor, claude-code, copilot, aider, etc.)
2. When a source is provided: resolves the skill(s), installs to every detected agent, and sets up any MCP servers declared in `SKILL.md`

For sources with multiple skills (e.g. `mattpocock/skills`), you'll be prompted to select which skills to install. Use `--yes` to install all, or `--skill` to pick specific ones.

This is the fastest way to go from zero to productive — one command configures every AI agent you use.

## Options

| Flag | Description |
|------|-------------|
| `--yes`, `-y` | Install all skills without prompt |
| `--dry-run` | Preview without installing |
| `--list` | List available skills without installing |
| `--skill <names>` | Install specific skills by name (comma-separated) |

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

### Multi-skill source

```bash
# Show skills in a multi-skill source without installing
rolecraft setup mattpocock/skills --list

# Install specific skills
rolecraft setup mattpocock/skills --skill "typescript-rules,react-rules"

# Install all with --yes
rolecraft setup mattpocock/skills -y
```

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
