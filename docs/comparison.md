# Feature Comparison

> How rolecraft stacks up against [skills (Vercel)](https://github.com/vercel-labs/skills) and [@agentskill.sh/cli (`ags`)](https://github.com/agentskill-sh/ags).

## At a glance

| | rolecraft | skills (Vercel) | @agentskill.sh/cli |
|---|---|---|---|
| **Runtime** | Zero-dep Node ESM | 1 dep (Node) | 2 deps (TypeScript) |
| **File size** | 413.7 kB | ~465 KB | ~84 KB |
| **Agent targets** | **87** | 72 | 15+ |
| **Skill marketplace** | rolecraft registry | skills.sh (90K+) | agentskill.sh (100K+) |
| **Publish your own** | ✅ | ❌ | ❌ |
| **MCP management** | ✅ | ❌ | ❌ |
| **Bundle / Compose / Diff** | ✅ | ❌ | ❌ |

## Feature table

| Feature | rolecraft | skills (Vercel) | @agentskill.sh/cli |
| ------- | --------- | --------------- | ------------------ |
| Zero dependencies | ✅ | ✅ (1 dep) | ❌ (2) |
| Local path install | ✅ **1st class** | ✅ | ❌ marketplace only |
| GitHub repo install | ✅ | ✅ | ❌ |
| GitLab / SSH git URL | ✅ | ✅ | ❌ |
| npm package source | ✅ | ✅ | ❌ |
| SKILL.md scaffolding (`init`) | ✅ | ✅ | ❌ |
| Skill preview (`use`) | ✅ | ✅ | ❌ |
| Agent auto-detect + install (`setup`) | ✅ | ❌ | ✅ |
| Skill discovery (search) | ✅ | ✅ | ✅ |
| Interactive TUI search + install | ✅ | ✅ | ❌ |
| Bundle install (`bundle`) | ✅ | ❌ | ✅ (skillset) |
| Bundle create (`bundle create`) | ✅ | ❌ | ❌ |
| Offline capable | ✅ | ✅ | ❌ |
| Project-level install | ✅ | ✅ | ✅ |
| Interactive scope prompt | ✅ | ✅ | ❌ |
| Non-interactive flag (`--yes`/`-y`) | ✅ | ✅ | ❌ |
| Dry-run preview (`--dry-run`) | ✅ | ❌ | ❌ |
| Lockfile integrity (`--frozen-lockfile`) | ✅ | ✅ | ❌ |
| Content hash verification (`verify`) | ✅ | ✅ | ❌ |
| CI-mode re-install (`ci`) | ✅ | ✅ | ❌ |
| Skill update check (`check`) | ✅ | ❌ | ❌ |
| Skill update / re-install (`update`) | ✅ | ✅ | ❌ |
| Symlink install (`--symlink`) | ✅ | ✅ (default) | ❌ |
| Self-upgrade (`upgrade`) | ✅ | ❌ | ❌ |
| npm provenance | ✅ | ❌ | ❌ |
| Shell completions (bash/zsh/fish) | ✅ | ❌ | ❌ |
| In-agent `/learn` command | ❌ | ❌ | ✅ |
| Skill rating / feedback | ❌ | ❌ | ✅ |
| Skill diff / compose | ✅ | ❌ | ❌ |
| System health check (`doctor`) | ✅ | ❌ | ❌ |
| Watch mode (auto-sync) | ✅ | ❌ | ❌ |
| AGENTS.md XML generation | ✅ | ❌ | ❌ |
| **MCP server management** | ✅ | ❌ | ❌ |
| Skill quality test | ✅ | ❌ | ❌ |
| Skill conflict detection (`doctor --deep`) | ✅ | ❌ | ❌ |
| **Node.js API** | ✅ | ❌ | ❌ |
| **Publish to registry** | ✅ | ❌ | ❌ |
| Security scanning (0–100) | ✅ | ✅ (Snyk) | ✅ |
| Telemetry / leaderboard | ❌ | ✅ | ❌ |

## When to use what

- **rolecraft** — You need MCP management, CI/CD pipelines, skill quality tooling (diff/compose/test), or want to publish skills to a registry. Best for power users and teams.
- **skills (Vercel)** — You just want the simplest one-liner to install skills. Largest marketplace (90K+ via skills.sh). Best for casual users who trust the Vercel ecosystem.
- **@agentskill.sh/cli** — You want in-agent discovery via `/learn` and skill rating/feedback. Largest marketplace (100K+ via agentskill.sh).

## Notable skill collections

These aren't CLI tools — they're curated SKILL.md repositories. rolecraft can install from any of them directly:

| Collection | Skills | Install with rolecraft |
|-----------|--------|----------------------|
| [skills.sh](https://skills.sh) | 90,000+ | `rolecraft install <owner/repo>` |
| [agentskill.sh](https://agentskill.sh) | 100,000+ | `rolecraft install <slug>` |
| [rolecraft Registry](https://github.com/rolecraft-sh/registry) | 66 | `rolecraft install <slug>` |
| [garden-skills](https://github.com/ConardLi/garden-skills) (ConardLi) | ~5 curated | `rolecraft install ConardLi/garden-skills` |
| [anthropic/skills](https://github.com/anthropic/skills) | 157K★ repo | `rolecraft install anthropic/skills` |

## Benchmark

rolecraft installs skills **up to 381× faster** than `npx skills` in cold-cache scenarios (local install: ~381×, GitHub install: ~6.9×).

[→ Full benchmark results](benchmark/RESULTS.md)
