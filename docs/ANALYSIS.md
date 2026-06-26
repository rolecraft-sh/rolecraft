# Competitive Analysis & Roadmap

## rolecraft vs Competitors

| Feature                      | rolecraft      | @agentskill.sh/cli | skills (Vercel)                               | OpenCode native | Claude Code                |
| ---------------------------- | -------------- | ------------------ | --------------------------------------------- | --------------- | -------------------------- |
| **Runtime deps**             | **0**          | 2                  | 1 (`yaml`)                                    | 0 (built-in)    | 0 (built-in)               |
| **Package size**             | ~4 KB          | 84 KB              | 465 KB                                        | N/A             | N/A                        |
| **Source files**             | 10             | 37                 | 14                                            | N/A             | N/A                        |
| **Source types**             | Local + GitHub | Registry only      | GitHub/GitLab/git URL/Local/npm               | Filesystem only | Filesystem + MCP + plugins |
| **Lockfile**                 | agentskill v3  | None               | Two-tier (global v3 + project v1, SHA hashes) | None            | Config files only          |
| **Offline capable**          | ✅             | ❌ (registry)      | ✅                                            | ✅              | ✅                         |
| **Signup required**          | ❌             | ✅ (agentskill.sh) | ❌                                            | ❌              | ❌                         |
| **Agent count**              | **29**          | 12                 | 68+                                           | 1 (+ compat)    | 1 (+ plugins)              |
| **Project scope default**    | ✅             | N/A                | ✅                                            | N/A             | N/A                        |
| **Interactive scope prompt** | ✅             | ❌                 | ❌                                            | N/A             | N/A                        |
| **Provenance (npm)**         | ✅             | ❌                 | ❌                                            | N/A             | N/A                        |
| **`use` command**            | ✅             | ❌                 | ✅                                            | ❌              | ❌                         |
| **`setup` command**          | ✅             | ✅                 | ❌                                            | ❌              | ❌                         |
| **`init` command**           | ✅             | ❌                 | ✅                                            | ❌              | ❌                         |
| **`search`/`find` command**  | ✅             | ✅ (`ags search`)  | ✅ (`skills find`)                            | ❌              | ❌                         |
| **Lockfile `ci`/`verify`**   | ❌             | ❌                 | ✅ (`skills ci`, `skills verify`)             | ❌              | ❌                         |
| **Symlink mode**             | ❌             | ❌                 | ✅                                            | ❌              | ❌                         |
| **Stars**                    | ~5             | 23                 | 23,588                                        | 178K+           | 133K+                      |

## Strengths

- **Zero dependencies** — only Node.js built-in modules
- **Provenance publishing** — SLSA Level 1+ via npm provenance
- **GitHub + Local sources** — fully decentralized
- **agentskill.sh lockfile compatible** — cross-compatible with ecosystem
- **Interactive scope prompt** — user-friendly first install
- **Project scope default** — modern default (v0.2.0)
- **29 agent targets** — opencode, claude-code, cursor, windsurf, devin, codex, copilot, aider, cline, gemini-cli, cody, continue, warp, codeium, fabric, goose, tabnine, supermaven, pr-pilot, loom, roo, trae, hermes, kiro, augment, kilo, openhands, junie, factory

## Weaknesses / Gaps

1. **Agent count (29)** — ahead of `ags` (12) but still far behind `skills` (68+), qntx/skill (39)
2. **No lockfile integrity** — no SHA hash verification, no `ci`/`verify` mode
3. **No symlink mode** — `skills` supports symlink (default) + copy; rolecraft only copies
4. **Lockfile SHA only `local`** — doesn't store content hashes

## Roadmap

### v0.3.x — Init, Search & Lockfile ✅

- [x] `rolecraft init [name]` — SKILL.md scaffolding (`skills init` equivalent)
- [x] `rolecraft search <query>` — skill discovery via GitHub API (`skills find` equivalent)
- [x] 20+ agent targets (agent count parity with `ags`) — **20 agents**
- [x] `--frozen-lockfile` flag for install

