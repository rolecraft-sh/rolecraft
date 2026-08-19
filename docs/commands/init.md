# `rolecraft init`

Scaffold a new `SKILL.md` for your agent skill.

## Usage

```bash
rolecraft init                               # create ./my-skill/SKILL.md (default: my-skill)
rolecraft init my-custom-tool                # create ./my-custom-tool/SKILL.md
rolecraft init namespace/skill               # create ./namespace-skill/SKILL.md
rolecraft init --list                        # list available templates
rolecraft init my-skill --template basic     # scaffold from a template
rolecraft init my-skill --template react     # scaffold with React best practices
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
| `basic` | General-purpose skill template for AI agent instructions |
| `code-review` | Code review guidelines and best practices for AI agents |
| `git-workflow` | Git workflow conventions and branch strategy for AI agents |
| `testing` | Testing guidelines and best practices for AI agents |
| `security` | Security guidelines and dangerous pattern detection for AI agents |
| `react` | React best practices and component patterns for AI agents |

When no `--template` flag is provided, a minimal frontmatter scaffold is created (backward-compatible with older versions).

## Examples

### List available templates
```bash
rolecraft init --list
# Available templates:
#   basic                General-purpose skill template for AI agent instructions
#   code-review          Code review guidelines and best practices for AI agents
#   git-workflow         Git workflow conventions and branch strategy for AI agents
#   testing              Testing guidelines and best practices for AI agents
#   security             Security guidelines and dangerous pattern detection for AI agents
#   react                React best practices and component patterns for AI agents
```

### Scaffold with default template
```bash
rolecraft init
# Creates ./my-skill/SKILL.md

rolecraft init code-reviewer
# Creates ./code-reviewer/SKILL.md

rolecraft init myorg/ts-helper
# Creates ./myorg-ts-helper/SKILL.md
```

### Scaffold from a specific template
```bash
rolecraft init my-tool --template basic
# Creates ./my-tool/SKILL.md with minimal frontmatter

rolecraft init review-bot --template code-review
# Creates ./review-bot/SKILL.md pre-filled with code review guidelines

rolecraft init my-rules --template git-workflow
# Creates ./my-rules/SKILL.md as a git workflow skill
```

## Node.js API

This command is also available as a programmatic function. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { init } from 'rolecraft'
const result = await init('my-custom-tool')
```
