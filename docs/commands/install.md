# `rolecraft install`

Install a skill from a local path, GitHub repository, or npm package.

Supports **single-skill** and **multi-skill** repositories. If a source contains
multiple `SKILL.md` files (e.g. under `skills/`), you will be prompted to
select which ones to install.

## Usage

```bash
rolecraft install <source> [flags]
```

## Source types

### Local path

Any directory containing `SKILL.md`:

```bash
rolecraft install ./my-skill
rolecraft install ~/projects/my-skill
rolecraft install /absolute/path/to/skill
```

### GitHub repo

Shorthand `owner/repo`:

```bash
rolecraft install sametcelikbicak/coverage-guard
```

The CLI clones with `--depth 1`, discovers all `SKILL.md` files (including
those under `skills/`, `.agents/skills/`, etc.), and lets you choose.

### npm package

Install any npm package that contains a `SKILL.md`:

```bash
rolecraft install npm:lodash
rolecraft install npm:@scope/package
rolecraft install npm:package@1.0.0
rolecraft install npm:@scope/package@latest
```

The CLI fetches package metadata from the npm registry, downloads and extracts
the tarball, finds `SKILL.md` recursively, installs it, and cleans up.

## Selection flags

| Flag                      | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `--list`                  | List available skills from the source without installing |
| `--skill <names>`         | Install specific skills by name (comma-separated or repeated flag) |

The `--skill` flag accepts skill names in two formats:

```bash
# Comma-separated
rolecraft install source --skill "skill-a,skill-b"

# Repeated flag
rolecraft install source --skill skill-a --skill skill-b
```

Skill names are matched against the skill `name` or `slug` (case-insensitive).

Without these flags and with more than one skill found, you will be prompted
interactively to select which skills to install.

## Scope flags

| Flag            | Target directory                   |
| --------------- | ---------------------------------- |
| `--project`     | `./.agents/skills/` (default)      |
| `--global`      | `~/.agents/skills/`                |
| `--all`         | all known agent directories        |
| `--agents`      | `~/.agents/skills/` (opencode)     |
| `--claude`      | `~/.claude/skills/`                |
| `--cursor`      | `~/.cursor/skills/`                |
| `--windsurf`    | `~/.codeium/windsurf/skills/`      |
| `--devin`       | `./.devin/skills/`                 |
| `--codex`       | `~/.agents/skills/`                |
| `--copilot`     | `./.github/skills/`                |
| *(79 more agent flags — see [docs/agents.md](../agents.md))* | |

## Mode flags

| Flag                  | Description                                |
| --------------------- | ------------------------------------------ |
| `--symlink`           | Symlink instead of copy                    |
| `--copy`              | Force copy (default)                       |
| `--dry-run`           | Preview without copying files              |
| `--frozen-lockfile`   | Fail if skill is already installed         |
| `--yes`, `-y`         | Non-interactive: accept all defaults and skip prompts |
| `--no-mcp`            | Skip MCP server installation from skill    |

## Examples

```bash
# Install from local folder (default: project scope)
rolecraft install ./my-skill

# Install from GitHub
rolecraft install sametcelikbicak/coverage-guard

# Install from npm
rolecraft install npm:some-skill-package
rolecraft install npm:@org/skill-package@1.0.0

# Install for specific agents
rolecraft install ./my-skill --claude --cursor

# Global install
rolecraft install ./my-skill --global

# Symlink instead of copy
rolecraft install ./my-skill --symlink

# Preview only
rolecraft install ./my-skill --dry-run

# Fail if already installed
rolecraft install ./my-skill --frozen-lockfile
```

## Multi-skill repositories

When a source contains multiple `SKILL.md` files, the CLI:

1. Discovers all skills by scanning `skills/`, `.agents/skills/`, and other
   known container directories, plus a recursive fallback search (max depth 3).
2. If `--list` is passed, prints all available skills and exits.
3. If `--skill` is passed, installs only the matching skills.
4. If `--yes` is passed, installs all skills without prompting.
5. Otherwise, shows an interactive numbered list to select skills.

Each skill is installed to its own subdirectory (slug-based name) under the
target agent's skills directory.

## Node.js API

This command is also available as a programmatic function. See the [Node.js API documentation](../api.md) for detailed usage.

```js
import { install } from 'rolecraft'
const result = await install('./my-skill', { global: true })
```