### v0.4.x — Integrity & Performance ✅

- [x] Content hash in lockfile (SHA256 `contentSha`)
- [x] `rolecraft verify` — hash doğrulama (`skills verify` equivalent)
- [x] `rolecraft ci` — frozen lockfile install (`skills ci` equivalent)
- [x] Symlink mode (`--symlink`/`--copy`)
- [x] 9 new agent targets (roo, trae, hermes, kiro, augment, kilo, openhands, junie, factory) — **29 total**

### v0.5.x — New Agents & UX

- [x] 9 new agents (roo, trae, hermes, kiro, augment, kilo, openhands, junie, factory)
- [ ] Roo Code, Trae, Hermes, Kiro, Augment, Kilo, OpenHands, Junie, Factory agent targets
- [ ] `--dry-run` mode — preview installation without copying

### Future

- [ ] TUI for skill browsing (`search` interactif)
- [ ] `rolecraft doctor` — system health check
- [ ] Skill bundle / skillset support

## Agent Directory Reference

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

## Competitor Analysis

### @agentskill.sh/cli (ags)

- **Model**: Centralized registry
- **Key feature**: 274K+ skills in marketplace, rating/feedback system, `/learn` in-agent command, `ags setup` auto-detection, `ags search`
- **Weaknesses**: Requires signup, no lockfile, no offline, no local sources, no provenance, only 12 agents
- **Deps**: 2
- **rolecraft advantage**: Zero deps, offline-first, lockfile, provenance, local sources, 29 agents

### skills (Vercel Labs)

- **Model**: Decentralized git-based
- **Key feature**: `skills use`, `skills ci`/`skills verify` (lockfile workflow), `skills find` (interactive search), `skills init` (scaffolding), 68+ agents, 23K stars, 13.4M weekly downloads, symlink mode
- **Weaknesses**: 1 dep (`yaml`), no provenance, no `setup` command
- **Deps**: 1
- **rolecraft advantage**: Zero deps, provenance, `setup` command
- **rolecraft gap**: Agent count (29 vs 68+), no TUI search, no doctor command

### OpenCode native

- **Model**: Passive filesystem discovery
- **Key feature**: Granular per-agent permissions, native `skill` tool, no CLI needed
- **Weakness**: No external source management, no lockfile
- **rolecraft advantage**: External source management, lockfile, cross-agent compatibility

### Claude Code

- **Model**: Skills + MCP servers + Plugin marketplace
- **Key feature**: OAuth 2.1, dual skill/MCP system, lazy tool loading
- **Weakness**: Complex, MCP-focused, not a standalone skill manager
- **rolecraft advantage**: Simple, focused, zero-dep, standalone

### qntx/skill (Rust)

- **Model**: Rust reimplementation of Vercel Skills CLI
- **Key feature**: 100% command parity, shell completions, `skills doctor`, `skills upgrade`, dry-run mode, parallel I/O, zero runtime deps (static binary), 39 agents
- **Weaknesses**: Rust toolchain for development, no provenance, no `setup` command
- **Deps**: 0 (static binary)
- **rolecraft advantage**: Zero deps as JS, provenance, `setup` command, interactive scope prompt
- **rolecraft gap**: No doctor, no upgrade, no dry-run

### Sklm

- **Model**: Centralized global store with per-project symlinks
- **Key feature**: Auto-sync, per-agent skill variants (`variants/` dir), 30+ agents
- **Weaknesses**: Early stage, low adoption
- **rolecraft advantage**: Mature CLI, lockfile, provenance

### skillpm

- **Model**: npm-native package manager for Agent Skills
- **Key feature**: `skillpm publish` to npm, semver, lockfiles, audit
- **Weaknesses**: Requires npm infrastructure, depends on `skills` CLI for wiring
- **rolecraft advantage**: All-in-one, no external deps

## Key Differentiators

1. **Zero dependencies** — only npm project in this space with 0 runtime deps
2. **npm provenance** — only project with SLSA Level 1+ attestations
3. **Interactive scope prompt** — best UX for first-time users
