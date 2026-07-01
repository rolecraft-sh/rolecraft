# Competitive Analysis & Roadmap

## rolecraft vs Competitors

| Feature                      | rolecraft      | skills (Vercel)                           | @agentskill.sh/cli (ags) | openskills        | skills-npm (antfu)  | qntx/skill (Rust) | OpenCode native | Claude Code |
| ---------------------------- | -------------- | ----------------------------------------- | ------------------------ | ----------------- | ------------------- | ----------------- | --------------- | ----------- |
| **Runtime deps**             | **0**          | 1 (`yaml`)                                | 2                        | 4                 | 4                   | **0** (static)    | 0 (built-in)    | 0 (built-in) |
| **Package size**             | ~4 KB          | 465 KB                                    | 84 KB                    | 51 KB             | 36 KB               | ~8 MB binary      | N/A             | N/A         |
| **Source files**             | 15             | 14                                        | 37                       | —                 | —                   | —                 | N/A             | N/A         |
| **Source types**             | Local + GitHub | GitHub/GitLab/git URL/Local/npm           | Registry only            | GitHub + Local    | npm packages only   | GitHub/Git/Local  | Filesystem only | Filesystem + MCP + plugins |
| **Lockfile**                 | agentskill v3  | Two-tier (global v3 + project v1, SHA)    | None                     | None              | None                | ✅                | None            | Config only   |
| **Offline capable**          | ✅             | ✅                                        | ❌ (registry)             | ✅                | ✅                  | ✅                | ✅              | ✅           |
| **Signup required**          | ❌             | ❌                                        | ✅ (agentskill.sh)        | ❌                | ❌                  | ❌                | ❌              | ❌           |
| **Agent count**              | **43**         | 72                                        | 15+                      | 10+               | 10+                 | 39                | 1 (+ compat)    | 1 (+ plugins) |
| **Project scope default**    | ✅             | ✅                                        | N/A                      | ❌ (global)        | ✅ (project)        | ✅                | N/A             | N/A         |
| **Interactive scope prompt** | ✅             | ❌                                        | ❌                       | ❌                | ❌                  | ❌                | N/A             | N/A         |
| **Provenance (npm)**         | ✅             | ❌                                        | ❌                       | ❌                | ❌                  | ❌                | N/A             | N/A         |
| **`use` command**            | ✅             | ✅                                        | ❌                       | ✅ (`read`)        | ❌                  | ✅                | ❌              | ❌          |
| **`setup` command**          | ✅             | ❌                                        | ✅                       | ❌                | ❌                  | ❌                | ❌              | ❌          |
| **`init` command**           | ✅             | ✅                                        | ❌                       | ❌                | ❌                  | ❌                | ❌              | ❌          |
| **`search`/`find` command**  | ✅             | ✅ (`skills find`, `vercel skills`)       | ✅ (`ags search`)        | ❌                | ❌                  | ✅                | ❌              | ❌          |
| **`verify` command**         | ✅             | ✅ (`skills verify`)                      | ❌                       | ❌                | ❌                  | ❌                | ❌              | ❌          |
| **`ci` command**             | ✅             | ✅ (`skills ci`)                          | ❌                       | ❌                | ❌                  | ❌                | ❌              | ❌          |
| **`--frozen-lockfile`**      | ✅             | ✅                                        | ❌                       | ❌                | ❌                  | ❌                | ❌              | ❌          |
| **Symlink mode**             | ✅             | ✅ (default)                              | ❌                       | ❌                | ✅ (only)           | ✅                | ❌              | ❌          |
| **`--dry-run`**              | ✅             | ❌                                        | ❌                       | ❌                | ❌                  | ✅                | ❌              | ❌          |
| **Bundle install**           | ✅             | ❌                                        | ✅ (skillset)             | ❌                | ❌                  | ❌                | ❌              | ❌          |
| **Shell completions**        | ✅             | ❌                                        | ❌                       | ❌                | ❌                  | ✅                | ❌              | ❌          |
| **`doctor` command**             | ❌             | ❌                                        | ❌                       | ❌                | ❌                  | ✅                | ❌              | ❌          |
| **`upgrade` (self-update)**  | ❌             | ❌                                        | ❌                       | ❌                | ❌                  | ✅                | ❌              | ❌          |
| **TUI search**               | ⚠️ (styled)   | ✅ (`skills find` interactive)            | ❌                       | ❌                | ❌                  | ❌                | ❌              | ❌          |
| **Stars**                    | ~5             | 23,588                                    | 23                       | 10,500            | 472                 | ~1                | 178K+           | 133K+       |

