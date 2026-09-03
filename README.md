<p align="center">
  <img src="https://raw.githubusercontent.com/rolecraft-sh/rolecraft/main/assets/rolecraft_logo.png" alt="RoleCraft" width="200" height="200">
</p>

<h1 align="center">RoleCraft</h1>

<p align="center">
  <b>The Security-First Skill Manager for AI Agents</b><br>
   Every install runs a security scan · Skills & MCP Servers across 87 Agents (27 Verified)<br>
  Zero-dependency CLI · No signup · Offline-first
</p>

<p align="center">
  <a href="https://awesome.re"><img src="https://awesome.re/badge.svg" alt="Awesome"></a>
  <a href="https://www.npmjs.com/package/rolecraft"><img src="https://img.shields.io/npm/v/rolecraft?logo=npm&label=&color=cb3837" alt="npm"></a>
  <a href="https://www.npmjs.com/package/rolecraft"><img src="https://img.shields.io/npm/dm/rolecraft?logo=npm&label=&color=cb3837" alt="npm downloads"></a>
   <a href="https://github.com/rolecraft-sh/rolecraft/actions/workflows/test.yml"><img src="https://img.shields.io/github/actions/workflow/status/rolecraft-sh/rolecraft/test.yml?logo=githubactions&label=tests" alt="Tests"></a>
   <a href="https://github.com/rolecraft-sh/rolecraft/actions/workflows/codeql.yml"><img src="https://img.shields.io/github/actions/workflow/status/rolecraft-sh/rolecraft/codeql.yml?logo=github&label=CodeQL" alt="CodeQL"></a>
   <a href="https://github.com/rolecraft-sh/rolecraft/blob/main/.github/dependabot.yml"><img src="https://img.shields.io/badge/dependabot-enabled-025e8c?logo=Dependabot" alt="Dependabot"></a>
   <a href="https://github.com/marketplace/actions/rolecraft-action"><img src="https://img.shields.io/badge/GitHub%20Action-rolecraft--action-blue?logo=github" alt="GitHub Action"></a>
   <a href="https://github.com/rolecraft-sh/rolecraft"><img src="https://img.shields.io/github/stars/rolecraft-sh/rolecraft?style=social" alt="Stars"></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/📜-Changelog-blue" alt="Changelog"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/🤝-Contributing-green" alt="Contributing"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?logo=opensourceinitiative&logoColor=white" alt="MIT"></a>
   <a href="https://rolecraft-sh.github.io/rolecraft/"><img src="https://img.shields.io/badge/📖-Docs%20site-blue" alt="Docs"></a>
  <a href="package.json"><img src="https://img.shields.io/node/v/rolecraft?logo=nodedotjs&label=&logoColor=white&color=339933" alt="Node"></a>
   <a href="docs/api.md"><img src="https://img.shields.io/badge/API-blue?logo=nodedotjs&label=&logoColor=white" alt="Node.js API"></a>
   <a href="docs/security.md"><img src="https://img.shields.io/badge/🔒-security%20scoring-brightgreen" alt="Security scoring"></a>
  <a href="CODE_OF_CONDUCT.md"><img src="https://img.shields.io/badge/📖-Code%20of%20Conduct-orange" alt="Code of Conduct"></a>
  <a href="SUPPORT.md"><img src="https://img.shields.io/badge/💬-Support-blue" alt="Support"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a> ·
  <a href="#commands">Commands</a> ·
  <a href="#nodejs-api">API</a> ·
  <a href="https://rolecraft-sh.github.io/rolecraft/security">Security</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/rolecraft-sh/rolecraft/main/assets/rolecraft-demo.gif" alt="RoleCraft demo" width="720"></p>









<p align="center">
  <b>⚡ Zero dependencies</b> · <b>📦 397.4 kB</b> · <b>🤖 27 verified agents</b> · <b>🔌 Skills + MCP</b> · <b>🔒 Security scoring</b> · <b>📝 Skill testing</b> · <b>🔧 Init templates</b> · <b>🌐 Offline-first</b>
</p>

---

## Quick Start

```bash
# Try without installing
npx rolecraft --help

# Install globally (npm, pnpm, yarn, bun)
npm install -g rolecraft

# Install a skill (local, GitHub, GitLab, SSH, npm)
rolecraft install ./my-skill --cursor

# Install a skill WITH its MCP servers
rolecraft install ./postgres-rules --cursor

# Detect all agents and install a skill to every one
rolecraft setup user/repo
```

