<p align="center">
  <img src="assets/rolecraft_logo.png" alt="RoleCraft" width="200" height="200">
</p>

<h1 align="center">RoleCraft</h1>

<p align="center">
  <b>Install AI agent skills as roles & behaviors — from any source.</b><br>
  Zero-dependency CLI. No marketplace. No signup.
</p>

<p align="center">
  <a href="https://awesome.re"><img src="https://awesome.re/badge.svg" alt="Awesome"></a>
  <a href="https://www.npmjs.com/package/rolecraft"><img src="https://img.shields.io/npm/v/rolecraft" alt="npm"></a>
  <a href="https://www.npmjs.com/package/rolecraft"><img src="https://img.shields.io/npm/dm/rolecraft" alt="npm downloads"></a>
  <a href="https://github.com/sametcelikbicak/rolecraft/actions/workflows/test.yml"><img src="https://img.shields.io/github/actions/workflow/status/sametcelikbicak/rolecraft/test.yml?label=tests" alt="Tests"></a>
  <a href="https://github.com/sametcelikbicak/rolecraft/actions/workflows/codeql.yml"><img src="https://img.shields.io/github/actions/workflow/status/sametcelikbicak/rolecraft/codeql.yml?label=CodeQL" alt="CodeQL"></a>
  <a href="https://github.com/sametcelikbicak/rolecraft/blob/main/.github/dependabot.yml"><img src="https://img.shields.io/badge/dependabot-enabled-025e8c?logo=Dependabot" alt="Dependabot"></a>
  <a href="https://github.com/sametcelikbicak/rolecraft"><img src="https://img.shields.io/github/stars/sametcelikbicak/rolecraft?style=social" alt="Stars"></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/📜-Changelog-blue" alt="Changelog"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/🤝-Contributing-green" alt="Contributing"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"></a>
  <a href="package.json"><img src="https://img.shields.io/node/v/rolecraft" alt="Node"></a>
</p>

<p align="center">
  <a href="https://www.producthunt.com/products/rolecraft?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-rolecraft" target="_blank" rel="noopener noreferrer"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1184576&theme=light&t=1782890843931" alt="Product Hunt" width="200"></a>
</p>

<p align="center">
  Works with <b>30+ AI agents</b>: opencode · claude-code · cursor · windsurf · devin · codex · copilot · aider · cline · gemini-cli · cody · continue · warp · codeium · fabric · goose · tabnine · supermaven · pr-pilot · loom · roo · trae · hermes · kiro · augment · kilo · openhands · junie · factory · and more
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#why-rolecraft">Why RoleCraft?</a> ·
  <a href="#commands-overview">Commands</a> ·
  <a href="docs/install.md">Install Guide</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

<p align="center">
  <img src="assets/rolecraft-demo.gif" alt="RoleCraft demo" width="720">
</p>

## Quick start

```bash
# try without installing
npx rolecraft --help

# or install globally
npm install -g rolecraft

# create a skill
rolecraft init my-skill

# install it
rolecraft install ./my-skill           # local folder
rolecraft install user/repo            # GitHub repo
rolecraft install ./my-skill --cursor  # specific agent only

# manage
rolecraft list
rolecraft search code-review
rolecraft remove my-skill
```

**Requirements:** Node.js >= 20 · No other dependencies · [Full install guide →](docs/install.md)

---

## Features

- **Zero dependencies** — ~4 KB, no bloat
- **Any source** — local folder, GitHub repo, any URL
- **30+ agents** — opencode, claude-code, cursor, copilot, aider, devin, gemini-cli, and more
- **No registry required** — no signup, no marketplace, no vendor lock-in
- **Shell completions** — bash, zsh, fish auto-completion
- **TUI search** — interactive arrow-key skill browser with preview
- **Content hash verification** — detect tampered or outdated skills
- **CI-ready** — lockfile-based re-install for pipelines
- **Dry-run mode** — preview before installing

---

## Commands overview

| Command                      | Description                                         | Details                          |
| ---------------------------- | --------------------------------------------------- | -------------------------------- |
| `rolecraft init [<name>]`    | Scaffold a new `SKILL.md`                           | [docs](docs/commands/init.md)    |
| `rolecraft install <source>` | Install a skill (local path or GitHub `owner/repo`) | [docs](docs/commands/install.md) |
| `rolecraft bundle <sources>` | Install multiple skills from inline sources or file | [docs](docs/commands/bundle.md)  |
| `rolecraft bundle create`    | Create a new bundle file                            | [docs](docs/commands/bundle.md)  |
| `rolecraft search <query>`   | Search for skills on GitHub (TUI with `--interactive`) | [docs](docs/commands/search.md)  |
| `rolecraft use <source>`     | Preview a skill's files without installing          | [docs](docs/commands/use.md)     |
| `rolecraft completions bash\|zsh\|fish` | Generate shell completion scripts           | [docs](docs/commands/completions.md) |
| `rolecraft setup [<source>]` | Detect agents, optionally install a skill to all    | [docs](docs/commands/setup.md)   |
| `rolecraft list`             | Show all installed skills                           | [docs](docs/commands/list.md)    |
| `rolecraft verify`           | Check installed skill integrity via content hash    | [docs](docs/commands/verify.md)  |
| `rolecraft ci`               | Re-install all skills from lockfile (CI mode)       | [docs](docs/commands/ci.md)      |
| `rolecraft upgrade`          | Upgrade rolecraft to the latest version              | [docs](docs/commands/upgrade.md) |
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
| Interactive search + install (TUI)       | ✅          | ❌              | ❌                 |
| Shell completions (bash/zsh/fish)        | ✅          | ❌              | ❌                 |
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