## Strengths

- **Zero dependencies** — only Node.js built-in modules
- **Provenance publishing** — SLSA Level 1+ via npm provenance
- **GitHub + Local sources** — fully decentralized
- **agentskill.sh lockfile compatible** — cross-compatible with ecosystem
- **Interactive scope prompt** — user-friendly first install
- **Project scope default** — modern default
- **43 install targets** — 42 named agents + project-local
- **SHA256 content hash verification** — `rolecraft verify`
- **CI mode** — `rolecraft ci` for pipeline installs
- **Symlink + Copy modes** — `--symlink`/`--copy`
- **Dry-run preview** — `--dry-run` on install, setup, bundle
- **Bundle system** — install from JSON/text files or inline sources

## Weaknesses / Gaps

### Feature gaps vs competitors

1. **Agent count (43)** — ahead of `ags` (15+), `openskills` (10+), `skills-npm` (10+), `qntx/skill` (39) but behind `skills` (72)
2. **No `doctor` command** — `qntx/skill` has `skills doctor` for health checks
3. **No GitLab/Bitbucket/SSH git URL support** — only GitHub `owner/repo` and local paths
4. **npm package source unsupported** — `skills` supports `npx skills add some-package`, `skills-npm` is built around it
5. **No AGENTS.md XML injection** — `openskills` generates Claude Code compatible `<available_skills>` XML
6. **Stars / community adoption very low (~5)** — building trust and visibility

### ✅ Resolved Gaps

- **Copilot agent path** — now uses `.github/copilot/skills/` (project scope)
- **Self-upgrade** — `rolecraft upgrade` command added
- **Agent count (30 → 43)** — 13 new agent targets added

## Roadmap

### v0.3.x — Init, Search & Lockfile ✅

- [x] `rolecraft init [name]` — SKILL.md scaffolding (`skills init` equivalent)
- [x] `rolecraft search <query>` — skill discovery via GitHub API (`skills find` equivalent)
- [x] 20+ agent targets (agent count parity with `ags`) — **20 agents**
- [x] `--frozen-lockfile` flag for install

### v0.4.x — Integrity & Performance ✅

- [x] Content hash in lockfile (SHA256 `contentSha`)
- [x] `rolecraft verify` — hash verification (`skills verify` equivalent)
- [x] `rolecraft ci` — frozen lockfile install (`skills ci` equivalent)
- [x] Symlink mode (`--symlink`/`--copy`)
- [x] 9 new agent targets (roo, trae, hermes, kiro, augment, kilo, openhands, junie, factory) — **29 total**
- [x] `--dry-run` mode — preview installation without copying
- [x] Interactive search (`search --interactive`)
- [x] Bundle command (`bundle`, `bundle create`)

### v0.5.x — Agent Coverage & Source Expansion

- [x] Copilot agent path fix (`.github/copilot/skills/` instead of `~/.copilot/skills/`)
- [x] 13 new agent targets (command-code, cortex, mistral-vibe, qwen-code, openclaw, codebuddy, mux, pi, autohand-code, rovo, firebender, bob, aider-desk) — **43 total**
- [ ] GitLab URL support (`https://gitlab.com/org/repo`)
- [ ] SSH git URL support (`git@github.com:owner/repo.git`)
- [ ] Full git URL support (any remote with SKILL.md)
- [ ] `rolecraft doctor` — system health check

### v0.6.x — UX & Shell Integration

- [x] Shell completions (bash, zsh, fish)
- [x] Color-highlighted interactive search (`search --interactive` with styled cards)
- [ ] `rolecraft upgrade` — self-update command
- [ ] npm package source support (`npx rolecraft install some-package`)
- [ ] AGENTS.md XML injection for non-Claude agents
- [ ] Skill bundle / skillset hub
- [ ] Security scoring for installed skills
- [ ] Watch mode — auto-sync skills on file change

## Competitor Analysis

### skills (Vercel Labs)

