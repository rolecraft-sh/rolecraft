# `rolecraft init`

Scaffold a new `SKILL.md` for your agent skill.

## Usage

```bash
rolecraft init                               # create ./SKILL.md (default: my-skill)
rolecraft init my-custom-tool                # create ./my-custom-tool/SKILL.md
rolecraft init namespace/skill               # create ./namespace-skill/SKILL.md
rolecraft init --list                        # list available templates
rolecraft init my-skill --template basic     # scaffold from a template
rolecraft init my-skill --template mcp       # scaffold with MCP server setup
```

## Description

Generates a ready-to-edit `SKILL.md` with proper slug, name, and owner metadata. Edit it with your skill instructions, then install with `rolecraft install <dir>`.

Use `--list` to see all available templates. Use `--template <name>` to scaffold from a specific template that pre-fills sections, MCP server configuration, or agent targeting for common patterns.

## Options

| Option | Description |
|--------|-------------|
| `--list` | List all available templates with descriptions |
| `--template <name>` | Scaffold from a named template instead of the default |

## Available templates

| Template | Description |
|----------|-------------|
| `basic` | Minimal frontmatter with name, slug, owner, and description. No body sections. |
| `standard` | Full scaffold with frontmatter and structured sections (description, when to use, examples, links). Recommended for most skills. **(default)** |
| `mcp` | Pre-configured with MCP server declarations in frontmatter. Ideal for skills that integrate with external tools. |
| `rules` | Rule-based skill with instruction-style body. Suitable for Claude Code `.mdc`-style agent rules. |
| `empty` | Just the frontmatter — no body content. Useful when you want full control over the structure. |

The `standard` template is used when no `--template` flag is provided.

## Examples

### List available templates
```bash
rolecraft init --list
# Available templates:
#   basic      Minimal frontmatter only
#   standard   Full scaffold with structured sections (default)
#   mcp        Pre-configured with MCP server declarations
#   rules      Rule-based skill for agent instructions
#   empty      Just the frontmatter
```

### Scaffold with default template
```bash
rolecraft init
# Creates ./SKILL.md

rolecraft init code-reviewer
# Creates ./code-reviewer/SKILL.md

rolecraft init myorg/ts-helper
# Creates ./myorg-ts-helper/SKILL.md
```

### Scaffold from a specific template
```bash
rolecraft init my-tool --template basic
# Creates ./my-tool/SKILL.md with minimal frontmatter

rolecraft init db-agent --template mcp
# Creates ./db-agent/SKILL.md pre-configured with MCP server setup

rolecraft init my-rules --template rules
# Creates ./my-rules/SKILL.md as a rule-based skill

rolecraft init scratch --template empty
# Creates ./scratch/SKILL.md with frontmatter only
```

## Node.js API

This command is also available as a programmatic function. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { init } from 'rolecraft'
const result = await init('my-custom-tool')
```