**Requirements:** Node.js >= 20

> **Why zero dependencies?** Every dependency is a supply-chain risk. rolecraft uses only Node.js built-ins (`fs`, `path`, `crypto`, `https`) — no `node_modules` surprises.

[Full install guide →](docs/install.md) · [Getting Started →](docs/guides/getting-started.md)

---

## Features

- **Zero dependencies** — 397.4 kB, only Node.js built-ins
- **Any source** — local folder, GitHub/GitLab/SSH URL, npm package
- **87 agents** — opencode, claude-code, cursor, copilot, aider, oh-my-pi, and more
- **No registry required** — works fully without a marketplace; community-driven [registry](https://github.com/rolecraft-sh/registry) optional
- **Security scoring** — static analysis on every install: prompt injection, command injection, obfuscated code, credential harvesting. Scores 0–100
- **CI-ready** — lockfile-based re-install (`rolecraft ci`), `--yes` flag, `--dry-run`
- **MCP + Skills** — install skills and their MCP servers in a single command
- **Shell completions** — bash, zsh, fish auto-completion
- **Profile system** — save, apply, and share multi-agent configurations

[Full feature list →](docs/guides/use-cases.md) · [Comparison vs skills (Vercel) →](docs/comparison.md)

---

## Security

Every install is automatically scanned with static analysis that detects prompt injection, command injection, obfuscated code, and credential harvesting. Scores 0–100:

- **90+** → SAFE, install proceeds
- **70–89** → REVIEW, prompts for confirmation
- **<70** → DANGER, blocked unless `--yes`

```bash
rolecraft install ./my-skill              # auto-scanned
rolecraft install ./my-skill --yes        # force install even if DANGER
```

[→ Full security documentation](docs/security.md)

---

## Commands

| Command | Description |
|---------|-------------|
| `rolecraft install <source>` | Install a skill (local, GitHub, npm, SSH) |
| `rolecraft list` | Show all installed skills |
| `rolecraft setup [<source>]` | Detect agents, optionally install to all |
| `rolecraft search <query>` | Search GitHub for skills (TUI with `--interactive`) |
| `rolecraft remove <slug>` | Uninstall a skill |
| `rolecraft mcp install <source>` | Install an MCP server |
| `rolecraft doctor` | Run system health check |
| `rolecraft test <skill-path>` | Test a skill quality with built-in assertions |

[→ Full CLI Reference](docs/reference.md) · [All commands →](docs/commands/agents.md)

---

## Node.js API

rolecraft exposes a programmatic API for your own scripts and tools:

```js
import { install, list, search, doctor } from 'rolecraft'

const result = await install('./my-skill', { global: true })
const skills = await list()
const results = await search('code-review')
const health = await doctor()
```

All API functions return plain objects (no side-effects).

[→ Full API Reference](docs/api.md)

---

## Development

```bash
git clone https://github.com/rolecraft-sh/rolecraft.git && cd rolecraft
npm install                # sets up the pre-commit hook automatically
npm link                   # rolecraft CLI runs from local checkout
npm run lint               # syntax + Biome checks
npm test                   # 1004+ tests, 0 fails expected
```

A `pre-commit` hook runs lint automatically on every commit. Zero-runtime-dependency policy is preserved — Biome and VitePress are devDependencies only.

[→ Contributing guide](CONTRIBUTING.md)

---

## Support

- **[Docs site](https://rolecraft-sh.github.io/rolecraft/)** — full command reference and guides
- **[GitHub Issues](https://github.com/rolecraft-sh/rolecraft/issues)** — bug reports, feature requests
- **[SUPPORT.md](SUPPORT.md)** — how to get help
- **[SECURITY.md](SECURITY.md)** — responsible disclosure

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

<a href="https://github.com/rolecraft-sh/rolecraft/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=rolecraft-sh/rolecraft" alt="Contributors" />
</a>

---

⭐ **If rolecraft makes your AI agent workflow easier, consider [starring the repo](https://github.com/rolecraft-sh/rolecraft).**  
It helps others discover the project and shows that the community finds it useful.

---

## License

MIT