- **Model**: Decentralized git-based
- **Stars**: 23.5K | **Deps**: 1 | **Agents**: 55+
- **Key features**: `skills use`, `skills ci`/`skills verify` (lockfile workflow), `skills find` (interactive TUI), `skills init`, symlink mode, `vercel skills` built-in, 13.4M weekly downloads, skills.sh directory
- **Weaknesses**: 1 dep (`yaml`), no provenance, no `setup` command, no dry-run, no bundle
- **rolecraft advantage**: Zero deps, provenance, `setup` command, dry-run, bundle
- **rolecraft gap**: Agent count (30 vs 55+), no doctor, no GitLab support

### @agentskill.sh/cli (ags)

- **Model**: Centralized registry
- **Stars**: 23 | **Deps**: 2 | **Agents**: 15+
- **Key features**: 274K+ skills in marketplace, security scoring (0-100), `/learn` in-agent command, feedback loop (1-5 rating), `ags setup` auto-detection
- **Weaknesses**: Requires signup, no lockfile, no offline, no local sources, no provenance
- **rolecraft advantage**: Zero deps, offline-first, lockfile, provenance, local sources, 30 agents

### openskills (numman-ali)

- **Model**: Universal skill loader with AGENTS.md XML injection
- **Stars**: 10.5K | **Deps**: 4 | **Agents**: 10+
- **Key features**: Claude Code exact compatibility, `<available_skills>` XML generation, `npx openskills read <name>`, `npx openskills sync`
- **Weaknesses**: 4 deps, no lockfile, no provenance, no verify/ci, global default scope
- **rolecraft advantage**: Zero deps, lockfile, provenance, verify/ci, project scope default

### skills-npm (antfu)

- **Model**: npm-native skill distribution convention
- **Stars**: 472 | **Deps**: 4 | **Agents**: 10+
- **Key features**: Ships skills inside npm packages, auto-symlink via `prepare` script, `npx skills-npm setup` wiring
- **Weaknesses**: Very new (v0.0.2), only npm package sources, no lockfile, no verify
- **rolecraft advantage**: Zero deps, lockfile, verify, GitHub + Local sources, bundle

### qntx/skill (Rust)

- **Model**: Rust reimplementation of Vercel Skills CLI
- **Stars**: ~1 | **Deps**: 0 (static binary) | **Agents**: 39
- **Key features**: 100% command parity, shell completions, `skills doctor`, `skills upgrade`, dry-run mode, parallel I/O
- **Weaknesses**: Very new, Rust toolchain for dev, no provenance, no `setup`
- **rolecraft advantage**: Zero deps as JS, provenance, `setup` command, interactive scope prompt
- **rolecraft advantage**: Shell completions, TUI search
- **rolecraft gap**: No doctor, no upgrade

### OpenCode native

- **Model**: Passive filesystem discovery
- **Key features**: Granular per-agent permissions, native `skill` tool, no CLI needed
- **Weakness**: No external source management, no lockfile
- **rolecraft advantage**: External source management, lockfile, cross-agent compatibility

### Claude Code

- **Model**: Skills + MCP servers + Plugin marketplace
- **Key features**: OAuth 2.1, dual skill/MCP system, lazy tool loading
- **Weakness**: Complex, MCP-focused, not a standalone skill manager
- **rolecraft advantage**: Simple, focused, zero-dep, standalone

### Sklm

- **Model**: Centralized global store with per-project symlinks
- **Key features**: Auto-sync, per-agent skill variants (`variants/` dir), 30+ agents
- **Weaknesses**: Early stage, low adoption
- **rolecraft advantage**: Mature CLI, lockfile, provenance

### skillpm

- **Model**: npm-native package manager for Agent Skills
- **Key features**: `skillpm publish` to npm, semver, lockfiles, audit
- **Weaknesses**: Requires npm infrastructure, depends on `skills` CLI for wiring
- **rolecraft advantage**: All-in-one, no external deps

## Key Differentiators

1. **Zero dependencies** — only npm project in this space with 0 runtime deps
2. **npm provenance** — only project with SLSA Level 1+ attestations
3. **Interactive scope prompt** — best UX for first-time users
4. **Bundle system** — unique multi-skill install from files/inline
5. **Dry-run + Verify + CI** — complete integrity workflow unmatched by most competitors
