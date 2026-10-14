---
description: Install rolecraft globally with npm and go from zero to your first installed skill in one command.
---

# Install

## One-command onboarding

The fastest way to go from zero to productive:

```bash
npm install -g rolecraft
rolecraft setup ./team-skill
```

This detects every AI agent on your machine, installs the skill to all of them, and configures any MCP servers it declares for the [9 agents that support MCP](mcp.md). [→ Full onboarding guide](guides/onboarding.md)

## Quick install

```bash
npm install -g rolecraft
# or run without installing:
npx rolecraft install <source>

# also works with pnpm, yarn, bun:
pnpm add -g rolecraft
yarn global add rolecraft
bun add -g rolecraft
```

> **Requirements:** Node.js >= 22

## Install scope

When you run `rolecraft install <source>` without flags, it asks where to install:

```
Where do you want to install this skill?
  1) Global (~/.agents/skills/)
  2) Project (./.agents/skills/) [default]
  3) Both
```

**Project scope is the default** — installed skills are committed with your repo and shared with your team. Use `--global` for personal skills or flags to target specific agents.

### Scope flags

| Flag        | Target directory              |
| ----------- | ----------------------------- |
| `--project` | `./.agents/skills/` (default) |
| `--global`  | `~/.agents/skills/`           |
| `--all`     | every detected agent directory |

### Per-agent flags

Every known agent has its own flag — `--claude`, `--cursor`, `--copilot`, `--grok`, `--omp`, and so on. opencode's flag is `--agents`. The full flag-to-directory table, including support level and MCP support, is generated from the agent manifest in [Agent Discovery](agents.md).

```bash
# Which agents does rolecraft see on this machine?
rolecraft agents

# Preview where a skill would land, without writing anything.
rolecraft install ./my-skill --dry-run --all
```

Combine flags to install to multiple agents at once:

```bash
rolecraft install ./my-skill --claude --cursor --devin
```

### Selecting specific skills from multi-skill sources

When a source contains multiple skills, use `--skill` to pick specific ones:

```bash
# Comma-separated
rolecraft install ./my-multi-skill-repo --skill "skill-a,skill-b" --global

# Repeated flag
rolecraft install ./my-multi-skill-repo --skill skill-a --skill skill-b --global

# Interactive selection (no --skill flag)
rolecraft install ./my-multi-skill-repo --global
```

Matched by skill `name` or `slug` (case-insensitive). Use `--list` to see available skills.

### Install mode flags

| Flag                  | Description                                |
| --------------------- | ------------------------------------------ |
| `--symlink`           | Symlink instead of copy                    |
| `--copy`              | Force copy (default)                       |
| `--dry-run`           | Preview without copying files              |
| `--frozen-lockfile`   | Fail if skill is already installed         |
| `--yes` / `-y`        | Skip all confirmation prompts, use defaults |

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

The CLI clones with `--depth 1`, finds `SKILL.md` recursively, installs it, and cleans up.

### Git URL (GitLab, Bitbucket, SSH)

Any public git repository with `SKILL.md`:

```bash
rolecraft install https://gitlab.com/org/project
rolecraft install https://bitbucket.org/org/project
rolecraft install git@github.com:owner/repo.git
```

## See also

- [`rolecraft install`](commands/install.md) — the command reference with every flag.
- [`rolecraft doctor`](commands/doctor.md) — verify the install landed correctly.
- [`rolecraft rollback`](commands/rollback.md) — undo an install that went wrong.
- [Getting Started](guides/getting-started.md) — what happens after you install.
