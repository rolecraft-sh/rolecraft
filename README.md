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

Works with **29 agents**: opencode, claude-code, cursor, windsurf, devin, codex, copilot, aider, cline, gemini-cli, cody, continue, warp, codeium, fabric, goose, tabnine, supermaven, pr-pilot, loom, roo, trae, hermes, kiro, augment, kilo, openhands, junie, factory, and all spec-compliant agents.

## Why rolecraft?

| Feature                                  | rolecraft        | `npx add-skill` | `@agentskill.sh/cli` |
| ---------------------------------------- | ---------------- | --------------- | -------------------- |
| Zero dependencies                        | ✅               | ✅              | ❌ (2)               |
| Local path install                       | ✅ **1st class** | ❌ GitHub only  | ❌ marketplace only  |
| GitHub repo install                      | ✅               | ✅              | ❌                   |
| Agent targets                            | 29               | 68+             | 12                   |
| SKILL.md scaffolding                     | ✅               | ✅              | ❌                   |
| Skill discovery (search)                 | ✅               | ✅              | ✅                   |
| Offline capable                          | ✅               | ❌              | ❌                   |
| agentskill.sh lockfile compatible        | ✅               | ✅              | ✅                   |
| Project-level install                    | ✅               | ✅              | ✅                   |
| Dry-run preview (`--dry-run`)            | ✅               | ❌              | ❌                   |
| Lockfile integrity (`--frozen-lockfile`) | ✅               | ❌              | ❌                   |
| Content hash verification (`verify`)     | ✅               | ❌              | ❌                   |
| CI-mode re-install (`ci`)                | ✅               | ❌              | ❌                   |
| Symlink install (`--symlink`)            | ✅               | ❌              | ❌                   |
| npm provenance                           | ✅               | ❌              | ❌                   |
| File size                                | ~4 KB            | ~500 KB+        | ~84 KB               |

## Install

```bash
npm install -g rolecraft
# or
npx rolecraft install <source>
```

## Usage

```bash
rolecraft init my-skill                            # scaffold a new SKILL.md
rolecraft install ./path/to/my-skill               # install from local folder
rolecraft install sametcelikbicak/task-decomposer  # install from GitHub
rolecraft install ./my-skill --claude --cursor     # install for specific agents
rolecraft search code-review                       # search skills on GitHub
rolecraft use sametcelikbicak/task-decomposer      # preview without installing
rolecraft setup                                    # detect installed agents
rolecraft setup ./my-skill                         # detect + install to all agents
rolecraft list                                     # list installed skills
rolecraft verify                                   # verify installed skill integrity
rolecraft ci                                       # re-install all skills from lockfile
rolecraft remove <slug>                            # remove a skill
rolecraft update <slug>                            # re-install to latest
rolecraft --version                                # show version
```

### Install scope

When you run `rolecraft install <source>` without flags, it asks where to install:

```
Where do you want to install this skill?
  1) Global (~/.agents/skills/)
  2) Project (./.agents/skills/) [default]
  3) Both
```

**Project scope is the default** — installed skills are committed with your repo and shared with your team. Use `--global` for personal skills or flags to target specific agents.

Select specific agents with flags:

