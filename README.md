<div align="center">
 <img src="assets/rolecraft_logo.png" alt="Logo" width="256" height="256">

# RoleCraft — Simple Skill Installer for AI

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
[![npm](https://img.shields.io/npm/v/rolecraft)](https://www.npmjs.com/package/rolecraft)
[![Tests](https://img.shields.io/github/actions/workflow/status/sametcelikbicak/rolecraft/test.yml?label=tests)](https://github.com/sametcelikbicak/rolecraft/actions/workflows/test.yml)
[![GitHub Stars](https://img.shields.io/github/stars/sametcelikbicak/rolecraft?style=social)](https://github.com/sametcelikbicak/rolecraft)
[![Changelog](https://img.shields.io/badge/📜-Changelog-blue)](CHANGELOG.md)
[![Contributing](https://img.shields.io/badge/🤝-Contributing-green)](CONTRIBUTING.md)

 </div>

**Zero-dependency** CLI to install AI agent skills as roles & behaviors from any source. No marketplace, no registry, no signup — just point it at a local folder or a GitHub repo and it works.

Works with **opencode**, **claude-code**, **cursor**, **windsurf**, **codex**, **copilot**, **aider**, **cline**, and all spec-compliant agents.

## Why rolecraft?

| Feature                           | rolecraft        | `npx add-skill` | `@agentskill.sh/cli` |
| --------------------------------- | ---------------- | --------------- | -------------------- |
| Zero dependencies                 | ✅               | ✅              | ❌ (2)               |
| Local path install                | ✅ **1st class** | ❌ GitHub only  | ❌ marketplace only  |
| GitHub repo install               | ✅               | ✅              | ❌                   |
| Agent targets                     | 9                | 68+             | 20+                  |
| Offline capable                   | ✅               | ❌              | ❌                   |
| agentskill.sh lockfile compatible | ✅               | ✅              | ✅                   |
| Project-level install             | ✅               | ✅              | ✅                   |
| npm provenance                    | ✅               | ❌              | ❌                   |
| File size                         | ~3 KB            | ~500 KB+        | ~84 KB               |

## Install

```bash
npm install -g rolecraft
# or
npx rolecraft install <source>
```

## Usage

```bash
rolecraft install ./path/to/my-skill              # install from local folder
rolecraft install sametcelikbicak/task-decomposer  # install from GitHub
rolecraft install ./my-skill --claude --cursor     # install for specific agents
rolecraft use sametcelikbicak/task-decomposer      # preview without installing
rolecraft list                                     # list installed skills
rolecraft remove <slug>                            # remove a skill
rolecraft update <slug>                            # re-install to latest
rolecraft --version                                # show version
```

### Install scope

When you run `rolecraft install <source>` without flags, it asks where to install:

```
Where do you want to install this skill?
  1) Global (~/.agents/skills/) [default]
  2) Project (./.agents/skills/)
  3) Both
```

Select specific agents with flags:

```bash
rolecraft install ./my-skill --global    # ~/.agents/skills/
rolecraft install ./my-skill --project   # ./.agents/skills/
rolecraft install ./my-skill --claude    # also ~/.claude/skills/
rolecraft install ./my-skill --cursor    # also ~/.cursor/skills/
rolecraft install ./my-skill --windsurf  # also ~/.windsurf/skills/
rolecraft install ./my-skill --codex     # also ~/.codex/skills/
rolecraft install ./my-skill --copilot   # also ~/.copilot/skills/
rolecraft install ./my-skill --aider     # also ~/.aider/skills/
rolecraft install ./my-skill --cline     # also ~/.cline/skills/
rolecraft install ./my-skill --all       # all locations
```

Combine flags to install to multiple agents:

```bash
rolecraft install ./my-skill --claude --cursor --windsurf
```

### Preview a skill without installing

```bash
rolecraft use ./my-skill
rolecraft use sametcelikbicak/task-decomposer
```

The `use` command resolves the source, shows metadata, and prints all file contents to stdout — without writing anything to disk. Useful for inspecting a skill before installing, or piping content into other tools.

### Source types

**Local path** — any directory containing `SKILL.md`:

```bash
rolecraft install ./my-skill
rolecraft install ~/projects/my-skill
rolecraft install /absolute/path/to/skill
```

**GitHub repo** — shorthand `owner/repo`:

```bash
rolecraft install sametcelikbicak/task-decomposer
rolecraft install sametcelikbicak/coverage-guard
```

The CLI clones with `--depth 1`, finds `SKILL.md` recursively, installs it, and cleans up.

## What it does

1. Reads `SKILL.md` from the source and parses metadata (slug, name, owner)
2. Copies all files alongside `SKILL.md` (references, configs, assets) to the target directory
3. Updates `~/.agents/.skill-lock.json` so agents can discover the skill
4. Compatible with skills installed by `@agentskill.sh/cli`, `add-skill`, or manual installs

## How agents discover skills

| Agent       | Directory                                   |
| ----------- | ------------------------------------------- |
| opencode    | `~/.agents/skills/` or `./.agents/skills/`  |
| claude-code | `~/.claude/skills/` or `./.claude/skills/`  |
| cursor      | `~/.cursor/skills/` or `./.cursor/skills/`  |
| windsurf    | `~/.windsurf/skills/` or `./.windsurf/skills/` |
| codex       | `~/.codex/skills/` or `./.codex/skills/`    |
| copilot     | `~/.copilot/skills/` or `./.copilot/skills/` |
| aider       | `~/.aider/skills/` or `./.aider/skills/`    |
| cline       | `~/.cline/skills/` or `./.cline/skills/`    |

Install to multiple agents at once:

```bash
rolecraft install ./my-skill --cursor --windsurf --copilot
```

## Commands

| Command                      | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| `rolecraft install <source>` | Install a skill (local path or GitHub `owner/repo`)      |
| `rolecraft use <source>`     | Preview a skill's files without installing               |
| `rolecraft list`             | Show all installed skills                                |
| `rolecraft remove <slug>`    | Uninstall a skill                                        |
| `rolecraft update <slug>`    | Re-install a skill to latest                             |
| `rolecraft help`             | Show this help                                           |
| `rolecraft version`          | Show version (`--version`, `-v`)                         |

## Project structure

```
rolecraft/
├── bin/rolecraft.js          # CLI entry point
├── src/
│   ├── commands/
│   │   ├── install.js        # install logic + interactive scope
│   │   ├── list.js           # list installed skills
│   │   ├── remove.js         # remove skill + lockfile cleanup
│   │   ├── update.js         # re-install skill to latest
│   │   └── use.js            # preview skill without installing
│   └── utils/
│       ├── resolver.js       # source resolver (local / GitHub)
│       ├── installer.js      # copy files to target dirs
│       └── lockfile.js       # read/write .skill-lock.json
├── package.json
├── CHANGELOG.md              # Release history
├── CONTRIBUTING.md           # Contribution guide
└── README.md
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
