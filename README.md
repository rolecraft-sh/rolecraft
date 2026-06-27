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

Works with **30+ install targets**: opencode, claude-code, cursor, windsurf, devin, codex, copilot, aider, cline, gemini-cli, cody, continue, warp, codeium, fabric, goose, tabnine, supermaven, pr-pilot, loom, roo, trae, hermes, kiro, augment, kilo, openhands, junie, factory, and all spec-compliant agents.

---

## Table of Contents

- [Quick start](#quick-start)
- [Commands overview](#commands-overview)
- [Why rolecraft?](#why-rolecraft)
- [How agents discover skills](#how-agents-discover-skills)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

---

## Quick start

```bash
npm install -g rolecraft

# scaffold a new skill
rolecraft init my-skill

# install from local folder or GitHub
rolecraft install ./my-skill
rolecraft install sametcelikbicak/task-decomposer

# install for specific agents
rolecraft install ./my-skill --claude --cursor

# search for skills
rolecraft search code-review --interactive

# list, verify, and manage
rolecraft list
rolecraft verify
rolecraft remove <slug>
rolecraft update <slug>
```

> **Requirements:** Node.js >= 20

[→ Full install details](docs/install.md) — scope flags, source types, `--symlink`, `--dry-run`, `--frozen-lockfile`

---

## Commands overview

| Command                      | Description                                         | Details                          |
| ---------------------------- | --------------------------------------------------- | -------------------------------- |
| `rolecraft init [<name>]`    | Scaffold a new `SKILL.md`                           | [docs](docs/commands/init.md)    |
| `rolecraft install <source>` | Install a skill (local path or GitHub `owner/repo`) | [docs](docs/commands/install.md) |
| `rolecraft bundle <sources>` | Install multiple skills from inline sources or file | [docs](docs/commands/bundle.md)  |
| `rolecraft bundle create`    | Create a new bundle file                            | [docs](docs/commands/bundle.md)  |
| `rolecraft search <query>`   | Search for skills on GitHub                         | [docs](docs/commands/search.md)  |
| `rolecraft use <source>`     | Preview a skill's files without installing          | [docs](docs/commands/use.md)     |
| `rolecraft setup [<source>]` | Detect agents, optionally install a skill to all    | [docs](docs/commands/setup.md)   |
| `rolecraft list`             | Show all installed skills                           | [docs](docs/commands/list.md)    |
| `rolecraft verify`           | Check installed skill integrity via content hash    | [docs](docs/commands/verify.md)  |
| `rolecraft ci`               | Re-install all skills from lockfile (CI mode)       | [docs](docs/commands/ci.md)      |
| `rolecraft remove <slug>`    | Uninstall a skill                                   | [docs](docs/commands/remove.md)  |
| `rolecraft update <slug>`    | Re-install a skill to latest                        | [docs](docs/commands/update.md)  |
| `rolecraft --version`        | Show version                                        |                                  |

---

## Why rolecraft?

[→ Full feature comparison](docs/comparison.md)

| Feature                                  | rolecraft   | skills (Vercel) | @agentskill.sh/cli |
| ---------------------------------------- | ----------- | --------------- | ------------------ |
| Zero dependencies                        | ✅          | ✅ (1 dep)      | ❌ (2)             |
| Local path install                       | ✅ 1st class | ✅              | ❌ marketplace only |
| GitHub repo install                      | ✅          | ✅              | ❌                 |
| Bundle install + create                  | ✅          | ❌              | ✅ (skillset only) |
| Interactive search + install             | ✅          | ❌              | ❌                 |
| Dry-run preview (`--dry-run`)            | ✅          | ❌              | ❌                 |
| Interactive scope prompt                 | ✅          | ❌              | ❌                 |
| Content hash verification (`verify`)     | ✅          | ✅              | ❌                 |
| CI-mode re-install (`ci`)                | ✅          | ✅              | ❌                 |
| File size                                | ~4 KB       | ~465 KB         | ~84 KB             |

[See full table →](docs/comparison.md)

---

## How agents discover skills

rolecraft knows where each AI agent looks for skills. Use flags like `--claude`, `--cursor`, `--devin` to target specific agents, or `--all` for every supported agent.

[→ Full agent path table](docs/agents.md)

```bash
# Install to multiple agents at once
rolecraft install ./my-skill --cursor --devin --copilot --gemini --cody
```

---

## Architecture

1. Reads `SKILL.md` from the source and parses metadata (slug, name, owner)
2. Copies (or symlinks with `--symlink`) all files alongside `SKILL.md` to the target directory
3. Computes a SHA256 content hash and stores it in the lockfile
4. Updates `~/.agents/.skill-lock.json` so agents can discover the skill
5. Compatible with skills installed by `@agentskill.sh/cli`, `add-skill`, or manual installs

[→ Full architecture & project structure](docs/architecture.md)

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