```bash
rolecraft install ./my-skill --project      # ./.agents/skills/ (default)
rolecraft install ./my-skill --global       # ~/.agents/skills/
rolecraft install ./my-skill --claude       # also ~/.claude/skills/
rolecraft install ./my-skill --cursor       # also ~/.cursor/skills/
rolecraft install ./my-skill --windsurf     # also ~/.windsurf/skills/ (deprecated: use --devin)
rolecraft install ./my-skill --devin        # also ~/.devin/skills/
rolecraft install ./my-skill --codex        # also ~/.codex/skills/
rolecraft install ./my-skill --copilot      # also ~/.copilot/skills/
rolecraft install ./my-skill --aider        # also ~/.aider/skills/
rolecraft install ./my-skill --cline        # also ~/.cline/skills/
rolecraft install ./my-skill --gemini       # also ~/.gemini/skills/
rolecraft install ./my-skill --cody         # also ~/.cody/skills/
rolecraft install ./my-skill --continue     # also ~/.continue/skills/
rolecraft install ./my-skill --warp         # also ~/.warp/skills/
rolecraft install ./my-skill --codeium      # also ~/.codeium/skills/
rolecraft install ./my-skill --fabric       # also ~/.fabric/skills/
rolecraft install ./my-skill --goose        # also ~/.goose/skills/
rolecraft install ./my-skill --tabnine      # also ~/.tabnine/skills/
rolecraft install ./my-skill --supermaven   # also ~/.supermaven/skills/
rolecraft install ./my-skill --pr-pilot     # also ~/.pr-pilot/skills/
rolecraft install ./my-skill --loom         # also ~/.loom/skills/
rolecraft install ./my-skill --roo          # also ~/.roo/skills/
rolecraft install ./my-skill --trae         # also ~/.trae/skills/
rolecraft install ./my-skill --hermes       # also ~/.hermes/skills/
rolecraft install ./my-skill --kiro         # also ~/.kiro/skills/
rolecraft install ./my-skill --augment      # also ~/.augment/skills/
rolecraft install ./my-skill --kilo         # also ~/.kilo/skills/
rolecraft install ./my-skill --openhands    # also ~/.openhands/skills/
rolecraft install ./my-skill --junie        # also ~/.junie/skills/
rolecraft install ./my-skill --factory      # also ~/.factory/skills/
rolecraft install ./my-skill --all          # all locations
rolecraft install ./my-skill --frozen-lockfile  # fail if skill is already installed
rolecraft install ./my-skill --symlink          # symlink instead of copy
rolecraft install ./my-skill --copy             # force copy (default)
rolecraft install ./my-skill --dry-run          # preview without copying files
```

Combine flags to install to multiple agents:

```bash
rolecraft install ./my-skill --claude --cursor --devin
```

### Scaffold a new skill

```bash
rolecraft init                    # create ./SKILL.md (default: my-skill)
rolecraft init my-custom-tool     # create ./my-custom-tool/SKILL.md
rolecraft init namespace/skill    # create ./namespace-skill/SKILL.md
```

The `init` command generates a ready-to-edit `SKILL.md` with proper slug, name, and owner metadata. Edit it with your skill instructions, then install with `rolecraft install <dir>`.

### Search for skills on GitHub

```bash
rolecraft search code-review                  # search by keyword
rolecraft search "code review typescript"     # multi-word search
rolecraft search prompt                       # search for prompt skills
```

The `search` command queries the GitHub API for repositories containing `SKILL.md` files matching your query. Results include stars, language, and the exact install command.

### Preview a skill without installing

```bash
rolecraft use ./my-skill
rolecraft use sametcelikbicak/task-decomposer
```

The `use` command resolves the source, shows metadata, and prints all file contents to stdout — without writing anything to disk. Useful for inspecting a skill before installing, or piping content into other tools.

### Preview installation without changes

```bash
rolecraft install ./my-skill --global --dry-run
rolecraft install sametcelikbicak/task-decomposer --claude --cursor --dry-run
```

The `--dry-run` flag resolves the source, shows what would be installed and where, but **does not copy any files**. Use it to verify the installation plan before executing.

### Detect agents and install to all

```bash
rolecraft setup                    # detect which agents are available
rolecraft setup ./my-skill         # detect + install to all detected agents
rolecraft setup sametcelikbicak/task-decomposer
```

Run `rolecraft setup` to see which AI agents are installed on your system. Pass a source to automatically install a skill to all detected agents at once.

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
2. Copies (or symlinks with `--symlink`) all files alongside `SKILL.md` to the target directory
3. Computes a SHA256 content hash and stores it in the lockfile
4. Updates `~/.agents/.skill-lock.json` so agents can discover the skill
5. `rolecraft verify` checks installed files against the stored hash
6. `rolecraft ci` re-installs all skills from the lockfile (e.g. in CI pipelines)
7. Compatible with skills installed by `@agentskill.sh/cli`, `add-skill`, or manual installs

## How agents discover skills

