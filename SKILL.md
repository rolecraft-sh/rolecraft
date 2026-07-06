---
name: rolecraft
description: >-
  Install AI agent skills as roles & behaviors from any source — local folder,
  GitHub, GitLab, SSH git URL. Zero-dependency CLI with 66+ agent targets.
---

# rolecraft

Install and manage AI agent skills across 66+ agents with a single command. Zero dependencies. No registry required.

## When to use

- **Install skills** — from local folders, GitHub repos, GitLab projects, or SSH git URLs
- **Manage skills** — list, update, remove, and verify installed skills
- **CI/CD pipelines** — lockfile-based re-install with `rolecraft ci`
- **Troubleshooting** — `rolecraft doctor` to diagnose agent detection, lockfile, and Node.js issues
- **Team onboarding** — bundle install with a single command
- **Cross-agent setup** — install the same skill to multiple agents at once

## Quick start

```bash
# Try without installing
npx rolecraft --help

# Create a skill
npx rolecraft init my-skill

# Install from any source
npx rolecraft install ./my-skill
npx rolecraft install user/repo
npx rolecraft install https://gitlab.com/org/project
npx rolecraft install git@github.com:user/repo.git

# Install to specific agents
npx rolecraft install user/repo --cursor --devin

# Check for updates
npx rolecraft check

# Run system health check
npx rolecraft doctor

# List installed skills
npx rolecraft list
```

## Install commands

| Command | Purpose |
|---------|---------|
| `rolecraft install <source>` | Install a skill (local, GitHub, GitLab, SSH) |
| `rolecraft init [name]` | Scaffold a new `SKILL.md` |
| `rolecraft list` | Show installed skills |
| `rolecraft check` | Check for available updates |
| `rolecraft remove <slug>` | Uninstall a skill |
| `rolecraft update <slug>` | Re-install to latest version |
| `rolecraft bundle <sources>` | Install multiple skills from file or inline |
| `rolecraft ci` | Re-install from lockfile (CI mode) |
| `rolecraft verify` | Check skill integrity via content hash |
| `rolecraft search <query>` | Search skills on GitHub |
| `rolecraft doctor` | Run system health check |
| `rolecraft use <source>` | Preview without installing |
| `rolecraft completions bash\|zsh\|fish` | Generate shell completions |

## Common flags

| Flag | Purpose |
|------|---------|
| `--cursor`, `--devin`, `--claude`, `--codex` | Target specific agents |
| `--all` | Install to every supported agent |
| `--yes` / `-y` | Non-interactive mode (CI/CD) |
| `--dry-run` | Preview without making changes |
| `--symlink` | Symlink instead of copy |
| `--global` / `--project` | Scope selection |

## Supported agents (66+)

`opencode`, `claude-code`, `cursor`, `windsurf`, `devin`, `codex`, `copilot`, `aider`, `cline`, `gemini-cli`, `cody`, `continue`, `warp`, `codeium`, `fabric`, `goose`, `tabnine`, `supermaven`, `pr-pilot`, `loom`, `roo`, `trae`, `hermes`, `kiro`, `augment`, `kilo`, `openhands`, `junie`, `factory`, `command-code`, `cortex`, `mistral-vibe`, `qwen-code`, `openclaw`, `codebuddy`, `mux`, `pi`, `autohand-code`, `rovo`, `firebender`, `bob`, `aider-desk`, and 25+ more.

## Examples

### Install from GitHub
```
rolecraft install vercel-labs/agent-skills --skill frontend-design
```

### Install to multiple agents
```
rolecraft install ./my-team-rules --cursor --devin --copilot --all
```

### CI pipeline install
```
rolecraft ci --yes
```

### Create and install your own skill
```
rolecraft init my-skill
rolecraft install ./my-skill --all
```

## Links

- GitHub: https://github.com/sametcelikbicak/rolecraft
- npm: https://www.npmjs.com/package/rolecraft
- Docs: https://github.com/sametcelikbicak/rolecraft#readme
