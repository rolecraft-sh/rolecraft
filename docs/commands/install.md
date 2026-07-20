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
rolecraft install sametcelikbicak/task-decomposer
rolecraft install sametcelikbicak/coverage-guard
rolecraft install mattpocock/skills
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
| `--skill <names>`         | Install specific skills by name (comma-separated)      |

Without these flags and with more than one skill found, you will be prompted
interactively to select which skills to install.

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

# Install from a multi-skill repo (interactive selection)
rolecraft install mattpocock/skills

# List skills in a repo without installing
rolecraft install mattpocock/skills --list

# Install specific skills by name (comma-separated)
rolecraft install mattpocock/skills --skill "grill-me,tdd"

# Install from npm
rolecraft install npm:some-skill-package
rolecraft install npm:@org/skill-package@1.0.0

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

## Multi-skill repositories

When a source contains multiple `SKILL.md` files (e.g., `mattpocock/skills` has
15+ skills under `skills/engineering/` and `skills/productivity/`), the CLI:

1. Discovers all skills by scanning `skills/`, `.agents/skills/`, and other
   known container directories, plus a recursive fallback search (max depth 3).
2. If `--list` is passed, prints all available skills and exits.
3. If `--skill` is passed, installs only the matching skills.
4. If `--yes` is passed, installs all skills without prompting.
5. Otherwise, shows an interactive numbered list to select skills.

Each skill is installed to its own subdirectory (slug-based name) under the
target agent's skills directory.

### Interactive selection example

```text
$ rolecraft install mattpocock/skills

Resolving skills...
Found 15 skill(s)

  1. ask-matt
      slug: ask-matt
  2. domain-modeling
      slug: domain-modeling
  3. diagnosing-bugs
      slug: diagnosing-bugs
  4. grill-me
      slug: grill-me
  5. grill-with-docs
      slug: grill-with-docs
  6. grilling
      slug: grilling
  ...

Enter numbers (space-separated) to select, "all" for all, or press Enter to confirm selection: 4 5

   grill-me selected
   grill-with-docs selected
```

### `--list` output example

```text
$ rolecraft install mattpocock/skills --list

Found 15 skill(s)

  ask-matt
    Slug:       ask-matt
    Owner:      mattpocock
    Description: Ask which skill or flow fits your situation
    Files:      SKILL.md

  grill-me
    Slug:       grill-me
    Owner:      mattpocock
    Description: Get relentlessly interviewed about a plan or design
    Files:      SKILL.md

  ...
```

### `--skill` usage example

```bash
# Install only specific skills by name (comma-separated)
rolecraft install mattpocock/skills --skill "grill-me,tdd"

# Install a single skill
rolecraft install mattpocock/skills --skill diagnose-bugs

# Non-interactive: install all skills with --yes
rolecraft install mattpocock/skills --yes --global
```
