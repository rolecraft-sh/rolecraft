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
| **Agent count**              | **9**          | 20+                | 68+                                           | 3               | ~10                        |
| **Project scope default**    | ✅             | N/A                | ✅                                            | N/A             | N/A                        |
| **Interactive scope prompt** | ✅             | ❌                 | ❌                                            | N/A             | N/A                        |
| **Provenance (npm)**         | ✅             | ❌                 | ❌                                            | N/A             | N/A                        |
| **`use` command**            | ✅             | ❌                 | ✅                                            | ❌              | ❌                         |
| **`setup` command**          | ✅             | ✅                 | ❌                                            | ❌              | ❌                         |
| **`init` command**           | ❌             | ❌                 | ✅                                            | ❌              | ❌                         |
| **`search`/`find` command**  | ❌             | ✅ (`ags search`)  | ✅ (`skills find`)                            | ❌              | ❌                         |
| **Lockfile `ci`/`verify`**   | ❌             | ❌                 | ✅ (`skills ci`, `skills verify`)             | ❌              | ❌                         |
| **Symlink mode**             | ❌             | ❌                 | ✅                                            | ❌              | ❌                         |
| **Stars**                    | ~5             | 23                 | 23,476                                        | 14K+            | N/A                        |

## Strengths

- **Zero dependencies** — only Node.js built-in modules
- **Provenance publishing** — SLSA Level 1+ via npm provenance
- **GitHub + Local sources** — fully decentralized
- **agentskill.sh lockfile compatible** — cross-compatible with ecosystem
- **Interactive scope prompt** — user-friendly first install
- **Project scope default** — modern default (v0.2.0)
- **9 agent targets** — opencode, claude-code, cursor, windsurf, codex, copilot, aider, cline

## Weaknesses / Gaps

1. **Agent count (9)** — still far behind `skills` (68+) and `ags` (20+)
2. **No `search` / `find` command** — no built-in skill discovery
3. **No `init` command** — no SKILL.md scaffolding
4. **No lockfile integrity** — no SHA hash verification, no `ci`/`verify` mode, no `--frozen-lockfile`
5. **No symlink mode** — `skills` supports symlink (default) + copy; rolecraft only copies
6. **Lockfile SHA only `local`** — doesn't store content hashes

## Roadmap

### v0.3.x — Init, Search & Lockfile

- [ ] `rolecraft init [name]` — SKILL.md scaffolding (`skills init` equivalent)
- [ ] `rolecraft search <query>` — skill discovery via GitHub API (`skills find` equivalent)
- [ ] 20+ agent targets (agent count parity with `ags`)
- [ ] `--frozen-lockfile` flag for install

### v0.4.x — Integrity & Performance

- [ ] Content hash in lockfile (replace `"local"` placeholder with real SHA)
- [ ] `rolecraft verify` — hash doğrulama (`skills verify` equivalent)
- [ ] `rolecraft ci` — frozen lockfile install (`skills ci` equivalent)
- [ ] Symlink mode (`--symlink`/`--copy`)

### Future

- [ ] Lockfile version upgrade (v3→v4 with hashes)
- [ ] Plugin system (install bundles of skills)
- [ ] TUI for skill browsing
- [ ] Docker-based sandboxed installs

## Agent Directory Reference

| Agent       | Directory                                      |
| ----------- | ---------------------------------------------- |
| opencode    | `~/.agents/skills/` or `./.agents/skills/`     |
| claude-code | `~/.claude/skills/` or `./.claude/skills/`     |
| cursor      | `~/.cursor/skills/` or `./.cursor/skills/`     |
| windsurf    | `~/.windsurf/skills/` or `./.windsurf/skills/` |
| codex       | `~/.codex/skills/` or `./.codex/skills/`       |
| copilot     | `~/.copilot/skills/` or `./.copilot/skills/`   |
| aider       | `~/.aider/skills/` or `./.aider/skills/`       |
| cline       | `~/.cline/skills/` or `./.cline/skills/`       |

## Competitor Analysis

### @agentskill.sh/cli (ags)

- **Model**: Centralized registry
- **Key feature**: 274K+ skills in marketplace, rating/feedback system, `/learn` in-agent command, `ags setup` auto-detection, `ags search`
- **Weaknesses**: Requires signup, no lockfile, no offline, no local sources, no provenance
- **Deps**: 2
- **rolecraft advantage**: Zero deps, offline-first, lockfile, provenance, local sources

### skills (Vercel Labs)

- **Model**: Decentralized git-based
- **Key feature**: `skills use`, `skills ci`/`skills verify` (lockfile workflow), `skills find` (interactive search), `skills init` (scaffolding), 68+ agents, 23K stars, 13.1M weekly downloads, symlink mode
- **Weaknesses**: 1 dep (`yaml`), no provenance, no `setup` command
- **Deps**: 1
- **rolecraft advantage**: Zero deps, provenance, `setup` command
- **rolecraft gap**: No `init`, no `search`, no `ci`/`verify`, low agent count

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

## Key Differentiators

1. **Zero dependencies** — only npm project in this space with 0 runtime deps
2. **npm provenance** — only project with SLSA Level 1+ attestations
3. **Interactive scope prompt** — best UX for first-time users