| Agent       | Directory                                      |
| ----------- | ---------------------------------------------- |
| opencode    | `~/.agents/skills/` or `./.agents/skills/`     |
| claude-code | `~/.claude/skills/` or `./.claude/skills/`     |
| cursor      | `~/.cursor/skills/` or `./.cursor/skills/`     |
| windsurf ⚠️ | `~/.windsurf/skills/` or `./.windsurf/skills/` |
| devin       | `~/.devin/skills/` or `./.devin/skills/`       |
| codex       | `~/.codex/skills/` or `./.codex/skills/`       |
| copilot     | `~/.copilot/skills/` or `./.copilot/skills/`   |
| aider       | `~/.aider/skills/` or `./.aider/skills/`       |
| cline       | `~/.cline/skills/` or `./.cline/skills/`       |
| gemini-cli  | `~/.gemini/skills/`                            |
| cody        | `~/.cody/skills/`                              |
| continue    | `~/.continue/skills/`                          |
| warp        | `~/.warp/skills/`                              |
| codeium     | `~/.codeium/skills/`                           |
| fabric      | `~/.fabric/skills/`                            |
| goose       | `~/.goose/skills/`                             |
| tabnine     | `~/.tabnine/skills/`                           |
| supermaven  | `~/.supermaven/skills/`                        |
| pr-pilot    | `~/.pr-pilot/skills/`                          |
| loom        | `~/.loom/skills/`                              |
| roo         | `~/.roo/skills/`                               |
| trae        | `~/.trae/skills/`                              |
| hermes      | `~/.hermes/skills/`                            |
| kiro        | `~/.kiro/skills/`                              |
| augment     | `~/.augment/skills/`                           |
| kilo        | `~/.kilo/skills/`                              |
| openhands   | `~/.openhands/skills/`                         |
| junie       | `~/.junie/skills/`                             |
| factory     | `~/.factory/skills/`                           |

> ⚠️ Windsurf was rebranded to **Devin Desktop** in June 2026. The `--windsurf` flag and `~/.windsurf/skills/` path still work for backward compatibility, but new deployments should use `--devin` / `~/.devin/skills/`.

Install to multiple agents at once:

```bash
rolecraft install ./my-skill --cursor --devin --copilot --gemini --cody
```

## Commands

| Command                      | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| `rolecraft init [<name>]`    | Scaffold a new `SKILL.md`                           |
| `rolecraft install <source>` | Install a skill (local path or GitHub `owner/repo`) |
| `rolecraft search <query>`   | Search for skills on GitHub                         |
| `rolecraft use <source>`     | Preview a skill's files without installing          |
| `rolecraft setup [<source>]` | Detect agents, optionally install a skill to all    |
| `rolecraft list`             | Show all installed skills                           |
| `rolecraft verify`           | Check installed skill integrity via content hash    |
| `rolecraft ci`               | Re-install all skills from lockfile (CI mode)       |
| `rolecraft remove <slug>`    | Uninstall a skill                                   |
| `rolecraft update <slug>`    | Re-install a skill to latest                        |
| `rolecraft help`             | Show this help                                      |
| `rolecraft version`          | Show version (`--version`, `-v`)                    |

## Project structure

```
rolecraft/
├── bin/rolecraft.js          # CLI entry point
├── src/
│   ├── commands/
│   │   ├── ci.js             # frozen lockfile install
│   │   ├── init.js           # SKILL.md scaffolding
│   │   ├── install.js        # install logic + interactive scope
│   │   ├── list.js           # list installed skills
│   │   ├── remove.js         # remove skill + lockfile cleanup
│   │   ├── search.js         # GitHub skill discovery
│   │   ├── setup.js          # detect agents + install to all
│   │   ├── update.js         # re-install skill to latest
│   │   ├── use.js            # preview skill without installing
│   │   └── verify.js         # integrity verification
│   └── utils/
│       ├── resolver.js       # source resolver (local / GitHub)
│       ├── installer.js      # copy/symlink files to target dirs
│       └── lockfile.js       # read/write .skill-lock.json + content hash
├── package.json
├── CHANGELOG.md              # Release history
├── CONTRIBUTING.md           # Contribution guide
└── README.md
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
