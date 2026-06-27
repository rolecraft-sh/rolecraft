# `rolecraft install`

Install a skill from a local path or GitHub repository.

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
rolecraft install sametcelikbicak/task-decomposer
rolecraft install sametcelikbicak/coverage-guard
```

The CLI clones with `--depth 1`, finds `SKILL.md` recursively, installs it, and cleans up.

## Scope flags

| Flag            | Target directory                   |
| --------------- | ---------------------------------- |
| `--project`     | `./.agents/skills/` (default)      |
| `--global`      | `~/.agents/skills/`                |
| `--all`         | all known agent directories        |
| `--claude`      | `~/.claude/skills/`                |
| `--cursor`      | `~/.cursor/skills/`                |
| `--devin`       | `~/.devin/skills/`                 |
| *(and 25+ more — see [docs/agents.md](../agents.md))* | |

## Mode flags

| Flag                  | Description                                |
| --------------------- | ------------------------------------------ |
| `--symlink`           | Symlink instead of copy                    |
| `--copy`              | Force copy (default)                       |
| `--dry-run`           | Preview without copying files              |
| `--frozen-lockfile`   | Fail if skill is already installed         |

## Examples

```bash
# Install from local folder (default: project scope)
rolecraft install ./my-skill

# Install from GitHub
rolecraft install sametcelikbicak/task-decomposer

# Install for specific agents
rolecraft install ./my-skill --claude --cursor

# Combine multiple agents
rolecraft install ./my-skill --claude --cursor --devin

# Global install
rolecraft install ./my-skill --global

# Symlink instead of copy
rolecraft install ./my-skill --symlink

# Preview only
rolecraft install ./my-skill --dry-run

# Fail if already installed
rolecraft install ./my-skill --frozen-lockfile
```
